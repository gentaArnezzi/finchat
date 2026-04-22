import express from 'express';
import { authenticateAdmin } from '../middleware/adminAuth.js';
import { query } from '../db.js';

const router = express.Router();

// All admin routes require admin auth
router.use(authenticateAdmin);

// ============================================
// DASHBOARD STATS
// ============================================

/**
 * GET /api/admin/stats — Overview dashboard stats
 */
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthStartStr = lastMonthStart.toISOString().split('T')[0];
    const lastMonthEndStr = lastMonthEnd.toISOString().split('T')[0];

    const [
      totalUsersResult,
      newUsersThisMonthResult,
      newUsersLastMonthResult,
      totalRevenueResult,
      revenueThisMonthResult,
      totalTransactionsResult,
      transactionsThisMonthResult,
      activeSubscribersResult,
      planDistributionResult,
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM users WHERE created_at >= $1', [currentMonthStart]),
      query('SELECT COUNT(*) as count FROM users WHERE created_at >= $1 AND created_at <= $2', [lastMonthStartStr, lastMonthEndStr]),
      query("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'paid'"),
      query("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'paid' AND paid_at >= $1", [currentMonthStart]),
      query('SELECT COUNT(*) as count FROM transactions'),
      query('SELECT COUNT(*) as count FROM transactions WHERE created_at >= $1', [currentMonthStart]),
      query("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active' AND plan != 'free' AND (expires_at IS NULL OR expires_at > NOW())"),
      query("SELECT plan, COUNT(*) as count FROM users GROUP BY plan ORDER BY count DESC"),
    ]);

    const totalUsers = parseInt(totalUsersResult.rows[0].count);
    const newUsersThisMonth = parseInt(newUsersThisMonthResult.rows[0].count);
    const newUsersLastMonth = parseInt(newUsersLastMonthResult.rows[0].count);
    const userGrowthPercent = newUsersLastMonth > 0
      ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth * 100).toFixed(1)
      : newUsersThisMonth > 0 ? 100 : 0;

    res.json({
      success: true,
      stats: {
        totalUsers,
        newUsersThisMonth,
        userGrowthPercent: parseFloat(userGrowthPercent),
        totalRevenue: parseFloat(totalRevenueResult.rows[0].total),
        revenueThisMonth: parseFloat(revenueThisMonthResult.rows[0].total),
        totalTransactions: parseInt(totalTransactionsResult.rows[0].count),
        transactionsThisMonth: parseInt(transactionsThisMonthResult.rows[0].count),
        activeSubscribers: parseInt(activeSubscribersResult.rows[0].count),
        planDistribution: planDistributionResult.rows.map(r => ({
          plan: r.plan || 'free',
          count: parseInt(r.count)
        })),
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

/**
 * GET /api/admin/charts — Monthly aggregated data for charts
 */
router.get('/charts', async (req, res) => {
  try {
    const months = Math.min(24, Math.max(3, parseInt(req.query.months) || 12));

    const [userGrowthResult, revenueResult, transactionResult] = await Promise.all([
      query(
        `SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
         FROM users
         WHERE created_at >= NOW() - INTERVAL '${months} months'
         GROUP BY month ORDER BY month ASC`
      ),
      query(
        `SELECT TO_CHAR(paid_at, 'YYYY-MM') as month, SUM(amount) as total
         FROM payments
         WHERE status = 'paid' AND paid_at >= NOW() - INTERVAL '${months} months'
         GROUP BY month ORDER BY month ASC`
      ),
      query(
        `SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
         FROM transactions
         WHERE created_at >= NOW() - INTERVAL '${months} months'
         GROUP BY month ORDER BY month ASC`
      ),
    ]);

    const monthLabels = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      monthLabels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const userGrowthMap = Object.fromEntries(userGrowthResult.rows.map(r => [r.month, parseInt(r.count)]));
    const revenueMap = Object.fromEntries(revenueResult.rows.map(r => [r.month, parseFloat(r.total)]));
    const transactionMap = Object.fromEntries(transactionResult.rows.map(r => [r.month, parseInt(r.count)]));

    res.json({
      success: true,
      charts: {
        months: monthLabels,
        userGrowth: monthLabels.map(m => userGrowthMap[m] || 0),
        revenue: monthLabels.map(m => revenueMap[m] || 0),
        transactions: monthLabels.map(m => transactionMap[m] || 0),
      }
    });
  } catch (error) {
    console.error('Admin charts error:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

// ============================================
// USERS CRUD
// ============================================

/**
 * GET /api/admin/users — Paginated user list
 */
router.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const planFilter = req.query.plan || '';
    const sortBy = ['created_at', 'name', 'plan', 'transaction_count'].includes(req.query.sort) ? req.query.sort : 'created_at';
    const sortOrder = req.query.order === 'asc' ? 'ASC' : 'DESC';

    let whereConditions = [];
    const params = [limit, offset];
    let paramIdx = 3;

    if (search) {
      whereConditions.push(`(u.name ILIKE $${paramIdx} OR u.username ILIKE $${paramIdx} OR u.telegram_id::TEXT ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (planFilter) {
      whereConditions.push(`u.plan = $${paramIdx}`);
      params.push(planFilter);
      paramIdx++;
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const orderByColumn = sortBy === 'transaction_count' ? 'transaction_count' : `u.${sortBy}`;

    const [usersResult, countResult] = await Promise.all([
      query(
        `SELECT u.id, u.telegram_id, u.name, u.username, u.plan, u.timezone, u.created_at, u.updated_at,
                COUNT(t.id) as transaction_count,
                MAX(t.created_at) as last_transaction_at
         FROM users u
         LEFT JOIN transactions t ON t.user_id = u.id
         ${whereClause}
         GROUP BY u.id
         ORDER BY ${orderByColumn} ${sortOrder}
         LIMIT $1 OFFSET $2`,
        params
      ),
      query(
        `SELECT COUNT(*) as count FROM users u ${whereClause}`,
        params.slice(2)
      ),
    ]);

    res.json({
      success: true,
      users: usersResult.rows.map(u => ({ ...u, transaction_count: parseInt(u.transaction_count) })),
      pagination: {
        page, limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      }
    });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/admin/users/:id — Get single user detail
 */
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userResult = await query(
      `SELECT u.*, COUNT(t.id) as transaction_count,
              COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expense,
              COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income
       FROM users u
       LEFT JOIN transactions t ON t.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const subResult = await query(
      `SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [id]
    );

    res.json({
      success: true,
      user: {
        ...userResult.rows[0],
        transaction_count: parseInt(userResult.rows[0].transaction_count),
        total_expense: parseFloat(userResult.rows[0].total_expense),
        total_income: parseFloat(userResult.rows[0].total_income),
      },
      subscriptions: subResult.rows
    });
  } catch (error) {
    console.error('Admin get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * PUT /api/admin/users/:id — Update user (plan, name, timezone)
 */
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { plan, name, timezone } = req.body;

    const updates = [];
    const params = [];
    let paramIdx = 1;

    if (plan !== undefined) {
      if (!['free', 'pro', 'business'].includes(plan)) {
        return res.status(400).json({ error: 'Invalid plan. Must be free, pro, or business.' });
      }
      updates.push(`plan = $${paramIdx}`);
      params.push(plan);
      paramIdx++;
    }
    if (name !== undefined) {
      updates.push(`name = $${paramIdx}`);
      params.push(name);
      paramIdx++;
    }
    if (timezone !== undefined) {
      updates.push(`timezone = $${paramIdx}`);
      params.push(timezone);
      paramIdx++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If plan changed, handle subscription
    if (plan && plan !== 'free') {
      // Deactivate old subscriptions
      await query("UPDATE subscriptions SET status = 'expired', updated_at = NOW() WHERE user_id = $1 AND status = 'active'", [id]);
      // Create new admin-granted subscription
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 10); // Admin grant = effectively permanent
      await query(
        `INSERT INTO subscriptions (id, user_id, plan, status, started_at, expires_at, billing_period)
         VALUES (gen_random_uuid(), $1, $2, 'active', NOW(), $3, 'admin')`,
        [id, plan, expiresAt.toISOString()]
      );
    } else if (plan === 'free') {
      // Deactivate all subscriptions
      await query("UPDATE subscriptions SET status = 'expired', updated_at = NOW() WHERE user_id = $1 AND status = 'active'", [id]);
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/admin/users/:id — Delete user and all related data
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check user exists
    const userResult = await query('SELECT id, name, telegram_id FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // CASCADE will handle related tables, but let's be explicit for audit
    const txCount = await query('SELECT COUNT(*) as count FROM transactions WHERE user_id = $1', [id]);

    await query('DELETE FROM users WHERE id = $1', [id]);

    res.json({
      success: true,
      message: `User ${userResult.rows[0].name} deleted`,
      deletedTransactions: parseInt(txCount.rows[0].count)
    });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ============================================
// TRANSACTIONS MANAGEMENT
// ============================================

/**
 * GET /api/admin/transactions — All transactions across users
 */
router.get('/transactions', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const type = req.query.type || '';
    const userId = req.query.userId || '';

    let whereConditions = [];
    const params = [limit, offset];
    let paramIdx = 3;

    if (search) {
      whereConditions.push(`(t.description ILIKE $${paramIdx} OR u.name ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (type && ['income', 'expense'].includes(type)) {
      whereConditions.push(`t.type = $${paramIdx}`);
      params.push(type);
      paramIdx++;
    }
    if (userId) {
      whereConditions.push(`t.user_id = $${paramIdx}`);
      params.push(userId);
      paramIdx++;
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const [txResult, countResult] = await Promise.all([
      query(
        `SELECT t.*, u.name as user_name, u.username as user_username, c.name as category_name
         FROM transactions t
         JOIN users u ON t.user_id = u.id
         LEFT JOIN categories c ON t.category_id = c.id
         ${whereClause}
         ORDER BY t.created_at DESC
         LIMIT $1 OFFSET $2`,
        params
      ),
      query(
        `SELECT COUNT(*) as count FROM transactions t
         JOIN users u ON t.user_id = u.id
         ${whereClause}`,
        params.slice(2)
      ),
    ]);

    res.json({
      success: true,
      transactions: txResult.rows,
      pagination: {
        page, limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      }
    });
  } catch (error) {
    console.error('Admin transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * DELETE /api/admin/transactions/:id — Delete any transaction
 */
router.delete('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `DELETE FROM transactions WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ success: true, message: 'Transaction deleted', transaction: result.rows[0] });
  } catch (error) {
    console.error('Admin delete transaction error:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// ============================================
// PAYMENTS MANAGEMENT
// ============================================

/**
 * GET /api/admin/payments — Paginated payment list
 */
router.get('/payments', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const status = req.query.status || '';

    let whereConditions = [];
    const params = [limit, offset];
    let paramIdx = 3;

    if (status) {
      whereConditions.push(`p.status = $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const [paymentsResult, countResult] = await Promise.all([
      query(
        `SELECT p.*, u.name as user_name, u.username as user_username, u.telegram_id
         FROM payments p
         JOIN users u ON p.user_id = u.id
         ${whereClause}
         ORDER BY p.created_at DESC
         LIMIT $1 OFFSET $2`,
        params
      ),
      query(`SELECT COUNT(*) as count FROM payments p ${whereClause}`, params.slice(2)),
    ]);

    res.json({
      success: true,
      payments: paymentsResult.rows,
      pagination: {
        page, limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      }
    });
  } catch (error) {
    console.error('Admin payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

/**
 * PUT /api/admin/payments/:id — Update payment status
 */
router.put('/payments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'paid', 'failed', 'refunded'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await query(
      `UPDATE payments SET status = $1, paid_at = CASE WHEN $1 = 'paid' THEN NOW() ELSE paid_at END, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // If marking as paid, activate the subscription
    const payment = result.rows[0];
    if (status === 'paid') {
      await query("UPDATE subscriptions SET status = 'expired', updated_at = NOW() WHERE user_id = $1 AND status = 'active'", [payment.user_id]);
      const expiresAt = new Date();
      if (payment.billing_period === 'tahunan') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      }
      await query(
        `INSERT INTO subscriptions (id, user_id, plan, status, payment_id, started_at, expires_at, billing_period)
         VALUES (gen_random_uuid(), $1, $2, 'active', $3, NOW(), $4, $5)`,
        [payment.user_id, payment.plan, payment.id, expiresAt.toISOString(), payment.billing_period || 'bulanan']
      );
      await query('UPDATE users SET plan = $1, updated_at = NOW() WHERE id = $2', [payment.plan, payment.user_id]);
    }

    res.json({ success: true, payment: result.rows[0] });
  } catch (error) {
    console.error('Admin update payment error:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// ============================================
// SUBSCRIPTIONS MANAGEMENT
// ============================================

/**
 * GET /api/admin/subscriptions — All subscriptions
 */
router.get('/subscriptions', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const status = req.query.status || '';

    let whereConditions = [];
    const params = [limit, offset];
    let paramIdx = 3;

    if (status) {
      whereConditions.push(`s.status = $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const [subsResult, countResult] = await Promise.all([
      query(
        `SELECT s.*, u.name as user_name, u.username as user_username, u.telegram_id
         FROM subscriptions s
         JOIN users u ON s.user_id = u.id
         ${whereClause}
         ORDER BY s.created_at DESC
         LIMIT $1 OFFSET $2`,
        params
      ),
      query(`SELECT COUNT(*) as count FROM subscriptions s ${whereClause}`, params.slice(2)),
    ]);

    res.json({
      success: true,
      subscriptions: subsResult.rows,
      pagination: {
        page, limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      }
    });
  } catch (error) {
    console.error('Admin subscriptions error:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

/**
 * PUT /api/admin/subscriptions/:id — Update subscription status
 */
router.put('/subscriptions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, expires_at } = req.body;

    if (status && !['active', 'expired', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updates = [];
    const params = [];
    let paramIdx = 1;

    if (status) {
      updates.push(`status = $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }
    if (expires_at) {
      updates.push(`expires_at = $${paramIdx}`);
      params.push(expires_at);
      paramIdx++;
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    const result = await query(
      `UPDATE subscriptions SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Sync user plan if deactivating
    const sub = result.rows[0];
    if (status === 'expired' || status === 'cancelled') {
      const activeSub = await query(
        "SELECT plan FROM subscriptions WHERE user_id = $1 AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY created_at DESC LIMIT 1",
        [sub.user_id]
      );
      const newPlan = activeSub.rows[0]?.plan || 'free';
      await query('UPDATE users SET plan = $1, updated_at = NOW() WHERE id = $2', [newPlan, sub.user_id]);
    }

    res.json({ success: true, subscription: result.rows[0] });
  } catch (error) {
    console.error('Admin update subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

export default router;
