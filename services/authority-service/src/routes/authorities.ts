import { Router } from 'express';
import { db } from '../db';
import {
  successResponse,
  errorResponse,
  isValidEmail,
  parsePaginationParams,
  getPaginationMeta,
} from '@improveit/common';
import { logger } from '../utils/logger';
import { publishEvent } from '../utils/kafka';

const router = Router();

const AUTHORITY_FIELDS = `id, jurisdiction_id, user_id, name, type, contact_email,
       contact_phone, website_url, notification_threshold, notification_email,
       notification_phone, webhook_url, is_verified, is_active, created_at, updated_at`;

// Register an authority
router.post('/', async (req, res) => {
  try {
    const {
      jurisdictionId,
      userId,
      name,
      type,
      contactEmail,
      contactPhone,
      websiteUrl,
      notificationThreshold = 100,
      notificationEmail,
      notificationPhone,
      webhookUrl,
    } = req.body;

    if (!name || !jurisdictionId) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Missing name or jurisdictionId')
      );
    }

    if (contactEmail && !isValidEmail(contactEmail)) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Invalid contact email')
      );
    }

    if (notificationThreshold < 1) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Notification threshold must be at least 1')
      );
    }

    const jurisdiction = await db.query(
      'SELECT id FROM jurisdictions WHERE id = $1',
      [jurisdictionId]
    );

    if (jurisdiction.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Jurisdiction not found')
      );
    }

    const result = await db.query(
      `INSERT INTO authorities
         (jurisdiction_id, user_id, name, type, contact_email, contact_phone,
          website_url, notification_threshold, notification_email,
          notification_phone, webhook_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING ${AUTHORITY_FIELDS}`,
      [
        jurisdictionId,
        userId || null,
        name,
        type || null,
        contactEmail || null,
        contactPhone || null,
        websiteUrl || null,
        notificationThreshold,
        notificationEmail || contactEmail || null,
        notificationPhone || null,
        webhookUrl || null,
      ]
    );

    const authority = result.rows[0];

    await publishEvent({
      type: 'authority.registered',
      data: {
        authorityId: authority.id,
        jurisdictionId,
        name,
      },
    });

    logger.info(`Authority registered: ${name} (${authority.id})`);

    return res.status(201).json(successResponse(authority));
  } catch (error: any) {
    logger.error('Register authority error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to register authority')
    );
  }
});

// List authorities
router.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginationParams(req.query);
    const { jurisdictionId, verified, active } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

    if (jurisdictionId) {
      params.push(jurisdictionId);
      conditions.push(`jurisdiction_id = $${params.length}`);
    }
    if (verified !== undefined) {
      params.push(verified === 'true');
      conditions.push(`is_verified = $${params.length}`);
    }
    if (active !== undefined) {
      params.push(active === 'true');
      conditions.push(`is_active = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query(
      `SELECT COUNT(*) FROM authorities ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await db.query(
      `SELECT ${AUTHORITY_FIELDS} FROM authorities ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json(successResponse(result.rows, getPaginationMeta(total, page, limit)));
  } catch (error: any) {
    logger.error('List authorities error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to list authorities')
    );
  }
});

// Get authority by id
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, j.name as jurisdiction_name, j.type as jurisdiction_type
       FROM authorities a
       LEFT JOIN jurisdictions j ON a.jurisdiction_id = j.id
       WHERE a.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Authority not found')
      );
    }

    return res.json(successResponse(result.rows[0]));
  } catch (error: any) {
    logger.error('Get authority error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to get authority')
    );
  }
});

// Update authority
router.patch('/:id', async (req, res) => {
  try {
    const allowedFields: Record<string, string> = {
      name: 'name',
      type: 'type',
      contactEmail: 'contact_email',
      contactPhone: 'contact_phone',
      websiteUrl: 'website_url',
      notificationThreshold: 'notification_threshold',
      notificationEmail: 'notification_email',
      notificationPhone: 'notification_phone',
      webhookUrl: 'webhook_url',
      isActive: 'is_active',
    };

    const updates: string[] = [];
    const params: any[] = [];

    for (const [key, column] of Object.entries(allowedFields)) {
      if (req.body[key] !== undefined) {
        params.push(req.body[key]);
        updates.push(`${column} = $${params.length}`);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'No valid fields to update')
      );
    }

    if (req.body.contactEmail && !isValidEmail(req.body.contactEmail)) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Invalid contact email')
      );
    }

    params.push(req.params.id);
    const result = await db.query(
      `UPDATE authorities SET ${updates.join(', ')}
       WHERE id = $${params.length}
       RETURNING ${AUTHORITY_FIELDS}`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Authority not found')
      );
    }

    logger.info(`Authority updated: ${req.params.id}`);

    return res.json(successResponse(result.rows[0]));
  } catch (error: any) {
    logger.error('Update authority error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to update authority')
    );
  }
});

// Verify authority (admin/moderator action)
router.post('/:id/verify', async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE authorities SET is_verified = TRUE
       WHERE id = $1
       RETURNING ${AUTHORITY_FIELDS}`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Authority not found')
      );
    }

    const authority = result.rows[0];

    await publishEvent({
      type: 'authority.verified',
      data: {
        authorityId: authority.id,
        jurisdictionId: authority.jurisdiction_id,
        name: authority.name,
      },
    });

    logger.info(`Authority verified: ${authority.id}`);

    return res.json(successResponse(authority));
  } catch (error: any) {
    logger.error('Verify authority error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to verify authority')
    );
  }
});

// Deactivate authority (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE authorities SET is_active = FALSE WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Authority not found')
      );
    }

    logger.info(`Authority deactivated: ${req.params.id}`);

    return res.json(successResponse({ deactivated: true }));
  } catch (error: any) {
    logger.error('Deactivate authority error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to deactivate authority')
    );
  }
});

// Authority dashboard: problem statistics for the authority's jurisdiction
router.get('/:id/dashboard', async (req, res) => {
  try {
    const authorityResult = await db.query(
      'SELECT id, jurisdiction_id, notification_threshold FROM authorities WHERE id = $1',
      [req.params.id]
    );

    if (authorityResult.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Authority not found')
      );
    }

    const { jurisdiction_id } = authorityResult.rows[0];

    const [statusCounts, categoryCounts, resolutionTime, recentEscalated] =
      await Promise.all([
        db.query(
          `SELECT status, COUNT(*) as count
           FROM problems WHERE jurisdiction_id = $1
           GROUP BY status`,
          [jurisdiction_id]
        ),
        db.query(
          `SELECT category, COUNT(*) as count
           FROM problems WHERE jurisdiction_id = $1
           GROUP BY category ORDER BY count DESC LIMIT 10`,
          [jurisdiction_id]
        ),
        db.query(
          `SELECT
             AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 86400) as avg_days,
             PERCENTILE_CONT(0.5) WITHIN GROUP
               (ORDER BY EXTRACT(EPOCH FROM (resolved_at - created_at)) / 86400) as median_days
           FROM problems
           WHERE jurisdiction_id = $1 AND resolved_at IS NOT NULL`,
          [jurisdiction_id]
        ),
        db.query(
          `SELECT p.id, p.title, p.category, p.status, p.created_at,
                  p.authority_notified_at,
                  COALESCE(v.upvotes, 0) as upvotes
           FROM problems p
           LEFT JOIN vote_aggregates v ON p.id = v.problem_id
           WHERE p.jurisdiction_id = $1 AND p.status = 'escalated'
           ORDER BY v.upvotes DESC NULLS LAST, p.created_at DESC
           LIMIT 10`,
          [jurisdiction_id]
        ),
      ]);

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const row of statusCounts.rows) {
      byStatus[row.status] = parseInt(row.count);
      total += parseInt(row.count);
    }

    return res.json(
      successResponse({
        totalProblems: total,
        byStatus,
        topCategories: categoryCounts.rows.map((r) => ({
          category: r.category,
          count: parseInt(r.count),
        })),
        resolutionTime: {
          avgDays: resolutionTime.rows[0].avg_days
            ? parseFloat(parseFloat(resolutionTime.rows[0].avg_days).toFixed(1))
            : null,
          medianDays: resolutionTime.rows[0].median_days
            ? parseFloat(parseFloat(resolutionTime.rows[0].median_days).toFixed(1))
            : null,
        },
        escalatedProblems: recentEscalated.rows,
      })
    );
  } catch (error: any) {
    logger.error('Dashboard error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to load dashboard')
    );
  }
});

// Problems in the authority's jurisdiction
router.get('/:id/problems', async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginationParams(req.query);
    const { status } = req.query;

    const authorityResult = await db.query(
      'SELECT jurisdiction_id FROM authorities WHERE id = $1',
      [req.params.id]
    );

    if (authorityResult.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Authority not found')
      );
    }

    const { jurisdiction_id } = authorityResult.rows[0];

    const params: any[] = [jurisdiction_id];
    let statusFilter = '';
    if (status) {
      params.push(status);
      statusFilter = `AND p.status = $${params.length}`;
    }

    const countResult = await db.query(
      `SELECT COUNT(*) FROM problems p WHERE p.jurisdiction_id = $1 ${statusFilter}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await db.query(
      `SELECT p.id, p.title, p.description, p.category, p.status, p.priority,
              p.address, p.created_at, p.authority_notified_at, p.resolved_at,
              ST_X(p.location::geometry) as longitude,
              ST_Y(p.location::geometry) as latitude,
              COALESCE(v.upvotes, 0) as upvotes,
              COALESCE(v.score, 0) as score
       FROM problems p
       LEFT JOIN vote_aggregates v ON p.id = v.problem_id
       WHERE p.jurisdiction_id = $1 ${statusFilter}
       ORDER BY v.upvotes DESC NULLS LAST, p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json(successResponse(result.rows, getPaginationMeta(total, page, limit)));
  } catch (error: any) {
    logger.error('Authority problems error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to get problems')
    );
  }
});

export default router;
