import { Router } from 'express';
import { db } from '../db';
import {
  successResponse,
  errorResponse,
  parsePaginationParams,
  getPaginationMeta,
  getAuthUser,
} from '@improveit/common';
import { logger } from '../utils/logger';
import { publishEvent } from '../utils/kafka';

const router = Router();

const SOLVER_FIELDS = `id, user_id, company_name, account_type, skills,
       verification_status, rating, total_jobs, completed_jobs, hourly_rate,
       currency, portfolio_url, insurance_verified, license_verified,
       is_active, created_at, updated_at`;

const ACCOUNT_TYPES = ['individual', 'team', 'company', 'ngo'];

// Register a solver profile
router.post('/', async (req, res) => {
  try {
    const {
      companyName,
      accountType = 'individual',
      skills = [],
      hourlyRate,
      currency = 'USD',
      portfolioUrl,
    } = req.body;
    // A solver profile always belongs to the gateway-verified caller.
    const userId = getAuthUser(req)?.userId ?? req.body.userId;

    if (!userId) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Missing userId')
      );
    }

    if (!ACCOUNT_TYPES.includes(accountType)) {
      return res.status(400).json(
        errorResponse(
          'VALIDATION_ERROR',
          `Invalid accountType. Must be one of: ${ACCOUNT_TYPES.join(', ')}`
        )
      );
    }

    const user = await db.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'User not found'));
    }

    const existing = await db.query(
      'SELECT id FROM solvers WHERE user_id = $1',
      [userId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json(
        errorResponse('ALREADY_EXISTS', 'Solver profile already exists for this user')
      );
    }

    const result = await db.query(
      `INSERT INTO solvers
         (user_id, company_name, account_type, skills, hourly_rate, currency, portfolio_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${SOLVER_FIELDS}`,
      [
        userId,
        companyName || null,
        accountType,
        skills,
        hourlyRate || null,
        currency,
        portfolioUrl || null,
      ]
    );

    const solver = result.rows[0];

    // Promote the user's role so they can access solver features
    await db.query(
      `UPDATE users SET role = 'solver' WHERE id = $1 AND role = 'user'`,
      [userId]
    );

    await publishEvent({
      type: 'solver.registered',
      data: {
        solverId: solver.id,
        userId,
        accountType,
      },
    });

    logger.info(`Solver registered: ${solver.id} (user ${userId})`);

    return res.status(201).json(successResponse(solver));
  } catch (error: any) {
    logger.error('Register solver error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to register solver')
    );
  }
});

// List solvers
router.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginationParams(req.query);
    const { skill, minRating, verificationStatus, accountType } = req.query;

    const conditions: string[] = ['is_active = TRUE'];
    const params: any[] = [];

    if (skill) {
      params.push(skill);
      conditions.push(`$${params.length} = ANY(skills)`);
    }
    if (minRating) {
      params.push(parseFloat(minRating as string));
      conditions.push(`rating >= $${params.length}`);
    }
    if (verificationStatus) {
      params.push(verificationStatus);
      conditions.push(`verification_status = $${params.length}`);
    }
    if (accountType) {
      params.push(accountType);
      conditions.push(`account_type = $${params.length}`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await db.query(
      `SELECT COUNT(*) FROM solvers ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await db.query(
      `SELECT ${SOLVER_FIELDS} FROM solvers ${where}
       ORDER BY rating DESC, completed_jobs DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json(successResponse(result.rows, getPaginationMeta(total, page, limit)));
  } catch (error: any) {
    logger.error('List solvers error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to list solvers')
    );
  }
});

// Get solver profile with recent reviews
router.get('/:id', async (req, res) => {
  try {
    const solverResult = await db.query(
      `SELECT s.*, u.username
       FROM solvers s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (solverResult.rows.length === 0) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Solver not found'));
    }

    const reviews = await db.query(
      `SELECT r.id, r.rating, r.comment, r.created_at, u.username as reviewer
       FROM bid_reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.solver_id = $1
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [req.params.id]
    );

    return res.json(
      successResponse({
        ...solverResult.rows[0],
        recentReviews: reviews.rows,
      })
    );
  } catch (error: any) {
    logger.error('Get solver error:', error);
    return res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to get solver'));
  }
});

// Update solver profile
router.patch('/:id', async (req, res) => {
  try {
    const allowedFields: Record<string, string> = {
      companyName: 'company_name',
      skills: 'skills',
      hourlyRate: 'hourly_rate',
      currency: 'currency',
      portfolioUrl: 'portfolio_url',
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

    params.push(req.params.id);
    const result = await db.query(
      `UPDATE solvers SET ${updates.join(', ')}
       WHERE id = $${params.length}
       RETURNING ${SOLVER_FIELDS}`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Solver not found'));
    }

    logger.info(`Solver updated: ${req.params.id}`);

    return res.json(successResponse(result.rows[0]));
  } catch (error: any) {
    logger.error('Update solver error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to update solver')
    );
  }
});

// Set verification status (admin/moderator action)
router.post('/:id/verify', async (req, res) => {
  try {
    // Verification is a trust operation — elevated roles only.
    const auth = getAuthUser(req);
    if (auth && !['admin', 'authority', 'moderator'].includes(auth.role)) {
      return res.status(403).json(
        errorResponse('FORBIDDEN', 'Only an authority or admin can verify solvers')
      );
    }

    const { status = 'verified', insuranceVerified, licenseVerified } = req.body;

    if (!['unverified', 'pending', 'verified'].includes(status)) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Invalid verification status')
      );
    }

    const updates = ['verification_status = $1'];
    const params: any[] = [status];

    if (insuranceVerified !== undefined) {
      params.push(insuranceVerified);
      updates.push(`insurance_verified = $${params.length}`);
    }
    if (licenseVerified !== undefined) {
      params.push(licenseVerified);
      updates.push(`license_verified = $${params.length}`);
    }

    params.push(req.params.id);
    const result = await db.query(
      `UPDATE solvers SET ${updates.join(', ')}
       WHERE id = $${params.length}
       RETURNING ${SOLVER_FIELDS}`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Solver not found'));
    }

    logger.info(`Solver verification updated: ${req.params.id} → ${status}`);

    return res.json(successResponse(result.rows[0]));
  } catch (error: any) {
    logger.error('Verify solver error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to update verification')
    );
  }
});

// Solver's bids
router.get('/:id/bids', async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginationParams(req.query);
    const { status } = req.query;

    const params: any[] = [req.params.id];
    let statusFilter = '';
    if (status) {
      params.push(status);
      statusFilter = `AND b.status = $${params.length}`;
    }

    const countResult = await db.query(
      `SELECT COUNT(*) FROM bids b WHERE b.solver_id = $1 ${statusFilter}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await db.query(
      `SELECT b.*, p.title as problem_title, p.status as problem_status
       FROM bids b
       JOIN problems p ON b.problem_id = p.id
       WHERE b.solver_id = $1 ${statusFilter}
       ORDER BY b.submitted_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json(successResponse(result.rows, getPaginationMeta(total, page, limit)));
  } catch (error: any) {
    logger.error('Solver bids error:', error);
    return res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to get bids'));
  }
});

// Solver's reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginationParams(req.query);

    const countResult = await db.query(
      'SELECT COUNT(*) FROM bid_reviews WHERE solver_id = $1',
      [req.params.id]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await db.query(
      `SELECT r.id, r.bid_id, r.problem_id, r.rating, r.comment, r.created_at,
              u.username as reviewer
       FROM bid_reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.solver_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]
    );

    return res.json(successResponse(result.rows, getPaginationMeta(total, page, limit)));
  } catch (error: any) {
    logger.error('Solver reviews error:', error);
    return res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to get reviews'));
  }
});

export default router;
