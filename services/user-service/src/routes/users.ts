import { Router } from 'express';
import { db } from '../db';
import { successResponse, errorResponse } from '@improveit/common';

const router = Router();

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT u.id, u.email, u.username, u.role, u.created_at,
              p.first_name, p.last_name, p.avatar_url, p.bio,
              r.points, r.level, r.badges
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       LEFT JOIN user_reputation r ON u.id = r.user_id
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'User not found')
      );
    }

    return res.json(successResponse(result.rows[0]));
  } catch (error) {
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to fetch user')
    );
  }
});

// Update user profile
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, bio, language, timezone } = req.body;

    const result = await db.query(
      `UPDATE user_profiles
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           bio = COALESCE($3, bio),
           language = COALESCE($4, language),
           timezone = COALESCE($5, timezone),
           updated_at = NOW()
       WHERE user_id = $6
       RETURNING *`,
      [firstName, lastName, bio, language, timezone, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'User not found')
      );
    }

    return res.json(successResponse(result.rows[0]));
  } catch (error) {
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to update profile')
    );
  }
});

export default router;
