import { query } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

export const getBudgets = async (userId, month, year) => {
  const result = await query(
    `SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color
     FROM budgets b
     LEFT JOIN categories c ON b.category_id = c.id
     WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3`,
    [userId, month, year]
  );
  return result.rows;
};

export const getBudgetByCategory = async (userId, categoryId, month, year) => {
  const result = await query(
    `SELECT * FROM budgets WHERE user_id = $1 AND category_id = $2 AND month = $3 AND year = $4`,
    [userId, categoryId, month, year]
  );
  return result.rows[0];
};

export const createOrUpdateBudget = async (userId, categoryId, amount, month, year) => {
  const existing = await getBudgetByCategory(userId, categoryId, month, year);
  
  if (existing) {
    const result = await query(
      `UPDATE budgets SET amount = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [amount, existing.id]
    );
    return result.rows[0];
  }
  
  const id = uuidv4();
  const result = await query(
    `INSERT INTO budgets (id, user_id, category_id, amount, month, year)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [id, userId, categoryId, amount, month, year]
  );
  return result.rows[0];
};

export const deleteBudget = async (id, userId) => {
  const result = await query(
    'DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING *',
    [id, userId]
  );
  return result.rows[0];
};

export const getBudgetSpending = async (userId, month, year) => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  // Get budgets with spending matched by category NAME (not ID)
  const result = await query(
    `SELECT 
       b.id as budget_id,
       b.amount as budget_amount,
       b.category_id,
       c.name as category_name,
       c.icon as category_icon,
       c.color as category_color,
       COALESCE(
         (SELECT SUM(t2.amount) FROM transactions t2
          JOIN categories c2 ON t2.category_id = c2.id
          WHERE t2.user_id = b.user_id 
            AND t2.type = 'expense'
            AND t2.date >= $2 AND t2.date <= $3
            AND c2.name = c.name), 0
       ) as spent
     FROM budgets b
     LEFT JOIN categories c ON b.category_id = c.id
     WHERE b.user_id = $1 AND b.month = $4 AND b.year = $5`,
    [userId, startDate, endDate, month, year]
  );

  return result.rows.map(row => ({
    ...row,
    budget_amount: parseFloat(row.budget_amount),
    spent: parseFloat(row.spent),
    remaining: parseFloat(row.budget_amount) - parseFloat(row.spent),
    percent_used: (parseFloat(row.spent) / parseFloat(row.budget_amount)) * 100
  }));
};