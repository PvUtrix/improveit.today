import { Router } from 'express';
import { db } from '../db';
import {
  successResponse,
  errorResponse,
  parsePaginationParams,
  getPaginationMeta,
} from '@improveit/common';
import { logger } from '../utils/logger';

const router = Router();

const JURISDICTION_TYPES = [
  'country',
  'state',
  'province',
  'city',
  'district',
  'neighborhood',
];

// Create a jurisdiction
router.post('/', async (req, res) => {
  try {
    const { name, type, boundary, parentId, metadata } = req.body;

    if (!name || !type) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Missing name or type')
      );
    }

    if (!JURISDICTION_TYPES.includes(type)) {
      return res.status(400).json(
        errorResponse(
          'VALIDATION_ERROR',
          `Invalid type. Must be one of: ${JURISDICTION_TYPES.join(', ')}`
        )
      );
    }

    if (parentId) {
      const parent = await db.query(
        'SELECT id FROM jurisdictions WHERE id = $1',
        [parentId]
      );
      if (parent.rows.length === 0) {
        return res.status(404).json(
          errorResponse('NOT_FOUND', 'Parent jurisdiction not found')
        );
      }
    }

    // boundary is a GeoJSON Polygon geometry
    const result = await db.query(
      `INSERT INTO jurisdictions (name, type, boundary, parent_id, metadata)
       VALUES ($1, $2,
               CASE WHEN $3::text IS NULL THEN NULL
                    ELSE ST_GeomFromGeoJSON($3::text)::geography END,
               $4, $5)
       RETURNING id, name, type, parent_id, metadata, created_at, updated_at`,
      [
        name,
        type,
        boundary ? JSON.stringify(boundary) : null,
        parentId || null,
        metadata || {},
      ]
    );

    logger.info(`Jurisdiction created: ${name} (${result.rows[0].id})`);

    return res.status(201).json(successResponse(result.rows[0]));
  } catch (error: any) {
    if (error.message && error.message.includes('GeoJSON')) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Invalid GeoJSON boundary')
      );
    }
    logger.error('Create jurisdiction error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to create jurisdiction')
    );
  }
});

// List jurisdictions
router.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginationParams(req.query);
    const { type, parentId, search } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

    if (type) {
      params.push(type);
      conditions.push(`type = $${params.length}`);
    }
    if (parentId) {
      params.push(parentId);
      conditions.push(`parent_id = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`name ILIKE $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query(
      `SELECT COUNT(*) FROM jurisdictions ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await db.query(
      `SELECT id, name, type, parent_id, metadata, created_at, updated_at
       FROM jurisdictions ${where}
       ORDER BY name ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json(successResponse(result.rows, getPaginationMeta(total, page, limit)));
  } catch (error: any) {
    logger.error('List jurisdictions error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to list jurisdictions')
    );
  }
});

// Find jurisdictions containing a point (must be before /:id)
router.get('/lookup', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Missing or invalid lat/lng')
      );
    }

    const result = await db.query(
      `SELECT id, name, type, parent_id
       FROM jurisdictions
       WHERE boundary IS NOT NULL
         AND ST_Covers(boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)
       ORDER BY
         CASE type
           WHEN 'neighborhood' THEN 1
           WHEN 'district' THEN 2
           WHEN 'city' THEN 3
           WHEN 'province' THEN 4
           WHEN 'state' THEN 5
           WHEN 'country' THEN 6
         END`,
      [lng, lat]
    );

    return res.json(successResponse(result.rows));
  } catch (error: any) {
    logger.error('Jurisdiction lookup error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to lookup jurisdictions')
    );
  }
});

// Get jurisdiction by id (boundary returned as GeoJSON)
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, type, parent_id, metadata, created_at, updated_at,
              ST_AsGeoJSON(boundary)::json as boundary
       FROM jurisdictions WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Jurisdiction not found')
      );
    }

    return res.json(successResponse(result.rows[0]));
  } catch (error: any) {
    logger.error('Get jurisdiction error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to get jurisdiction')
    );
  }
});

// Update jurisdiction
router.patch('/:id', async (req, res) => {
  try {
    const { name, boundary, parentId, metadata } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      params.push(name);
      updates.push(`name = $${params.length}`);
    }
    if (boundary !== undefined) {
      params.push(boundary ? JSON.stringify(boundary) : null);
      updates.push(
        `boundary = CASE WHEN $${params.length}::text IS NULL THEN NULL
                    ELSE ST_GeomFromGeoJSON($${params.length}::text)::geography END`
      );
    }
    if (parentId !== undefined) {
      params.push(parentId);
      updates.push(`parent_id = $${params.length}`);
    }
    if (metadata !== undefined) {
      params.push(metadata);
      updates.push(`metadata = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'No valid fields to update')
      );
    }

    params.push(req.params.id);
    const result = await db.query(
      `UPDATE jurisdictions SET ${updates.join(', ')}
       WHERE id = $${params.length}
       RETURNING id, name, type, parent_id, metadata, created_at, updated_at`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Jurisdiction not found')
      );
    }

    logger.info(`Jurisdiction updated: ${req.params.id}`);

    return res.json(successResponse(result.rows[0]));
  } catch (error: any) {
    if (error.message && error.message.includes('GeoJSON')) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Invalid GeoJSON boundary')
      );
    }
    logger.error('Update jurisdiction error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to update jurisdiction')
    );
  }
});

export default router;
