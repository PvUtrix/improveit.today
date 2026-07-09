import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { successResponse, errorResponse } from '@improveit/common';
import { logger } from '../utils/logger';
import { issueTokens, rotateRefreshToken, revokeRefreshToken } from '../utils/tokens';

const router = Router();

// Best-effort request metadata for session auditing.
function sessionMeta(req: import('express').Request) {
  return {
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || undefined,
  };
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    // Validation
    if (!email || !username || !password) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Missing required fields')
      );
    }

    // Check if user exists
    const existing = await db.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json(
        errorResponse('ALREADY_EXISTS', 'User already exists')
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.query(
      `INSERT INTO users (email, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, username, role, created_at`,
      [email, username, passwordHash]
    );

    const user = result.rows[0];

    // Create profile
    await db.query(
      'INSERT INTO user_profiles (user_id) VALUES ($1)',
      [user.id]
    );

    // Create reputation
    await db.query(
      'INSERT INTO user_reputation (user_id) VALUES ($1)',
      [user.id]
    );

    logger.info(`User registered: ${email}`);

    const tokens = await issueTokens(user, sessionMeta(req));

    return res.status(201).json(successResponse({ user, ...tokens }));
  } catch (error: any) {
    logger.error('Registration error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Registration failed')
    );
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Missing credentials')
      );
    }

    // Find user
    const result = await db.query(
      'SELECT id, email, username, password_hash, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json(
        errorResponse('UNAUTHORIZED', 'Invalid credentials')
      );
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json(
        errorResponse('FORBIDDEN', 'Account is deactivated')
      );
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json(
        errorResponse('UNAUTHORIZED', 'Invalid credentials')
      );
    }

    const tokens = await issueTokens(
      { id: user.id, email: user.email, role: user.role },
      sessionMeta(req)
    );

    logger.info(`User logged in: ${email}`);

    return res.json(successResponse({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      ...tokens,
    }));
  } catch (error: any) {
    logger.error('Login error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Login failed')
    );
  }
});

// Exchange a valid refresh token for a new access token (rotates the
// refresh token). Works even when the access token has expired.
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Missing refreshToken')
      );
    }

    const result = await rotateRefreshToken(refreshToken, sessionMeta(req));
    if (!result) {
      return res.status(401).json(
        errorResponse('UNAUTHORIZED', 'Invalid or expired refresh token')
      );
    }

    // Include the up-to-date user so clients can refresh their cached copy.
    const userRow = await db.query(
      'SELECT id, email, username, role FROM users WHERE id = $1',
      [result.user.id]
    );

    return res.json(successResponse({ user: userRow.rows[0], ...result.tokens }));
  } catch (error: any) {
    logger.error('Refresh error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Token refresh failed')
    );
  }
});

// Revoke a refresh token (logout). Idempotent.
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }
    return res.json(successResponse({ loggedOut: true }));
  } catch (error: any) {
    logger.error('Logout error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Logout failed')
    );
  }
});

export default router;
