import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jwt';
import { db } from '../db';
import { successResponse, errorResponse } from '@improveit/common';
import { logger } from '../utils/logger';

const router = Router();

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

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRY || '15m' }
    );

    res.status(201).json(successResponse({ user, token }));
  } catch (error: any) {
    logger.error('Registration error:', error);
    res.status(500).json(
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

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRY || '15m' }
    );

    logger.info(`User logged in: ${email}`);

    res.json(successResponse({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      token
    }));
  } catch (error: any) {
    logger.error('Login error:', error);
    res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Login failed')
    );
  }
});

export default router;
