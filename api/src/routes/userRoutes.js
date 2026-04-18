import express from 'express';
import * as userController from '../controllers/userController.js';
import { authenticateToken, verifyTelegramAuth, generateToken } from '../middleware/auth.js';
import { query } from '../db.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { telegram_id, name, username } = req.body;
    
    if (!telegram_id || !name) {
      return res.status(400).json({ error: 'telegram_id and name are required' });
    }

    const user = await userController.registerUser(telegram_id, name, username);
    res.json({ success: true, user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { telegram_id, name, username } = req.body;
    
    if (!telegram_id) {
      return res.status(400).json({ error: 'telegram_id is required' });
    }

    const { user, token } = await userController.loginUser(telegram_id, name || 'User', username);
    res.json({ success: true, user, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

router.post('/telegram-auth', async (req, res) => {
  try {
    const { initData, ...telegramData } = req.body;
    
    let userData;
    
    if (initData) {
      userData = verifyTelegramAuth(initData);
    } else if (telegramData.id && telegramData.hash) {
      const params = new URLSearchParams();
      Object.entries(telegramData).forEach(([key, value]) => {
        params.append(key, String(value));
      });
      userData = verifyTelegramAuth(params.toString());
    }

    if (!userData) {
      return res.status(401).json({ error: 'Invalid Telegram authentication' });
    }

    const user = await userController.getOrCreateUser(
      userData.telegram_id,
      userData.name || 'User',
      userData.username
    );
    
    const token = generateToken(user);
    res.json({ success: true, user, token });
  } catch (error) {
    console.error('Telegram auth error:', error);
    res.status(500).json({ error: 'Telegram authentication failed' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await userController.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

router.put('/me', authenticateToken, async (req, res) => {
  try {
    const { timezone, currency } = req.body;
    const user = await userController.updateUser(req.user.id, { timezone, currency });
    res.json({ success: true, user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      await query(
        'INSERT INTO user_preferences (user_id) VALUES ($1)',
        [req.user.id]
      );
      const newResult = await query(
        'SELECT * FROM user_preferences WHERE user_id = $1',
        [req.user.id]
      );
      return res.json({ success: true, preferences: newResult.rows[0] });
    }
    
    res.json({ success: true, preferences: result.rows[0] });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const { daily_reminder, reminder_time, weekly_summary, monthly_report, budget_alerts } = req.body;
    
    const result = await query(
      `INSERT INTO user_preferences (user_id, daily_reminder, reminder_time, weekly_summary, monthly_report, budget_alerts)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET
         daily_reminder = COALESCE($2, user_preferences.daily_reminder),
         reminder_time = COALESCE($3, user_preferences.reminder_time),
         weekly_summary = COALESCE($4, user_preferences.weekly_summary),
         monthly_report = COALESCE($5, user_preferences.monthly_report),
         budget_alerts = COALESCE($6, user_preferences.budget_alerts),
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user.id, daily_reminder, reminder_time, weekly_summary, monthly_report, budget_alerts]
    );
    
    res.json({ success: true, preferences: result.rows[0] });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;