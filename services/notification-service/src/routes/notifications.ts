import { Router } from 'express';
import { successResponse, errorResponse } from '@improveit/common';
import { logger } from '../utils/logger';
import { sendEmail } from '../utils/email';
import { sendSMS } from '../utils/sms';
import { sendPushNotification } from '../utils/push';
import { db } from '../db';

const router = Router();

// Send notification (manual)
router.post('/send', async (req, res) => {
  try {
    const { userId, type, title, content, channels = ['email'], metadata } = req.body;

    if (!userId || !type || !title) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Missing required fields')
      );
    }

    // Get user and preferences
    const userResult = await db.query(
      `SELECT u.email, u.username, p.phone,
              np.email_enabled, np.sms_enabled, np.push_enabled
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       LEFT JOIN notification_preferences np ON u.id = np.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'User not found')
      );
    }

    const user = userResult.rows[0];
    const results = [];

    // Send via requested channels if user has them enabled
    if (channels.includes('email') && user.email_enabled !== false) {
      try {
        await sendEmail({
          to: user.email,
          subject: title,
          text: content || '',
          html: content ? `<p>${content}</p>` : '',
        });
        results.push({ channel: 'email', status: 'sent' });
      } catch (error) {
        results.push({ channel: 'email', status: 'failed', error: String(error) });
      }
    }

    if (channels.includes('sms') && user.sms_enabled && user.phone) {
      try {
        await sendSMS(user.phone, `${title}: ${content}`);
        results.push({ channel: 'sms', status: 'sent' });
      } catch (error) {
        results.push({ channel: 'sms', status: 'failed', error: String(error) });
      }
    }

    if (channels.includes('push') && user.push_enabled) {
      try {
        await sendPushNotification(userId, { title, body: content || '' });
        results.push({ channel: 'push', status: 'sent' });
      } catch (error) {
        results.push({ channel: 'push', status: 'failed', error: String(error) });
      }
    }

    // Store notification in database
    await db.query(
      `INSERT INTO notifications (user_id, type, title, content, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, content, JSON.stringify(metadata || {})]
    );

    logger.info(`Notification sent to user ${userId}: ${type}`);

    return res.json(successResponse({ results }));
  } catch (error: any) {
    logger.error('Send notification error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to send notification')
    );
  }
});

// Get user notifications
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { unreadOnly = 'false', limit = '20' } = req.query;

    let query = `
      SELECT id, type, title, content, link, is_read, metadata, created_at
      FROM notifications
      WHERE user_id = $1
    `;

    if (unreadOnly === 'true') {
      query += ` AND is_read = FALSE`;
    }

    query += ` ORDER BY created_at DESC LIMIT $2`;

    const result = await db.query(query, [userId, parseInt(limit as string)]);

    return res.json(successResponse(result.rows));
  } catch (error: any) {
    logger.error('Get notifications error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to get notifications')
    );
  }
});

// Mark notification as read
router.patch('/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;

    const result = await db.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE id = $1
       RETURNING id, is_read`,
      [notificationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Notification not found')
      );
    }

    return res.json(successResponse(result.rows[0]));
  } catch (error: any) {
    logger.error('Mark read error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to mark notification as read')
    );
  }
});

// Mark all as read
router.post('/user/:userId/read-all', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE
       RETURNING COUNT(*)`,
      [userId]
    );

    return res.json(successResponse({ marked: result.rowCount }));
  } catch (error: any) {
    logger.error('Mark all read error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to mark all as read')
    );
  }
});

// Get/update user notification preferences
router.get('/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `SELECT email_enabled, sms_enabled, push_enabled, telegram_enabled, preferences
       FROM notification_preferences
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Create default preferences
      const created = await db.query(
        `INSERT INTO notification_preferences (user_id)
         VALUES ($1)
         RETURNING *`,
        [userId]
      );
      return res.json(successResponse(created.rows[0]));
    }

    return res.json(successResponse(result.rows[0]));
  } catch (error: any) {
    logger.error('Get preferences error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to get preferences')
    );
  }
});

router.patch('/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { emailEnabled, smsEnabled, pushEnabled, telegramEnabled, preferences } = req.body;

    const result = await db.query(
      `UPDATE notification_preferences
       SET email_enabled = COALESCE($1, email_enabled),
           sms_enabled = COALESCE($2, sms_enabled),
           push_enabled = COALESCE($3, push_enabled),
           telegram_enabled = COALESCE($4, telegram_enabled),
           preferences = COALESCE($5, preferences),
           updated_at = NOW()
       WHERE user_id = $6
       RETURNING *`,
      [emailEnabled, smsEnabled, pushEnabled, telegramEnabled, preferences, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Preferences not found')
      );
    }

    return res.json(successResponse(result.rows[0]));
  } catch (error: any) {
    logger.error('Update preferences error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to update preferences')
    );
  }
});

export default router;
