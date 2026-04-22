import express from 'express';
import { authenticateAdmin } from '../middleware/adminAuth.js';
import { query } from '../db.js';

const router = express.Router();

// All admin routes require admin auth
router.use(authenticateAdmin);

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

    // Run all queries in parallel
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
      // Total users
      query('SELECT COUNT(*) as count FROM users'),
      // New users this month
      query('SELECT COUNT(*) as count FROM users WHERE created_at >= $1', [currentMonthStart]),
      // New users last month
      query('SELECT COUNT(*) as count FROM users WHERE created_at >= $1 AND created_at <= $2', [lastMonthStartStr, lastMonthEndStr]),
      // Total revenue (paid payments)
      query("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'paid'"),
      // Revenue this month
      query("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'paid' AND paid_at >= $1", [currentMonthStart]),
      // Total transactions
      query('SELECT COUNT(*) as count FROM transactions'),
      // Transactions this month
      query('SELECT COUNT(*) as count FROM transactions WHERE created_at >= $1', [currentMonthStart]),
      // Active paid subscribers
      query("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active' AND plan != 'free' AND (expires_at IS NULL OR expires_at > NOW())"),
      // Plan distribution
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
 * GET /api/admin/users — Paginated user list
 */
router.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let whereClause = '';
    const params = [limit, offset];

    if (search) {
      whereClause = 'WHERE u.name ILIKE $3 OR u.username ILIKE $3 OR u.telegram_id::TEXT ILIKE $3';
      params.push(`%${search}%`);
    }

    const [usersResult, countResult] = await Promise.all([
      query(
        `SELECT u.id, u.telegram_id, u.name, u.username, u.plan, u.created_at, u.updated_at,
                COUNT(t.id) as transaction_count,
                MAX(t.created_at) as last_transaction_at
         FROM users u
         LEFT JOIN transactions t ON t.user_id = u.id
         ${whereClause}
         GROUP BY u.id
         ORDER BY u.created_at DESC
         LIMIT $1 OFFSET $2`,
        params
      ),
      query(`SELECT COUNT(*) as count FROM users u ${whereClause}`, search ? [`%${search}%`] : []),
    ]);

    res.json({
      success: true,
      users: usersResult.rows.map(u => ({
        ...u,
        transaction_count: parseInt(u.transaction_count),
      })),
      pagination: {
        page,
        limit,
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
 * GET /api/admin/payments — Paginated payment list
 */
router.get('/payments', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [paymentsResult, countResult] = await Promise.all([
      query(
        `SELECT p.*, u.name as user_name, u.username as user_username, u.telegram_id
         FROM payments p
         JOIN users u ON p.user_id = u.id
         ORDER BY p.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      query('SELECT COUNT(*) as count FROM payments'),
    ]);

    res.json({
      success: true,
      payments: paymentsResult.rows,
      pagination: {
        page,
        limit,
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
 * GET /api/admin/charts — Monthly aggregated data for charts
 */
router.get('/charts', async (req, res) => {
  try {
    const months = Math.min(24, Math.max(3, parseInt(req.query.months) || 12));

    const [userGrowthResult, revenueResult, transactionResult] = await Promise.all([
      // User signups per month
      query(
        `SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
         FROM users
         WHERE created_at >= NOW() - INTERVAL '${months} months'
         GROUP BY month
         ORDER BY month ASC`
      ),
      // Revenue per month
      query(
        `SELECT TO_CHAR(paid_at, 'YYYY-MM') as month, SUM(amount) as total
         FROM payments
         WHERE status = 'paid' AND paid_at >= NOW() - INTERVAL '${months} months'
         GROUP BY month
         ORDER BY month ASC`
      ),
      // Transactions per month
      query(
        `SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
         FROM transactions
         WHERE created_at >= NOW() - INTERVAL '${months} months'
         GROUP BY month
         ORDER BY month ASC`
      ),
    ]);

    // Build complete month range with zero-fills
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

export default router;
