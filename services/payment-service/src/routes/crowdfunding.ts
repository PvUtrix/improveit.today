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
import { getPaymentProvider } from '../utils/paymentProvider';

const router = Router();

// Create a funding campaign for a problem
router.post('/campaigns', async (req, res) => {
  try {
    const { problemId, goalAmount, currency = 'USD', deadline } = req.body;

    if (!problemId || !goalAmount) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Missing problemId or goalAmount')
      );
    }

    if (goalAmount <= 0) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Goal amount must be positive')
      );
    }

    const problem = await db.query(
      'SELECT id, status FROM problems WHERE id = $1',
      [problemId]
    );
    if (problem.rows.length === 0) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Problem not found'));
    }

    if (['resolved', 'rejected'].includes(problem.rows[0].status)) {
      return res.status(409).json(
        errorResponse('INVALID_STATE', 'Cannot fund a resolved or rejected problem')
      );
    }

    const existing = await db.query(
      'SELECT id FROM funding_campaigns WHERE problem_id = $1',
      [problemId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json(
        errorResponse('ALREADY_EXISTS', 'A campaign already exists for this problem')
      );
    }

    const result = await db.query(
      `INSERT INTO funding_campaigns (problem_id, goal_amount, currency, deadline)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [problemId, goalAmount, currency, deadline || null]
    );

    const campaign = result.rows[0];

    await publishEvent({
      type: 'campaign.created',
      data: {
        campaignId: campaign.id,
        problemId,
        goalAmount,
        currency,
      },
    });

    logger.info(`Campaign created: ${campaign.id} for problem ${problemId}`);

    return res.status(201).json(successResponse(campaign));
  } catch (error: any) {
    logger.error('Create campaign error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to create campaign')
    );
  }
});

// List campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginationParams(req.query);
    const { status } = req.query;

    const params: any[] = [];
    let where = '';
    if (status) {
      params.push(status);
      where = `WHERE c.status = $${params.length}`;
    }

    const countResult = await db.query(
      `SELECT COUNT(*) FROM funding_campaigns c ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await db.query(
      `SELECT c.*, p.title as problem_title, p.category, p.status as problem_status,
              ROUND(c.current_amount / c.goal_amount * 100, 1) as percent_funded
       FROM funding_campaigns c
       JOIN problems p ON c.problem_id = p.id
       ${where}
       ORDER BY c.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json(successResponse(result.rows, getPaginationMeta(total, page, limit)));
  } catch (error: any) {
    logger.error('List campaigns error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to list campaigns')
    );
  }
});

// Get campaign by problem (must be before /campaigns/:id)
router.get('/campaigns/problem/:problemId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, ROUND(c.current_amount / c.goal_amount * 100, 1) as percent_funded
       FROM funding_campaigns c
       WHERE c.problem_id = $1`,
      [req.params.problemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'No campaign for this problem')
      );
    }

    return res.json(successResponse(result.rows[0]));
  } catch (error: any) {
    logger.error('Get campaign by problem error:', error);
    return res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to get campaign'));
  }
});

// Get campaign with recent contributions
router.get('/campaigns/:id', async (req, res) => {
  try {
    const campaignResult = await db.query(
      `SELECT c.*, p.title as problem_title,
              ROUND(c.current_amount / c.goal_amount * 100, 1) as percent_funded
       FROM funding_campaigns c
       JOIN problems p ON c.problem_id = p.id
       WHERE c.id = $1`,
      [req.params.id]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Campaign not found'));
    }

    const contributions = await db.query(
      `SELECT co.id, co.amount, co.currency, co.created_at,
              CASE WHEN co.is_anonymous THEN NULL ELSE u.username END as contributor
       FROM contributions co
       LEFT JOIN users u ON co.user_id = u.id
       WHERE co.campaign_id = $1 AND co.status = 'completed'
       ORDER BY co.created_at DESC
       LIMIT 20`,
      [req.params.id]
    );

    const contributorCount = await db.query(
      `SELECT COUNT(DISTINCT user_id) as count FROM contributions
       WHERE campaign_id = $1 AND status = 'completed'`,
      [req.params.id]
    );

    return res.json(
      successResponse({
        ...campaignResult.rows[0],
        contributorCount: parseInt(contributorCount.rows[0].count),
        recentContributions: contributions.rows,
      })
    );
  } catch (error: any) {
    logger.error('Get campaign error:', error);
    return res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to get campaign'));
  }
});

// Contribute to a campaign
router.post('/campaigns/:id/contribute', async (req, res) => {
  const client = await db.connect();
  try {
    const {
      userId,
      amount,
      paymentMethod = 'card',
      isAnonymous = false,
    } = req.body;

    if (!userId || !amount) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Missing userId or amount')
      );
    }

    if (amount <= 0) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Amount must be positive')
      );
    }

    const campaignResult = await db.query(
      'SELECT * FROM funding_campaigns WHERE id = $1',
      [req.params.id]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Campaign not found'));
    }

    const campaign = campaignResult.rows[0];

    if (campaign.status !== 'active') {
      return res.status(409).json(
        errorResponse('INVALID_STATE', `Campaign is not active (status: ${campaign.status})`)
      );
    }

    if (campaign.deadline && new Date(campaign.deadline) < new Date()) {
      return res.status(409).json(
        errorResponse('INVALID_STATE', 'Campaign deadline has passed')
      );
    }

    // Create the payment intent with the configured provider
    const provider = getPaymentProvider();
    const intent = await provider.createPaymentIntent(amount, campaign.currency, {
      campaignId: campaign.id,
      problemId: campaign.problem_id,
      userId,
    });

    const contributionStatus = intent.status === 'succeeded' ? 'completed' : 'pending';

    await client.query('BEGIN');

    const contribution = await client.query(
      `INSERT INTO contributions
         (campaign_id, user_id, amount, currency, payment_intent_id, payment_method, status, is_anonymous)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        campaign.id,
        userId,
        amount,
        campaign.currency,
        intent.id,
        paymentMethod,
        contributionStatus,
        isAnonymous,
      ]
    );

    let updatedCampaign = campaign;

    if (contributionStatus === 'completed') {
      // Record the transaction and update campaign progress atomically
      await client.query(
        `INSERT INTO transactions
           (type, amount, currency, from_user_id, problem_id, payment_intent_id, status, metadata)
         VALUES ('contribution', $1, $2, $3, $4, $5, 'completed', $6)`,
        [
          amount,
          campaign.currency,
          userId,
          campaign.problem_id,
          intent.id,
          JSON.stringify({ campaignId: campaign.id }),
        ]
      );

      const updated = await client.query(
        `UPDATE funding_campaigns
         SET current_amount = current_amount + $1,
             status = CASE
               WHEN current_amount + $1 >= goal_amount THEN 'funded'
               ELSE status
             END
         WHERE id = $2
         RETURNING *`,
        [amount, campaign.id]
      );
      updatedCampaign = updated.rows[0];
    }

    await client.query('COMMIT');

    if (contributionStatus === 'completed') {
      await publishEvent({
        type: 'contribution.completed',
        data: {
          contributionId: contribution.rows[0].id,
          campaignId: campaign.id,
          problemId: campaign.problem_id,
          userId,
          amount,
          currency: campaign.currency,
        },
      });
    }

    if (updatedCampaign.status === 'funded' && campaign.status === 'active') {
      await publishEvent({
        type: 'campaign.funded',
        data: {
          campaignId: campaign.id,
          problemId: campaign.problem_id,
          goalAmount: campaign.goal_amount,
          totalRaised: updatedCampaign.current_amount,
        },
      });
      logger.info(`Campaign funded: ${campaign.id}`);
    }

    logger.info(
      `Contribution: ${amount} ${campaign.currency} to campaign ${campaign.id} by user ${userId}`
    );

    return res.status(201).json(
      successResponse({
        contribution: contribution.rows[0],
        campaign: updatedCampaign,
        // clientSecret lets the frontend complete payment when a real provider is used
        ...(intent.clientSecret && { clientSecret: intent.clientSecret }),
      })
    );
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Contribute error:', error);
    return res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to process contribution'));
  } finally {
    client.release();
  }
});

// Cancel a campaign (refunds are handled asynchronously per contribution)
router.post('/campaigns/:id/cancel', async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE funding_campaigns SET status = 'cancelled'
       WHERE id = $1 AND status = 'active'
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Active campaign not found (only active campaigns can be cancelled)')
      );
    }

    await publishEvent({
      type: 'campaign.cancelled',
      data: {
        campaignId: req.params.id,
        problemId: result.rows[0].problem_id,
      },
    });

    logger.info(`Campaign cancelled: ${req.params.id}`);

    return res.json(successResponse(result.rows[0]));
  } catch (error: any) {
    logger.error('Cancel campaign error:', error);
    return res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to cancel campaign'));
  }
});

export default router;
