import { query } from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { checkTransactionLimit } from '../services/subscription.js';

export const createTransaction = async (userId, data) => {
  const limitCheck = await checkTransactionLimit(userId);
  if (!limitCheck.allowed) {
    throw new Error('Upgrade ke Pro untuk mencatat lebih dari 50 transaksi per bulan.');
  }

  const { amount, type, category, description, date } = data;

  let categoryResult = await query(
    'SELECT id FROM categories WHERE name = $1 AND (user_id = $2 OR is_default = true)',
    [category, userId]
  );

  let categoryId;
  if (categoryResult.rows.length === 0) {
    const defaultCat = await query(
      "SELECT id FROM categories WHERE name = 'Lainnya' AND is_default = true"
    );
    categoryId = defaultCat.rows[0]?.id;
  } else {
    categoryId = categoryResult.rows[0].id;
  }

  const id = uuidv4();
  const result = await query(
    `INSERT INTO transactions (id, user_id, amount, type, category_id, description, date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, userId, amount, type, categoryId, description, date]
  );

  // Increment user's monthly tx count (for Free plan tracking)
  await query(
    `UPDATE users SET monthly_tx_count = COALESCE(monthly_tx_count, 0) + 1 WHERE id = $1`,
    [userId]
  );

  return result.rows[0];
};

export const getTransactions = async (userId, filters = {}) => {
  let sql = `
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = $1 AND (t.is_deleted IS NOT TRUE)
  `;
  const params = [userId];
  let paramCount = 1;

  if (filters.startDate) {
    paramCount++;
    sql += ` AND t.date >= $${paramCount}`;
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    paramCount++;
    sql += ` AND t.date <= $${paramCount}`;
    params.push(filters.endDate);
  }

  if (filters.type) {
    paramCount++;
    sql += ` AND t.type = $${paramCount}`;
    params.push(filters.type);
  }

  if (filters.category) {
    paramCount++;
    sql += ` AND c.name = $${paramCount}`;
    params.push(filters.category);
  }

  if (filters.search) {
    paramCount++;
    sql += ` AND t.description ILIKE $${paramCount}`;
    params.push(`%${filters.search}%`);
  }

  sql += ` ORDER BY t.date DESC, t.created_at DESC`;

  if (filters.limit) {
    paramCount++;
    sql += ` LIMIT $${paramCount}`;
    params.push(filters.limit);
  }

  if (filters.offset) {
    paramCount++;
    sql += ` OFFSET $${paramCount}`;
    params.push(filters.offset);
  }

  const result = await query(sql, params);
  return result.rows;
};

export const getTransactionById = async (id, userId) => {
  const result = await query(
    `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.id = $1 AND t.user_id = $2`,
    [id, userId]
  );
  return result.rows[0];
};

export const updateTransaction = async (id, userId, updates) => {
  const fields = [];
  const values = [];
  let paramCount = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (['amount', 'type', 'category_id', 'description', 'date'].includes(key)) {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
  }

  if (fields.length === 0) return null;

  values.push(id, userId);

  const result = await query(
    `UPDATE transactions SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $${paramCount} AND user_id = $${paramCount + 1} 
     RETURNING *`,
    values
  );

  return result.rows[0];
};

export const deleteTransaction = async (id, userId) => {
  // Soft delete - just mark as deleted, don't decrement count
  const result = await query(
    'UPDATE transactions SET is_deleted = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
    [id, userId]
  );
  return result.rows[0];
};

export const getTransactionStats = async (userId, startDate, endDate) => {
  const result = await query(
    `SELECT 
       type,
       SUM(amount) as total,
       COUNT(*) as count
     FROM transactions 
     WHERE user_id = $1 AND date >= $2 AND date <= $3 AND is_deleted IS NOT TRUE
     GROUP BY type`,
    [userId, startDate, endDate]
  );

  const stats = {
    income: { total: 0, count: 0 },
    expense: { total: 0, count: 0 }
  };

  result.rows.forEach(row => {
    stats[row.type] = {
      total: parseFloat(row.total) || 0,
      count: parseInt(row.count)
    };
  });

  return stats;
};

export const getMonthlyStats = async (userId, year, month) => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const result = await query(
    `SELECT 
       c.name as category,
       c.icon as icon,
       c.color as color,
       t.type,
       SUM(t.amount) as total,
       COUNT(*) as count
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
WHERE t.user_id = $1 AND t.date >= $2 AND t.date <= $3 AND t.is_deleted IS NOT TRUE
      GROUP BY c.name, c.icon, c.color, t.type
     ORDER BY total DESC`,
    [userId, startDate, endDate]
  );

  return result.rows;
};

export const getLastNMonthsStats = async (userId, n = 6) => {
  const result = await query(
    `SELECT 
       DATE_TRUNC('month', date) as month,
       type,
       SUM(amount) as total
     FROM transactions
WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '${n} months' AND is_deleted IS NOT TRUE
      GROUP BY DATE_TRUNC('month', date), type
     ORDER BY month`,
    [userId]
  );

  return result.rows;
};

export const getComparisonStats = async (userId) => {
  const now = new Date();
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const thisMonthEnd = now.toISOString().split('T')[0];

  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStart = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`;
  const prevMonthEnd = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-${new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate()}`;

  const [thisMonthRes, prevMonthRes] = await Promise.all([
    query(
      `SELECT type, SUM(amount) as total, COUNT(*) as count
       FROM transactions WHERE user_id = $1 AND date >= $2 AND date <= $3 AND is_deleted IS NOT TRUE
       GROUP BY type`,
      [userId, thisMonthStart, thisMonthEnd]
    ),
    query(
      `SELECT type, SUM(amount) as total, COUNT(*) as count
       FROM transactions WHERE user_id = $1 AND date >= $2 AND date <= $3 AND is_deleted IS NOT TRUE
       GROUP BY type`,
      [userId, prevMonthStart, prevMonthEnd]
    )
  ]);

  const parseStats = (rows) => {
    const stats = { income: { total: 0, count: 0 }, expense: { total: 0, count: 0 } };
    rows.forEach(r => {
      stats[r.type] = { total: parseFloat(r.total) || 0, count: parseInt(r.count) };
    });
    return stats;
  };

  const current = parseStats(thisMonthRes.rows);
  const previous = parseStats(prevMonthRes.rows);

  const expenseChange = previous.expense.total > 0
    ? ((current.expense.total - previous.expense.total) / previous.expense.total) * 100
    : current.expense.total > 0 ? 100 : 0;

  const incomeChange = previous.income.total > 0
    ? ((current.income.total - previous.income.total) / previous.income.total) * 100
    : current.income.total > 0 ? 100 : 0;

  return {
    current,
    previous,
    expenseChange: Math.round(expenseChange * 10) / 10,
    incomeChange: Math.round(incomeChange * 10) / 10
  };
};

export const getDailyTrend = async (userId, days = 30) => {
  const result = await query(
    `SELECT 
       date,
       type,
       SUM(amount) as total
     FROM transactions
WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '${days} days' AND is_deleted IS NOT TRUE
      GROUP BY date, type
     ORDER BY date`,
    [userId]
  );

  return result.rows;
};