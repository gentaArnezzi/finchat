import { query } from '../db.js';
import { generateToken } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

export const getOrCreateUser = async (telegramId, name, username = null) => {
  try {
    let result = await query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [telegramId]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    const userId = uuidv4();
    result = await query(
      `INSERT INTO users (id, telegram_id, name, username) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [userId, telegramId, name, username]
    );

    await query(
      `INSERT INTO categories (name, icon, color, is_default, user_id)
       SELECT name, icon, color, false, $1 FROM categories WHERE is_default = true`,
      [userId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    throw error;
  }
};

export const getUserByTelegramId = async (telegramId) => {
  const result = await query(
    'SELECT * FROM users WHERE telegram_id = $1',
    [telegramId]
  );
  return result.rows[0];
};

export const getUserById = async (id) => {
  const result = await query(
    'SELECT id, telegram_id, name, username, timezone, currency, plan, created_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0];
};

export const updateUser = async (id, updates) => {
  const fields = [];
  const values = [];
  let paramCount = 1;

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = $${paramCount}`);
    values.push(value);
    paramCount++;
  }

  values.push(id);

  const result = await query(
    `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`,
    values
  );

  return result.rows[0];
};

export const registerUser = async (telegramId, name, username) => {
  return await getOrCreateUser(telegramId, name, username);
};

export const loginUser = async (telegramId, name, username = null) => {
  const user = await getOrCreateUser(telegramId, name, username);
  const token = generateToken(user);
  return { user, token };
};