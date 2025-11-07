import { Router } from 'express';
import { db } from '../db';
import { successResponse, errorResponse } from '@improveit/common';
import { logger } from '../utils/logger';
import { publishEvent } from '../utils/kafka';

const router = Router();

// Cast a vote
router.post('/', async (req, res) => {
  try {
    const { userId, problemId, voteType = 'upvote' } = req.body;

    if (!userId || !problemId) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Missing userId or problemId')
      );
    }

    if (!['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Invalid vote type')
      );
    }

    // Check if user already voted
    const existing = await db.query(
      'SELECT id, vote_type FROM votes WHERE user_id = $1 AND problem_id = $2',
      [userId, problemId]
    );

    let vote;

    if (existing.rows.length > 0) {
      // Update existing vote
      if (existing.rows[0].vote_type === voteType) {
        return res.status(409).json(
          errorResponse('ALREADY_EXISTS', 'You already voted this way')
        );
      }

      const result = await db.query(
        `UPDATE votes SET vote_type = $1 WHERE user_id = $2 AND problem_id = $3
         RETURNING id, user_id, problem_id, vote_type, created_at`,
        [voteType, userId, problemId]
      );
      vote = result.rows[0];
    } else {
      // Create new vote
      const result = await db.query(
        `INSERT INTO votes (user_id, problem_id, vote_type)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, problem_id, vote_type, created_at`,
        [userId, problemId, voteType]
      );
      vote = result.rows[0];
    }

    // Refresh materialized view
    await db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY vote_aggregates');

    // Get updated vote count
    const aggregates = await db.query(
      'SELECT upvotes, downvotes, score FROM vote_aggregates WHERE problem_id = $1',
      [problemId]
    );

    const stats = aggregates.rows[0] || { upvotes: 0, downvotes: 0, score: 0 };

    // Publish event
    await publishEvent({
      type: 'vote.cast',
      data: {
        voteId: vote.id,
        userId,
        problemId,
        voteType,
        newScore: stats.score,
      },
    });

    // Check if threshold reached
    await checkVoteThreshold(problemId, stats.upvotes);

    logger.info(`Vote cast: ${voteType} on problem ${problemId} by user ${userId}`);

    res.status(201).json(successResponse({ vote, stats }));
  } catch (error: any) {
    logger.error('Vote error:', error);
    res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to cast vote')
    );
  }
});

// Remove vote
router.delete('/', async (req, res) => {
  try {
    const { userId, problemId } = req.body;

    if (!userId || !problemId) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Missing userId or problemId')
      );
    }

    const result = await db.query(
      'DELETE FROM votes WHERE user_id = $1 AND problem_id = $2 RETURNING id',
      [userId, problemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Vote not found')
      );
    }

    // Refresh materialized view
    await db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY vote_aggregates');

    logger.info(`Vote removed: problem ${problemId} by user ${userId}`);

    res.json(successResponse({ removed: true }));
  } catch (error: any) {
    logger.error('Remove vote error:', error);
    res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to remove vote')
    );
  }
});

// Get vote counts for a problem
router.get('/problem/:problemId', async (req, res) => {
  try {
    const { problemId } = req.params;

    const result = await db.query(
      'SELECT upvotes, downvotes, score FROM vote_aggregates WHERE problem_id = $1',
      [problemId]
    );

    if (result.rows.length === 0) {
      return res.json(successResponse({ upvotes: 0, downvotes: 0, score: 0 }));
    }

    res.json(successResponse(result.rows[0]));
  } catch (error: any) {
    logger.error('Get votes error:', error);
    res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to get vote counts')
    );
  }
});

// Get user's vote on a problem
router.get('/user/:userId/problem/:problemId', async (req, res) => {
  try {
    const { userId, problemId } = req.params;

    const result = await db.query(
      'SELECT id, vote_type, created_at FROM votes WHERE user_id = $1 AND problem_id = $2',
      [userId, problemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'No vote found')
      );
    }

    res.json(successResponse(result.rows[0]));
  } catch (error: any) {
    logger.error('Get user vote error:', error);
    res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to get vote')
    );
  }
});

// Get trending problems (highest scores)
router.get('/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await db.query(
      `SELECT p.id, p.title, p.description, p.category, p.status,
              ST_X(p.location::geometry) as longitude,
              ST_Y(p.location::geometry) as latitude,
              v.upvotes, v.downvotes, v.score
       FROM problems p
       INNER JOIN vote_aggregates v ON p.id = v.problem_id
       WHERE p.status IN ('reported', 'verified', 'escalated')
       ORDER BY v.score DESC, p.created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json(successResponse(result.rows));
  } catch (error: any) {
    logger.error('Get trending error:', error);
    res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to get trending problems')
    );
  }
});

// Check vote threshold and trigger authority notification
async function checkVoteThreshold(problemId: string, upvotes: number) {
  try {
    // Get problem and its jurisdiction
    const problemResult = await db.query(
      `SELECT p.id, p.jurisdiction_id, p.authority_notified_at,
              a.notification_threshold, a.notification_email
       FROM problems p
       LEFT JOIN authorities a ON p.jurisdiction_id = a.jurisdiction_id
       WHERE p.id = $1`,
      [problemId]
    );

    if (problemResult.rows.length === 0) return;

    const problem = problemResult.rows[0];

    // Check if threshold reached and not already notified
    if (
      problem.notification_threshold &&
      upvotes >= problem.notification_threshold &&
      !problem.authority_notified_at
    ) {
      // Update problem status
      await db.query(
        `UPDATE problems
         SET status = 'escalated', authority_notified_at = NOW()
         WHERE id = $1`,
        [problemId]
      );

      // Publish threshold reached event
      await publishEvent({
        type: 'problem.threshold_reached',
        data: {
          problemId,
          upvotes,
          threshold: problem.notification_threshold,
          jurisdictionId: problem.jurisdiction_id,
          authorityEmail: problem.notification_email,
        },
      });

      logger.info(`Threshold reached for problem ${problemId}: ${upvotes} votes`);
    }
  } catch (error) {
    logger.error('Error checking vote threshold:', error);
  }
}

export default router;
