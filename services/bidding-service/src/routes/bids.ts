import { Router } from 'express';
import { db } from '../db';
import {
  successResponse,
  errorResponse,
  parsePaginationParams,
  getPaginationMeta,
  getAuthUser,
  canActOn,
} from '@improveit/common';
import { logger } from '../utils/logger';
import { publishEvent } from '../utils/kafka';

const router = Router();

// Problems in these states are open for bidding
const BIDDABLE_STATUSES = ['reported', 'verified', 'escalated'];

// Submit a bid
router.post('/', async (req, res) => {
  try {
    const {
      problemId,
      solverId,
      amount,
      currency = 'USD',
      timelineDays,
      description,
      laborCost,
      materialCost,
      otherCosts,
      warrantyMonths = 3,
    } = req.body;

    if (!problemId || !solverId || !amount || !description) {
      return res.status(400).json(
        errorResponse(
          'VALIDATION_ERROR',
          'Missing required fields: problemId, solverId, amount, description'
        )
      );
    }

    if (amount <= 0) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Amount must be positive')
      );
    }

    const problem = await db.query(
      'SELECT id, status FROM problems WHERE id = $1',
      [problemId]
    );
    if (problem.rows.length === 0) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Problem not found'));
    }
    if (!BIDDABLE_STATUSES.includes(problem.rows[0].status)) {
      return res.status(409).json(
        errorResponse(
          'INVALID_STATE',
          `Problem is not open for bidding (status: ${problem.rows[0].status})`
        )
      );
    }

    const solver = await db.query(
      'SELECT id, is_active, user_id FROM solvers WHERE id = $1',
      [solverId]
    );
    if (solver.rows.length === 0) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Solver not found'));
    }

    // A caller may only bid through their own solver profile.
    const auth = getAuthUser(req);
    if (auth && solver.rows[0].user_id !== auth.userId && !['admin'].includes(auth.role)) {
      return res.status(403).json(
        errorResponse('FORBIDDEN', 'You can only submit bids with your own solver profile')
      );
    }
    if (!solver.rows[0].is_active) {
      return res.status(409).json(
        errorResponse('INVALID_STATE', 'Solver profile is not active')
      );
    }

    const existing = await db.query(
      `SELECT id FROM bids
       WHERE problem_id = $1 AND solver_id = $2 AND status = 'pending'`,
      [problemId, solverId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json(
        errorResponse('ALREADY_EXISTS', 'You already have a pending bid on this problem')
      );
    }

    const result = await db.query(
      `INSERT INTO bids
         (problem_id, solver_id, amount, currency, timeline_days, description,
          labor_cost, material_cost, other_costs, warranty_months)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        problemId,
        solverId,
        amount,
        currency,
        timelineDays || null,
        description,
        laborCost || null,
        materialCost || null,
        otherCosts || null,
        warrantyMonths,
      ]
    );

    const bid = result.rows[0];

    await publishEvent({
      type: 'bid.submitted',
      data: {
        bidId: bid.id,
        problemId,
        solverId,
        amount,
        currency,
      },
    });

    logger.info(`Bid submitted: ${bid.id} on problem ${problemId}`);

    return res.status(201).json(successResponse(bid));
  } catch (error: any) {
    logger.error('Submit bid error:', error);
    return res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to submit bid'));
  }
});

// List bids for a problem
router.get('/problem/:problemId', async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginationParams(req.query);
    const { status } = req.query;

    const params: any[] = [req.params.problemId];
    let statusFilter = '';
    if (status) {
      params.push(status);
      statusFilter = `AND b.status = $${params.length}`;
    }

    const countResult = await db.query(
      `SELECT COUNT(*) FROM bids b WHERE b.problem_id = $1 ${statusFilter}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await db.query(
      `SELECT b.*, s.company_name, s.account_type, s.rating as solver_rating,
              s.completed_jobs, s.verification_status, u.username as solver_username
       FROM bids b
       JOIN solvers s ON b.solver_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE b.problem_id = $1 ${statusFilter}
       ORDER BY b.amount ASC, s.rating DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json(successResponse(result.rows, getPaginationMeta(total, page, limit)));
  } catch (error: any) {
    logger.error('List bids error:', error);
    return res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to list bids'));
  }
});

// Get bid by id
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.*, s.company_name, s.rating as solver_rating,
              p.title as problem_title, p.status as problem_status
       FROM bids b
       JOIN solvers s ON b.solver_id = s.id
       JOIN problems p ON b.problem_id = p.id
       WHERE b.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Bid not found'));
    }

    return res.json(successResponse(result.rows[0]));
  } catch (error: any) {
    logger.error('Get bid error:', error);
    return res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to get bid'));
  }
});

// Update a pending bid
router.patch('/:id', async (req, res) => {
  try {
    const allowedFields: Record<string, string> = {
      amount: 'amount',
      timelineDays: 'timeline_days',
      description: 'description',
      laborCost: 'labor_cost',
      materialCost: 'material_cost',
      otherCosts: 'other_costs',
      warrantyMonths: 'warranty_months',
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

    if (req.body.amount !== undefined && req.body.amount <= 0) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Amount must be positive')
      );
    }

    params.push(req.params.id);
    const result = await db.query(
      `UPDATE bids SET ${updates.join(', ')}
       WHERE id = $${params.length} AND status = 'pending'
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Pending bid not found (only pending bids can be updated)')
      );
    }

    logger.info(`Bid updated: ${req.params.id}`);

    return res.json(successResponse(result.rows[0]));
  } catch (error: any) {
    logger.error('Update bid error:', error);
    return res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to update bid'));
  }
});

// Accept a bid: reject competing bids, move problem to in_progress
router.post('/:id/accept', async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const bidResult = await client.query(
      'SELECT * FROM bids WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );

    if (bidResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json(errorResponse('NOT_FOUND', 'Bid not found'));
    }

    const bid = bidResult.rows[0];

    if (bid.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(409).json(
        errorResponse('INVALID_STATE', `Bid is not pending (status: ${bid.status})`)
      );
    }

    const problemResult = await client.query(
      'SELECT id, status, user_id FROM problems WHERE id = $1 FOR UPDATE',
      [bid.problem_id]
    );

    // Only the problem's reporter or an authority/admin may accept a bid.
    const auth = getAuthUser(req);
    if (auth && !canActOn(auth, problemResult.rows[0].user_id)) {
      await client.query('ROLLBACK');
      return res.status(403).json(
        errorResponse('FORBIDDEN', 'Only the problem reporter or an authority can accept bids')
      );
    }

    if (!BIDDABLE_STATUSES.includes(problemResult.rows[0].status)) {
      await client.query('ROLLBACK');
      return res.status(409).json(
        errorResponse(
          'INVALID_STATE',
          `Problem is no longer open (status: ${problemResult.rows[0].status})`
        )
      );
    }

    const accepted = await client.query(
      `UPDATE bids SET status = 'accepted' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    await client.query(
      `UPDATE bids SET status = 'rejected'
       WHERE problem_id = $1 AND id != $2 AND status = 'pending'`,
      [bid.problem_id, req.params.id]
    );

    await client.query(
      `UPDATE problems SET status = 'in_progress' WHERE id = $1`,
      [bid.problem_id]
    );

    await client.query(
      `INSERT INTO problem_history (problem_id, status, comment, metadata)
       VALUES ($1, 'in_progress', 'Bid accepted', $2)`,
      [bid.problem_id, JSON.stringify({ bidId: bid.id, solverId: bid.solver_id })]
    );

    await client.query(
      `UPDATE solvers SET total_jobs = total_jobs + 1 WHERE id = $1`,
      [bid.solver_id]
    );

    await client.query('COMMIT');

    await publishEvent({
      type: 'bid.accepted',
      data: {
        bidId: bid.id,
        problemId: bid.problem_id,
        solverId: bid.solver_id,
        amount: bid.amount,
        currency: bid.currency,
      },
    });

    logger.info(`Bid accepted: ${bid.id} for problem ${bid.problem_id}`);

    return res.json(successResponse(accepted.rows[0]));
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Accept bid error:', error);
    return res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to accept bid'));
  } finally {
    client.release();
  }
});

// Withdraw a bid (solver action)
router.post('/:id/withdraw', async (req, res) => {
  try {
    // Only the solver who submitted the bid (or an admin) may withdraw it.
    const auth = getAuthUser(req);
    if (auth) {
      const owner = await db.query(
        `SELECT s.user_id FROM bids b JOIN solvers s ON b.solver_id = s.id WHERE b.id = $1`,
        [req.params.id]
      );
      if (owner.rows.length === 0) {
        return res.status(404).json(errorResponse('NOT_FOUND', 'Bid not found'));
      }
      if (!canActOn(auth, owner.rows[0].user_id, ['admin'])) {
        return res.status(403).json(
          errorResponse('FORBIDDEN', 'Only the bid owner can withdraw it')
        );
      }
    }

    const result = await db.query(
      `UPDATE bids SET status = 'withdrawn'
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Pending bid not found (only pending bids can be withdrawn)')
      );
    }

    logger.info(`Bid withdrawn: ${req.params.id}`);

    return res.json(successResponse(result.rows[0]));
  } catch (error: any) {
    logger.error('Withdraw bid error:', error);
    return res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to withdraw bid'));
  }
});

// Leave a review on an accepted bid; updates the solver's aggregate rating
router.post('/:id/reviews', async (req, res) => {
  const client = await db.connect();
  try {
    const { rating, comment } = req.body;
    // Reviews always belong to the gateway-verified caller.
    const userId = getAuthUser(req)?.userId ?? req.body.userId;

    if (!userId || !rating) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Missing userId or rating')
      );
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Rating must be an integer from 1 to 5')
      );
    }

    const bidResult = await db.query(
      `SELECT id, problem_id, solver_id, status FROM bids WHERE id = $1`,
      [req.params.id]
    );

    if (bidResult.rows.length === 0) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Bid not found'));
    }

    const bid = bidResult.rows[0];

    if (bid.status !== 'accepted') {
      return res.status(409).json(
        errorResponse('INVALID_STATE', 'Only accepted bids can be reviewed')
      );
    }

    const existing = await db.query(
      'SELECT id FROM bid_reviews WHERE bid_id = $1 AND user_id = $2',
      [req.params.id, userId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json(
        errorResponse('ALREADY_EXISTS', 'You already reviewed this bid')
      );
    }

    await client.query('BEGIN');

    const review = await client.query(
      `INSERT INTO bid_reviews (bid_id, problem_id, solver_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.params.id, bid.problem_id, bid.solver_id, userId, rating, comment || null]
    );

    await client.query(
      `UPDATE solvers SET rating = (
         SELECT ROUND(AVG(rating)::numeric, 2) FROM bid_reviews WHERE solver_id = $1
       )
       WHERE id = $1`,
      [bid.solver_id]
    );

    await client.query('COMMIT');

    logger.info(`Review created for bid ${req.params.id}: ${rating} stars`);

    return res.status(201).json(successResponse(review.rows[0]));
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Create review error:', error);
    return res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to create review'));
  } finally {
    client.release();
  }
});

export default router;
