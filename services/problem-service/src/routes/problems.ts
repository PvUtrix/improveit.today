import { Router } from 'express';
import { db } from '../db';
import { successResponse, errorResponse, parsePaginationParams, getPaginationMeta } from '@improveit/common';
import { logger } from '../utils/logger';

const router = Router();

// Create problem
router.post('/', async (req, res) => {
  try {
    const { userId, title, description, latitude, longitude, address, category, mediaUrls } = req.body;

    if (!userId || !title || !description || !latitude || !longitude || !category) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Missing required fields')
      );
    }

    // Create problem with PostGIS point
    const result = await db.query(
      `INSERT INTO problems (user_id, title, description, location, address, category)
       VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $6, $7)
       RETURNING id, user_id, title, description,
                 ST_X(location::geometry) as longitude,
                 ST_Y(location::geometry) as latitude,
                 address, category, status, created_at`,
      [userId, title, description, longitude, latitude, address, category]
    );

    const problem = result.rows[0];

    // Add media if provided
    if (mediaUrls && mediaUrls.length > 0) {
      for (const url of mediaUrls) {
        await db.query(
          `INSERT INTO problem_media (problem_id, media_url, media_type)
           VALUES ($1, $2, 'image')`,
          [problem.id, url]
        );
      }
    }

    // Add to history
    await db.query(
      `INSERT INTO problem_history (problem_id, status, changed_by)
       VALUES ($1, 'reported', $2)`,
      [problem.id, userId]
    );

    logger.info(`Problem created: ${problem.id}`);

    res.status(201).json(successResponse(problem));
  } catch (error: any) {
    logger.error('Create problem error:', error);
    res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to create problem')
    );
  }
});

// Get problem by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT p.id, p.user_id, p.title, p.description,
              ST_X(p.location::geometry) as longitude,
              ST_Y(p.location::geometry) as latitude,
              p.address, p.category, p.status, p.priority,
              p.created_at, p.updated_at,
              u.username as reporter_username,
              COALESCE(v.upvotes, 0) as upvotes,
              COALESCE(v.downvotes, 0) as downvotes,
              COALESCE(v.score, 0) as score
       FROM problems p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN vote_aggregates v ON p.id = v.problem_id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Problem not found')
      );
    }

    const problem = result.rows[0];

    // Get media
    const mediaResult = await db.query(
      'SELECT id, media_url, media_type FROM problem_media WHERE problem_id = $1',
      [id]
    );

    problem.media = mediaResult.rows;

    res.json(successResponse(problem));
  } catch (error: any) {
    logger.error('Get problem error:', error);
    res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to fetch problem')
    );
  }
});

// List problems with filters
router.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginationParams(req.query);
    const { category, status, latitude, longitude, radius } = req.query;

    let query = `
      SELECT p.id, p.title, p.description,
             ST_X(p.location::geometry) as longitude,
             ST_Y(p.location::geometry) as latitude,
             p.address, p.category, p.status, p.priority,
             p.created_at,
             COALESCE(v.upvotes, 0) as upvotes,
             COALESCE(v.score, 0) as score
      FROM problems p
      LEFT JOIN vote_aggregates v ON p.id = v.problem_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (category) {
      query += ` AND p.category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (status) {
      query += ` AND p.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    // Geographic filter
    if (latitude && longitude && radius) {
      query += ` AND ST_DWithin(
        p.location,
        ST_SetSRID(ST_MakePoint($${paramCount}, $${paramCount + 1}), 4326)::geography,
        $${paramCount + 2}
      )`;
      params.push(parseFloat(longitude as string));
      params.push(parseFloat(latitude as string));
      params.push(parseFloat(radius as string));
      paramCount += 3;
    }

    query += ` ORDER BY p.created_at DESC`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM problems WHERE 1=1';
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (category) {
      countQuery += ` AND category = $${countParamIndex}`;
      countParams.push(category);
      countParamIndex++;
    }

    if (status) {
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json(
      successResponse(result.rows, getPaginationMeta(total, page, limit))
    );
  } catch (error: any) {
    logger.error('List problems error:', error);
    res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to fetch problems')
    );
  }
});

// Update problem
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status } = req.body;

    const result = await db.query(
      `UPDATE problems
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, title, description, status, updated_at`,
      [title, description, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Problem not found')
      );
    }

    // Add to history if status changed
    if (status) {
      await db.query(
        `INSERT INTO problem_history (problem_id, status)
         VALUES ($1, $2)`,
        [id, status]
      );
    }

    res.json(successResponse(result.rows[0]));
  } catch (error: any) {
    logger.error('Update problem error:', error);
    res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to update problem')
    );
  }
});

// Delete problem
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM problems WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Problem not found')
      );
    }

    res.json(successResponse({ id: result.rows[0].id }));
  } catch (error: any) {
    logger.error('Delete problem error:', error);
    res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to delete problem')
    );
  }
});

export default router;
