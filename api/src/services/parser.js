/**
 * Transaction Parser for FinChat
 * Strategy: Hybrid System = Preprocessing (deterministic) + LLM Classification
 * 
 * - Preprocessing: normalize, extract segment, amount, clean description
 * - LLM: only classify type & category
 * - Support multi-transaction
 */

import 'dotenv/config';

const CATEGORIES = [
  'Makanan & Minuman',
  'Transportasi',
  'Belanja',
  'Hiburan',
  'Kesehatan',
  'Tagihan',
  'Gaji',
  'Investasi',
  'Lainnya'
];

const INCOME_KEYWORDS = ['gaji', 'bonus', 'jual', 'transfer masuk', 'dapat', 'terima', 'uang masuk', 'pembayaran', 'profit', 'dividen', 'thr', 'commission', 'komisi'];

// ============================================
// PREPROCESSING FUNCTIONS (Deterministic)
// ============================================

function normalize(text) {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .replace(/rb|ribu|rebu|rbu/gi, '000')
    .replace(/jt|juta/gi, '000000')
    .replace(/(\d+)k(?!\w)/g, (_, n) => n + '000')
    .replace(/(\d+),(\d{3})/g, '$1$2')
    .replace(/(\d{1,3})\.(\d{3})/g, '$1$2')
    .replace(/[^\w\s\d]/g, ' ')
    .replace(/\b(tadi|wkwk|abis|lah|dong|kena|gue|gui|sya|aku|lo|lu|yang|nya|deh|neh|buat|untuk)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSegments(text) {
  const separators = /\s*(?:dan|&|\+|,)\s*|\s+terus\s+/i;
  const parts = text.split(separators);
  return parts.filter(p => /\d/.test(p));
}

function extractAmount(segment) {
  if (!segment) return 0;
  
  const matches = segment.match(/\d+/g);
  if (!matches) return 0;
  
  const numStr = matches.join('');
  const amount = parseInt(numStr, 10);
  
  if (amount < 100 || amount > 10000000000) return 0;
  if (amount < 1000) return amount * 1000;
  
  return amount;
}

function cleanDescription(segment) {
  if (!segment) return 'Transaksi';
  
  let desc = segment.replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
  if (desc) desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  
  return desc || 'Transaksi';
}

function quickDetectType(text) {
  const lower = text.toLowerCase();
  for (const kw of INCOME_KEYWORDS) {
    if (lower.includes(kw)) return 'income';
  }
  return 'expense';
}

// ============================================
// LLM CLASSIFICATION (Groq → OpenRouter → Gemini)
// ============================================

async function classifyWithLLM(segment) {
  const prompt = `Klasifikasi: {"type":"expense|income","category":"X"}

Rules:
- income: gaji, bonus, jual, transfer masuk, dapat, terima
- selain itu expense
- category: ${CATEGORIES.join(', ')} atau "Lainnya"

Input: "${segment}"
Output:`;

  // Try Groq first
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 64
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          const match = text.match(/\{[^}]+\}/);
          if (match) {
            console.log(`🤖 Groq: ${match[0]}`);
            return JSON.parse(match[0]);
          }
        }
      }
    } catch (e) { console.log(`⚠️ Groq: ${e.message}`); }
  }

  // Try OpenRouter
  const orKey = process.env.OPENROUTER_API_KEY;
  if (orKey) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${orKey}`, 'HTTP-Referer': 'https://finchat.id', 'X-Title': 'FinChat' },
        body: JSON.stringify({ model: 'deepseek/deepseek-chat', messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 64 })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          const match = text.match(/\{[^}]+\}/);
          if (match) {
            console.log(`🤖 OpenRouter: ${match[0]}`);
            return JSON.parse(match[0]);
          }
        }
      }
    } catch (e) { console.log(`⚠️ OpenRouter: ${e.message}`); }
  }

  // Try Gemini (for complex)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
      const version = model.includes('2.0') || model.includes('2.5') ? 'v1' : 'v1beta';
      const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${geminiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 64 } })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const match = text.match(/\{[^}]+\}/);
          if (match) {
            console.log(`🤖 Gemini: ${match[0]}`);
            return JSON.parse(match[0]);
          }
        }
      }
    } catch (e) { console.log(`⚠️ Gemini: ${e.message}`); }
  }

  return null;
}

// ============================================
// MAIN PARSER
// ============================================

export async function parseTransaction(message, userId = null) {
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return null;
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    // Step 1: Normalize
    const normalized = normalize(message);
    console.log(`📝 Normalized: "${message}" → "${normalized}"`);
    
    if (!normalized) return null;

    // Step 2: Extract segments (multi-transaction)
    const segments = extractSegments(normalized);
    console.log(`📝 Segments: ${segments.length}`);

    if (segments.length === 0) return null;

    // Step 3: Process each segment
    const transactions = [];
    
    for (const segment of segments) {
      // 3a: Extract amount
      const amount = extractAmount(segment);
      if (amount === 0) continue;

      // 3b: Clean description
      const description = cleanDescription(segment);

      // 3c: Quick type detection
      let type = quickDetectType(segment);
      let category = 'Lainnya';

      // 3d: LLM classification
      const llmResult = await classifyWithLLM(segment);
      
      if (llmResult) {
        type = llmResult.type || type;
        category = llmResult.category || 'Lainnya';
      } else {
        // Fallback: use deterministic category based on keywords
        const lower = segment.toLowerCase();
        if (lower.includes('makan') || lower.includes('kopi') || lower.includes('minum') || lower.includes('food') || lower.includes('cafe')) category = 'Makanan & Minuman';
        else if (lower.includes('parkir') || lower.includes('tol') || lower.includes('bensin') || lower.includes('ojek') || lower.includes('gojek') || lower.includes('grab') || lower.includes('transport')) category = 'Transportasi';
        else if (lower.includes('beli') || lower.includes('shop') || lower.includes('tokopedia') || lower.includes('shopee')) category = 'Belanja';
        else if (lower.includes('nonton') || lower.includes('game') || lower.includes('netflix') || lower.includes('spotify')) category = 'Hiburan';
        else if (lower.includes('obat') || lower.includes('dokter') || lower.includes('rumah sakit') || lower.includes('apotek')) category = 'Kesehatan';
        else if (lower.includes('listrik') || lower.includes('wifi') || lower.includes('air') || lower.includes('pulsa') || lower.includes('tagihan')) category = 'Tagihan';
        else if (lower.includes('gaji') || lower.includes('thr') || lower.includes('bonus')) category = 'Gaji';
        else if (lower.includes('invest') || lower.includes('saham') || lower.includes('crypto')) category = 'Investasi';
      }

      transactions.push({
        type,
        amount,
        category: CATEGORIES.includes(category) ? category : 'Lainnya',
        description,
        date: today,
        parsedBy: llmResult ? 'hybrid' : 'deterministic'
      });
    }

    if (transactions.length === 0) return null;

    console.log(`✅ Parsed ${transactions.length} transaction(s)`);
    return transactions.length === 1 ? transactions[0] : transactions;

  } catch (error) {
    console.error(`❌ Parse error: ${error.message}`);
    return null;
  }
}

export { CATEGORIES };