import express from 'express';
import * as budgetController from '../controllers/budgetController.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkFeatureAccess } from '../services/subscription.js';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: 'month and year are required' });
    }

    const budgets = await budgetController.getBudgets(userId, parseInt(month), parseInt(year));
    res.json({ success: true, budgets });
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({ error: 'Failed to get budgets' });
  }
});

router.get('/spending', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: 'month and year are required' });
    }

    const spending = await budgetController.getBudgetSpending(userId, parseInt(month), parseInt(year));
    res.json({ success: true, spending });
  } catch (error) {
    console.error('Get spending error:', error);
    res.status(500).json({ error: 'Failed to get spending' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category_id, amount, month, year } = req.body;

    if (!category_id || !amount || !month || !year) {
      return res.status(400).json({ error: 'category_id, amount, month, and year are required' });
    }

    // Check plan access for budget alerts
    const hasAccess = await checkFeatureAccess(userId, 'budget_alerts');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Fitur Budget hanya tersedia untuk plan Pro dan Premium. Upgrade sekarang!' });
    }

    const budget = await budgetController.createOrUpdateBudget(
      userId, 
      category_id, 
      parseFloat(amount), 
      parseInt(month), 
      parseInt(year)
    );
    res.json({ success: true, budget });
  } catch (error) {
    console.error('Create budget error:', error);
    res.status(500).json({ error: 'Failed to create budget' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { amount, month, year } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'amount is required' });
    }

    const result = await query(
      `UPDATE budgets SET amount = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3 RETURNING *`,
      [parseFloat(amount), id, userId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json({ success: true, budget: result.rows[0] });
  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

router.post('/copy', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.body;

    const targetMonth = parseInt(month);
    const targetYear = parseInt(year);

    let sourceMonth = targetMonth - 1;
    let sourceYear = targetYear;

    if (sourceMonth < 1) {
      sourceMonth = 12;
      sourceYear -= 1;
    }

    const sourceBudgets = await budgetController.getBudgets(userId, sourceMonth, sourceYear);

    const newBudgets = [];
    for (const b of sourceBudgets) {
      const existing = await budgetController.getBudgetByCategory(userId, b.category_id, targetMonth, targetYear);
      if (!existing) {
        const budget = await budgetController.createOrUpdateBudget(
          userId,
          b.category_id,
          b.amount,
          targetMonth,
          targetYear
        );
        newBudgets.push(budget);
      }
    }

    res.json({ success: true, budgets: newBudgets });
  } catch (error) {
    console.error('Copy budgets error:', error);
    res.status(500).json({ error: 'Failed to copy budgets' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const budget = await budgetController.deleteBudget(id, userId);
    
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json({ success: true, message: 'Budget deleted', budget });
  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

export default router;