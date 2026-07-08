import { Router } from 'express';
import { db } from '../db';
import {
  successResponse,
  errorResponse,
  parsePaginationParams,
  getPaginationMeta,
} from '@improveit/common';
import { logger } from '../utils/logger';
import { publishEvent } from '../utils/kafka';

const router = Router();

// Transaction history for a user
router.get('/transactions/user/:userId', async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginationParams(req.query);

    const countResult = await db.query(
      'SELECT COUNT(*) FROM transactions WHERE from_user_id = $1 OR to_user_id = $1',
      [req.params.userId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await db.query(
      `SELECT t.*, p.title as problem_title
       FROM transactions t
       LEFT JOIN problems p ON t.problem_id = p.id
       WHERE t.from_user_id = $1 OR t.to_user_id = $1
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.params.userId, limit, offset]
    );

    return res.json(successResponse(result.rows, getPaginationMeta(total, page, limit)));
  } catch (error: any) {
    logger.error('User transactions error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to get transactions')
    );
  }
});

// Get transaction by id
router.get('/transactions/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM transactions WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Transaction not found'));
    }

    return res.json(successResponse(result.rows[0]));
  } catch (error: any) {
    logger.error('Get transaction error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to get transaction')
    );
  }
});

/**
 * Release escrowed campaign funds to the solver of the accepted bid.
 * Called when a problem is verified as resolved. Funds flow:
 * contributions (escrow) → campaign completed → payout transaction to solver.
 */
router.post('/escrow/release', async (req, res) => {
  const client = await db.connect();
  try {
    const { problemId } = req.body;

    if (!problemId) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Missing problemId')
      );
    }

    const problem = await db.query(
      'SELECT id, status FROM problems WHERE id = $1',
      [problemId]
    );
    if (problem.rows.length === 0) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Problem not found'));
    }
    if (problem.rows[0].status !== 'resolved') {
      return res.status(409).json(
        errorResponse(
          'INVALID_STATE',
          `Escrow can only be released for resolved problems (status: ${problem.rows[0].status})`
        )
      );
    }

    const bidResult = await db.query(
      `SELECT b.id, b.amount, b.currency, s.user_id as solver_user_id, b.solver_id
       FROM bids b
       JOIN solvers s ON b.solver_id = s.id
       WHERE b.problem_id = $1 AND b.status = 'accepted'`,
      [problemId]
    );
    if (bidResult.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'No accepted bid for this problem')
      );
    }
    const bid = bidResult.rows[0];

    const campaignResult = await db.query(
      `SELECT * FROM funding_campaigns
       WHERE problem_id = $1 AND status IN ('funded', 'active')`,
      [problemId]
    );
    if (campaignResult.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'No fundable campaign for this problem')
      );
    }
    const campaign = campaignResult.rows[0];

    const alreadyReleased = await db.query(
      `SELECT id FROM transactions
       WHERE problem_id = $1 AND type = 'escrow_release' AND status = 'completed'`,
      [problemId]
    );
    if (alreadyReleased.rows.length > 0) {
      return res.status(409).json(
        errorResponse('ALREADY_EXISTS', 'Escrow already released for this problem')
      );
    }

    const payout = Math.min(
      parseFloat(campaign.current_amount),
      parseFloat(bid.amount)
    );

    await client.query('BEGIN');

    const transaction = await client.query(
      `INSERT INTO transactions
         (type, amount, currency, to_user_id, problem_id, status, metadata)
       VALUES ('escrow_release', $1, $2, $3, $4, 'completed', $5)
       RETURNING *`,
      [
        payout,
        campaign.currency,
        bid.solver_user_id,
        problemId,
        JSON.stringify({
          campaignId: campaign.id,
          bidId: bid.id,
          solverId: bid.solver_id,
        }),
      ]
    );

    await client.query(
      `UPDATE funding_campaigns SET status = 'completed' WHERE id = $1`,
      [campaign.id]
    );

    await client.query(
      `UPDATE solvers SET completed_jobs = completed_jobs + 1 WHERE id = $1`,
      [bid.solver_id]
    );

    await client.query('COMMIT');

    await publishEvent({
      type: 'escrow.released',
      data: {
        transactionId: transaction.rows[0].id,
        problemId,
        solverId: bid.solver_id,
        amount: payout,
        currency: campaign.currency,
      },
    });

    logger.info(`Escrow released: ${payout} ${campaign.currency} for problem ${problemId}`);

    return res.json(successResponse(transaction.rows[0]));
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Escrow release error:', error);
    return res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to release escrow'));
  } finally {
    client.release();
  }
});

/**
 * Payment provider webhook (Stripe-compatible shape).
 * Completes pending contributions when the provider confirms payment.
 * With the mock provider contributions complete inline, so this is only
 * exercised with a real provider.
 */
router.post('/webhooks/provider', async (req, res) => {
  const client = await db.connect();
  try {
    const { type, data } = req.body;

    if (type !== 'payment_intent.succeeded' || !data?.object?.id) {
      return res.json(successResponse({ received: true, handled: false }));
    }

    const paymentIntentId = data.object.id;

    await client.query('BEGIN');

    const contribution = await client.query(
      `UPDATE contributions SET status = 'completed'
       WHERE payment_intent_id = $1 AND status = 'pending'
       RETURNING *`,
      [paymentIntentId]
    );

    if (contribution.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.json(successResponse({ received: true, handled: false }));
    }

    const c = contribution.rows[0];

    const campaign = await client.query(
      `UPDATE funding_campaigns
       SET current_amount = current_amount + $1,
           status = CASE
             WHEN current_amount + $1 >= goal_amount THEN 'funded'
             ELSE status
           END
       WHERE id = $2
       RETURNING *`,
      [c.amount, c.campaign_id]
    );

    await client.query(
      `INSERT INTO transactions
         (type, amount, currency, from_user_id, problem_id, payment_intent_id, status, metadata)
       VALUES ('contribution', $1, $2, $3, $4, $5, 'completed', $6)`,
      [
        c.amount,
        c.currency,
        c.user_id,
        campaign.rows[0].problem_id,
        paymentIntentId,
        JSON.stringify({ campaignId: c.campaign_id }),
      ]
    );

    await client.query('COMMIT');

    if (campaign.rows[0].status === 'funded') {
      await publishEvent({
        type: 'campaign.funded',
        data: {
          campaignId: c.campaign_id,
          problemId: campaign.rows[0].problem_id,
          goalAmount: campaign.rows[0].goal_amount,
          totalRaised: campaign.rows[0].current_amount,
        },
      });
    }

    logger.info(`Webhook: contribution ${c.id} completed via ${paymentIntentId}`);

    return res.json(successResponse({ received: true, handled: true }));
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Webhook error:', error);
    return res.status(500).json(errorResponse('INTERNAL_ERROR', 'Webhook processing failed'));
  } finally {
    client.release();
  }
});

export default router;
