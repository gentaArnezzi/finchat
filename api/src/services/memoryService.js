/**
 * Conversation Memory Service
 * Stores user conversation context in PostgreSQL for LLM memory
 */

import { query } from './db.js';

const DEFAULT_CONTEXT_LIMIT = 10; // Last 10 messages

/**
 * Save user message to conversation history
 */
export async function saveMessage(userId, role, content, metadata = {}) {
  try {
    const result = await query(
      `INSERT INTO conversation_memory (user_id, role, content, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [userId, role, content, JSON.stringify(metadata)]
    );
    return result.rows[0];
  } catch (error) {
    console.error('❌ Failed to save message:', error.message);
    return null;
  }
}

/**
 * Get conversation history for a user
 */
export async function getConversationHistory(userId, limit = DEFAULT_CONTEXT_LIMIT) {
  try {
    const result = await query(
      `SELECT role, content, created_at 
       FROM conversation_memory 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows.reverse(); // Return in chronological order
  } catch (error) {
    console.error('❌ Failed to get conversation history:', error.message);
    return [];
  }
}

/**
 * Get conversation context for LLM prompt
 */
export async function getContextForLLM(userId, limit = DEFAULT_CONTEXT_LIMIT) {
  const history = await getConversationHistory(userId, limit);
  if (!history || history.length === 0) {
    return '';
  }
  
  return history.map(msg => 
    `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
  ).join('\n');
}

/**
 * Clear conversation history for a user
 */
export async function clearConversationHistory(userId) {
  try {
    await query(
      `DELETE FROM conversation_memory WHERE user_id = $1`,
      [userId]
    );
    return true;
  } catch (error) {
    console.error('❌ Failed to clear conversation history:', error.message);
    return false;
  }
}

/**
 * Get last N transactions for context
 */
export async function getRecentTransactionsContext(userId, limit = 5) {
  try {
    const result = await query(
      `SELECT type, amount, category, description, date 
       FROM transactions 
       WHERE user_id = $1 
       ORDER BY date DESC, created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  } catch (error) {
    console.error('❌ Failed to get recent transactions:', error.message);
    return [];
  }
}