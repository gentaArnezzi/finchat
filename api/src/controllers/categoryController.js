import { query } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

export const getCategories = async (userId) => {
  const result = await query(
    `SELECT * FROM categories WHERE user_id = $1 OR is_default = true ORDER BY is_default DESC, name`,
    [userId]
  );
  return result.rows;
};

export const getCategoryByName = async (name, userId) => {
  const result = await query(
    `SELECT * FROM categories WHERE name = $1 AND (user_id = $2 OR is_default = true)`,
    [name, userId]
  );
  return result.rows[0];
};

export const createCategory = async (userId, data) => {
  const { name, icon, color } = data;
  const id = uuidv4();
  
  const result = await query(
    `INSERT INTO categories (id, name, icon, color, is_default, user_id)
     VALUES ($1, $2, $3, $4, false, $5)
     RETURNING *`,
    [id, name, icon || '📦', color || '#DFE6E9', userId]
  );
  
  return result.rows[0];
};

export const updateCategory = async (id, userId, updates) => {
  const fields = [];
  const values = [];
  let paramCount = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (['name', 'icon', 'color'].includes(key)) {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
  }

  if (fields.length === 0) return null;

  values.push(id, userId);

  const result = await query(
    `UPDATE categories SET ${fields.join(', ')} 
     WHERE id = $${paramCount} AND user_id = $${paramCount + 1} AND is_default = false
     RETURNING *`,
    values
  );

  return result.rows[0];
};

export const deleteCategory = async (id, userId) => {
  const result = await query(
    `DELETE FROM categories WHERE id = $1 AND user_id = $2 AND is_default = false RETURNING *`,
    [id, userId]
  );
  return result.rows[0];
};