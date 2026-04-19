import express from 'express';
import * as transactionController from '../controllers/transactionController.js';
import * as parser from '../services/parser.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/parse', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const parsed = await parser.parseTransaction(message);
    
    // Handle array (single or multiple transactions)
    const txList = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
    
    if (txList.length === 0 || txList[0].amount === 0) {
      return res.status(400).json({ 
        error: 'Could not parse transaction. Please specify the amount clearly.' 
      });
    }

    res.json({ success: true, data: parsed });
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({ error: 'Failed to parse transaction' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { amount, type, category, description, date } = req.body;
    const userId = req.user.id;

    if (!amount || !type || !category) {
      return res.status(400).json({ error: 'amount, type, and category are required' });
    }

    const transaction = await transactionController.createTransaction(userId, {
      amount,
      type,
      category,
      description,
      date: date || new Date().toISOString().split('T')[0]
    });

    // Emit real-time update to the user
    const io = req.app.get('io');
    io.to(`user-${userId}`).emit('transaction-created', transaction);

    res.json({ success: true, transaction });
  } catch (error) {
    console.error('Create transaction error:', error);
    if (error.message.includes('Upgrade ke Pro')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, type, category, search, limit, offset } = req.query;

    const transactions = await transactionController.getTransactions(userId, {
      startDate,
      endDate,
      type,
      category,
      search,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    });

    res.json({ success: true, transactions });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const stats = await transactionController.getTransactionStats(
      userId, 
      startDate || new Date().toISOString().split('T')[0],
      endDate || new Date().toISOString().split('T')[0]
    );

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

router.get('/compare', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const comparison = await transactionController.getComparisonStats(userId);
    res.json({ success: true, comparison });
  } catch (error) {
    console.error('Get comparison error:', error);
    res.status(500).json({ error: 'Failed to get comparison stats' });
  }
});

router.get('/daily-trend', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days } = req.query;
    const trend = await transactionController.getDailyTrend(userId, days ? parseInt(days) : 30);
    res.json({ success: true, trend });
  } catch (error) {
    console.error('Get daily trend error:', error);
    res.status(500).json({ error: 'Failed to get daily trend' });
  }
});

router.get('/monthly/:year/:month', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { year, month } = req.params;

    const stats = await transactionController.getMonthlyStats(userId, parseInt(year), parseInt(month));

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Get monthly stats error:', error);
    res.status(500).json({ error: 'Failed to get monthly stats' });
  }
});

router.get('/history/:year', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { year } = req.params;

    const stats = await transactionController.getLastNMonthsStats(userId, 12);

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const transaction = await transactionController.getTransactionById(id, userId);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ success: true, transaction });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Failed to get transaction' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { amount, type, category_id, description, date } = req.body;

    const transaction = await transactionController.updateTransaction(id, userId, {
      amount, type, category_id, description, date
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ success: true, transaction });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const transaction = await transactionController.deleteTransaction(id, userId);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ success: true, message: 'Transaction deleted', transaction });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

export default router;