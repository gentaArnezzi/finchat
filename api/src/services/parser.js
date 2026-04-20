/**
 * Transaction Parser for FinChat
 * Strategy: Hybrid System = Preprocessing (deterministic) + LLM Classification
 * Production-grade with validation & fallback
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
// PREPROCESSING (Deterministic)
// ============================================

function normalize(text) {
  if (!text) return '';
  
  // Step 1: Replace rb/jt/etc dulu
  let normalized = text
    .toLowerCase()
    .replace(/rb|ribu|rebu|rbu/gi, '000')
    .replace(/jt|juta/gi, '000000')
    .replace(/(\d+)k(?!\w)/g, (_, n) => n + '000');
  
  // Step 2: Fix number format - "34 000" → "34000" dan "1 500" → "1500"
  normalized = normalized.replace(/\b(\d{1,3})\s+(\d{3})\b/g, '$1$2');
  normalized = normalized.replace(/\b(\d+)\s+000\b/g, '$1000');
  
  // Step 3: Remove noise
  normalized = normalized
    .replace(/[^\w\s\d]/g, ' ')
    .replace(/\b(tadi|wkwk|abis|lah|dong|kena|gue|gui|sya|aku|lo|lu|yang|nya|deh|neh|buat|untuk)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return normalized;
}

function extractSegments(text) {
  const separators = /\s*(?:dan|sama|plus|ditambah|&|\+|,)\s*|\s+terus\s+/i;
  return text.split(separators).filter(p => /\d/.test(p));
}

function extractAmount(segment) {
  if (!segment) return 0;
  const matches = segment.match(/\d+/g);
  if (!matches || matches.length === 0) return 0;
  
  // Ambil nomor terakhir
  const lastNum = parseInt(matches[matches.length - 1], 10);
  if (lastNum < 100 || lastNum > 10000000000) return 0;
  if (lastNum < 1000) return lastNum * 1000;
  return lastNum;
}

function cleanDescription(segment) {
  if (!segment) return 'Transaksi';
  let desc = segment.replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
  if (desc) desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  return desc || 'Transaksi';
}

// ============================================
// SAFE JSON PARSING + VALIDATION
// ============================================

function safeJSONParse(text) {
  try {
    // Ambil semua kurung kurawal
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function validateLLMResult(obj) {
  if (!obj) return null;
  
  // Validasi type
  if (!['expense', 'income'].includes(obj.type)) {
    obj.type = 'expense'; // default
  }
  
  // Validasi category
  if (!CATEGORIES.includes(obj.category)) {
    obj.category = 'Lainnya';
  }
  
  return obj;
}

// ============================================
// DETERMINISTIC FALLBACK
// ============================================

function fallbackClassify(segment) {
  const lower = segment.toLowerCase();
  
  // Income detection
  for (const kw of INCOME_KEYWORDS) {
    if (lower.includes(kw)) {
      return { type: 'income', category: detectCategoryByKeyword(lower) };
    }
  }
  
  return { type: 'expense', category: detectCategoryByKeyword(lower) };
}

function detectCategoryByKeyword(text) {
  const keywords = {
    'Makanan & Minuman': ['makan', 'kopi', 'minum', 'food', 'cafe', 'restaurant', 'warteg', 'indomaret', 'alfamart', 'minimarket', 'water', 'juice', 'orange', 'teh', 'es', 'susu', 'soda', 'drink', 'bread', 'roti', 'snack', 'cemilan', 'nasi', 'ayam', 'soto', 'bakso', 'mie', 'pizza', 'burger'],
    'Transportasi': ['parkir', 'tol', 'bensin', 'ojek', 'gojek', 'grab', 'transport', 'taxi', 'buss', 'kereta', 'mrt'],
    'Belanja': ['beli', 'shop', 'toko', 'market', 'tokopedia', 'shopee', 'lazada', 'zalora'],
    'Hiburan': ['nonton', 'game', 'netflix', 'spotify', 'bioskop', 'konser', 'youtube'],
    'Kesehatan': ['obat', 'dokter', 'apotek', 'rumah sakit', 'medical', 'vitamin'],
    'Tagihan': ['listrik', 'wifi', 'air', 'pulsa', 'internet', 'tagihan', 'bpjs', 'token'],
    'Gaji': ['gaji', 'thr', 'bonus', 'salary', 'upah'],
    'Investasi': ['invest', 'saham', 'crypto', 'reksadana', 'deposito']
  };
  
  // Check in priority order - Makanan & Minuman first
  const foodKws = keywords['Makanan & Minuman'];
  if (foodKws.some(k => text.includes(k))) return 'Makanan & Minuman';
  
  for (const [cat, kws] of Object.entries(keywords)) {
    if (cat === 'Makanan & Minuman') continue;
    if (kws.some(k => text.includes(k))) return cat;
  }
  
  return 'Lainnya';
}

// ============================================
// LLM CLASSIFICATION (Groq → OpenRouter → Gemini)
// ============================================

async function classifyWithLLM(segment) {
  // STRICT PROMPT
  const prompt = `Output HARUS JSON VALID TANPA TEXT LAIN:

{"type":"expense|income","category":"X"}

Rules:
- income: gaji, bonus, jual, transfer masuk, dapat, terima
- selain itu expense
- category hanya dari: ${CATEGORIES.join(', ')}, jika tidak cocok → "Lainnya"

Input: "${segment}"`;

  // TRY GROQ (Primary)
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
          const parsed = safeJSONParse(text);
          const validated = validateLLMResult(parsed);
          if (validated) {
            console.log(`🤖 Groq: ${JSON.stringify(validated)}`);
            return validated;
          }
        }
      }
    } catch (e) { console.log(`⚠️ Groq: ${e.message}`); }
  }

  // TRY OPENROUTER
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
          const parsed = safeJSONParse(text);
          const validated = validateLLMResult(parsed);
          if (validated) {
            console.log(`🤖 OpenRouter: ${JSON.stringify(validated)}`);
            return validated;
          }
        }
      }
    } catch (e) { console.log(`⚠️ OpenRouter: ${e.message}`); }
  }

  // TRY GEMINI
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
          const parsed = safeJSONParse(text);
          const validated = validateLLMResult(parsed);
          if (validated) {
            console.log(`🤖 Gemini: ${JSON.stringify(validated)}`);
            return validated;
          }
        }
      }
    } catch (e) { console.log(`⚠️ Gemini: ${e.message}`); }
  }

  // FALLBACK ke deterministic
  console.log(`🔄 Fallback deterministic untuk: "${segment}"`);
  return fallbackClassify(segment);
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
    console.log(`📝 Segments: ${segments.length}`, segments);
    
    if (segments.length === 0) return null;

    // Step 3: Process each segment
    const transactions = [];
    
    for (const segment of segments) {
      const amount = extractAmount(segment);
      console.log(`💰 Segment: "${segment}" → amount: ${amount}`);
      if (amount === 0) {
        console.log(`⚠️ Skipping segment with amount 0: "${segment}"`);
        continue;
      }

      const description = cleanDescription(segment);
      console.log(`📝 Description for "${segment}": "${description}"`);

      // LLM classification + FORCE FALLBACK if LLM fails
      let llmResult = await classifyWithLLM(segment);
      console.log(`🤖 LLM Result for "${segment}":`, llmResult);
      
      // FORCE deterministic fallback if LLM returns null or wrong category
      if (!llmResult || !llmResult.category || llmResult.category === 'Lainnya') {
        console.log(`🔄 Force fallback for: "${segment}"`);
        llmResult = fallbackClassify(segment);
        console.log(`🔄 Fallback result:`, llmResult);
      }
      
      const type = llmResult?.type || 'expense';
      const category = llmResult?.category || 'Lainnya';

      transactions.push({
        type,
        amount,
        category: CATEGORIES.includes(category) ? category : 'Lainnya',
        description,
        date: today,
        parsedBy: llmResult ? 'llm' : 'fallback'
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