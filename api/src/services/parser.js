/**
 * Transaction Parser for FinChat
 * TIER 1: Regex parsing
 * TIER 2: Gemini AI parsing for complex cases
 */

import 'dotenv/config';

// Constants
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

const CATEGORY_KEYWORDS = {
  'Makanan & Minuman': ['makan', 'minum', 'kopi', 'teh', 'soto', 'nasi', 'sambel', 'ayam', 'mie', 'bakso', 'pizza', 'burger', 'snack', 'roti', 'kue', 'es', 'jus', 'susu', 'indomaret', 'alfamart', 'convenience'],
  'Transportasi': ['bensin', 'parkir', 'tol', 'ojek', 'gojek', 'grab', 'taxi', 'bus', 'kereta', 'metro', 'bbm', 'sulfuel', 'parkir', 'taxi', 'grab', 'gojek'],
  'Belanja': ['beli', 'shopping', 'toko', 'market', 'supermarket', 'tokopedia', 'shopee', 'lazada', 'ecommerce'],
  'Hiburan': ['nonton', 'film', 'bioskop', 'game', 'konser', 'musik', 'netflix', 'spotify', 'disney', 'hbo', 'youtube', 'spotify'],
  'Kesehatan': ['obat', 'dokter', 'rumah sakit', 'apotek', 'medical', 'check up', 'vitamin', 'health'],
  'Tagihan': ['listrik', 'air', 'internet', 'pulsa', 'token', 'wifi', 'paket', 'langganan', 'bpjs', 'tokenlistrik'],
  'Gaji': ['gaji', 'salary', 'thr', 'bonus', 'income', 'pendapatan'],
  'Investasi': ['invest', 'saham', 'reksadana', 'crypto', 'deposito', 'obligasi', 'investasi', 'trading'],
  'Lainnya': []
};

const INCOME_KEYWORDS = ['gaji', 'masuk', 'terima', 'dapat', 'uang masuk', 'saldo', 'transfer masuk', 'bonus', 'commission', 'fee', 'thr', 'pendapatan'];

/**
 * Parse amount from Indonesian text
 */
function parseAmount(text) {
  const lower = text.toLowerCase().replace(/\s+/g, ' ');

  const patterns = [
    /(\d+)[.,](\d+)\s*(?:jt|juta)/i,
    /(\d+)\s*(?:jt|juta)/i,
    /(\d+)\s*(?:rb|rbu|ribu)/i,
    /(\d+)\s*k\b/i,
    /(\d+)k\b/i,
    /(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+)(?!\d)/i,
    /(\d{4,})/,
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = lower.match(patterns[i]);
    if (match) {
      if (i === 0) return parseInt(match[1]) * 1000000 + parseInt(match[2]) * 100000;
      if (i === 1) return parseInt(match[1]) * 1000000;
      if (i === 2) return parseInt(match[1]) * 1000;
      if (i === 3 || i === 4) return parseInt(match[1]) * 1000;
      if (i === 5) return parseInt(match[1].replace(/[.,]/g, ''));
      if (i === 6) return parseInt(match[1]);
    }
  }
  return 0;
}

/**
 * Parse all amounts from text
 */
function parseAllAmounts(text) {
  const lower = text.toLowerCase().replace(/\s+/g, ' ');
  const amounts = [];

  const patterns = [
    /(\d+)\s*(?:jt|juta)/gi,
    /(\d+)\s*(?:rb|rbu|ribu)/gi,
    /(\d+)\s*k\b/gi,
    /(\d+)k\b/gi,
    /(\d{4,})/g,
  ];

  for (const pattern of patterns) {
    const matches = [...lower.matchAll(pattern)];
    for (const match of matches) {
      let amountStr = match[1] || match[0].replace(/[^\d]/g, '');
      let amount = parseInt(amountStr);
      
      const lowerMatch = match[0].toLowerCase();
      if (lowerMatch.includes('jt') || lowerMatch.includes('juta')) {
        amount *= 1000000;
      } else if (lowerMatch.includes('rb') || lowerMatch.includes('ribu') || lowerMatch.includes('k')) {
        amount *= 1000;
      }
      
      if (amount >= 1000 && !amounts.includes(amount)) {
        amounts.push(amount);
      }
    }
  }

  return amounts.sort((a, b) => b - a);
}

/**
 * Detect transaction type
 */
function detectType(text) {
  const lower = text.toLowerCase();
  for (const keyword of INCOME_KEYWORDS) {
    if (lower.includes(keyword)) return 'income';
  }
  return 'expense';
}

/**
 * Detect category from text
 */
function detectCategory(text, type = 'expense') {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.length === 0) continue;
    if (keywords.some(kw => lower.includes(kw))) {
      return category;
    }
  }
  return type === 'income' ? 'Gaji' : 'Lainnya';
}

/**
 * Clean and extract description
 */
function extractDescription(text) {
  let desc = text
    .replace(/(\d+)[.,]?(\d*)\s*(?:jt|juta|rb|rbu|ribu|k)\b/gi, '')
    .replace(/(?:rp\.?\s*)?\d{1,3}(?:[.,]\d{3})+/gi, '')
    .replace(/\b\d{4,}\b/g, '')
    .replace(/^\s*[-–]\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/^abis dari\s+/i, '')
    .replace(/^beli\s+/i, '')
    .replace(/^dari\s+/i, '')
    .replace(/,+$\s*/, '')
    .trim();
  
  if (desc) {
    desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  }
  return desc || text.trim();
}

/**
 * Regex-based parser
 */
function regexParse(message) {
  const singleAmount = parseAmount(message);
  const allAmounts = parseAllAmounts(message);
  const type = detectType(message);

  // If multiple amounts
  if (allAmounts.length > 1) {
    const uniqueAmounts = [...new Set(allAmounts)];
    
    if (uniqueAmounts.length === 1) {
      return [{
        type,
        amount: uniqueAmounts[0],
        category: detectCategory(message, type),
        description: extractDescription(message),
        date: new Date().toISOString().split('T')[0],
        parsedBy: 'regex'
      }];
    }

    const transactions = [];
    for (const amount of uniqueAmounts) {
      let amountStr = amount >= 1000000 
        ? (amount / 1000000) + 'jt'
        : (amount / 1000) + 'k';
      
      const pos = message.toLowerCase().indexOf(amountStr);
      let contextMsg = message;
      if (pos > 0) {
        const start = Math.max(0, pos - 40);
        const end = Math.min(message.length, pos + 40);
        contextMsg = message.substring(start, end).trim();
      }
      
      transactions.push({
        type,
        amount,
        category: detectCategory(contextMsg, type),
        description: extractDescription(contextMsg) || 'Transaksi',
        date: new Date().toISOString().split('T')[0],
        parsedBy: 'regex'
      });
    }
    return transactions;
  }

  // Single transaction
  if (singleAmount === 0) return null;
  
  return [{
    type,
    amount: singleAmount,
    category: detectCategory(message, type),
    description: extractDescription(message),
    date: new Date().toISOString().split('T')[0],
    parsedBy: 'regex'
  }];
}

/**
 * Gemini AI Parser - lebih baik untuk parsing kompleks
 */
async function geminiParse(message) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set, skipping AI parse');
    return null;
  }

  const today = new Date().toISOString().split('T')[0];

  const prompt = `Kamu adalah parser transaksi keuangan untuk aplikasi Indonesia.

KATEGORI: ${CATEGORIES.join(', ')}

TUGAS: Ekstrak semua transaksi dari pesan berikut.

ATURAN:
1. Deteksi tipe: "income" atau "expense"
2. Parse amount: 25rb=25000, 1jt=1000000, 50k=50000, 25000=25000
3. Kategori: gunakan konteks (kopi/rokok->Makanan & Minuman, bensin->Transportasi, dlL)
4. Jika multiple transaksi (dipisahkan koma/dan), buat array transaksi
5. Date: ${today} jika tidak disebutkan

CONTOH:
Input: "beli kopi 25rb, rokok 30rb"
Output: [{"type":"expense","amount":25000,"category":"Makanan & Minuman","description":"Kopi","date":"${today}"},{"type":"expense","amount":30000,"category":"Makanan & Minuman","description":"Rokok","date":"${today}"}]

Input: "gaji masuk 5jt"
Output: [{"type":"income","amount":5000000,"category":"Gaji","description":"Gaji","date":"${today}"}]

PESAN: "${message}"

Jawab HANYA JSON valid, tanpa markdown:`;

  try {
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      console.error('Gemini API error:', response.status);
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const cleanJson = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (!parsed || (Array.isArray(parsed) && parsed.length === 0)) return null;

    // Validate and normalize each transaction
    const transactions = (Array.isArray(parsed) ? parsed : [parsed]).filter(tx => tx.amount > 0).map(tx => ({
      type: tx.type || 'expense',
      amount: tx.amount,
      category: CATEGORIES.includes(tx.category) ? tx.category : detectCategory(tx.description || message, tx.type),
      description: tx.description || message,
      date: tx.date || today,
      parsedBy: 'gemini'
    }));

    return transactions.length > 0 ? transactions : null;

  } catch (error) {
    console.error('Gemini parse error:', error.message);
    return null;
  }
}

/**
 * Main parser: Use regex first, fallback to Gemini
 */
export async function parseTransaction(message) {
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return null;
  }

  // Tier 1: Regex parsing
  const regexResult = regexParse(message);
  console.log('🔍 DEBUG regexResult:', JSON.stringify(regexResult));
  if (regexResult) {
    const isArray = Array.isArray(regexResult);
    const firstTx = isArray ? regexResult[0] : regexResult;
    console.log(`✅ Parsed by regex: ${message} → ${firstTx?.amount} (${firstTx?.category})${isArray ? ` [${regexResult.length} transactions]` : ''}`);
    return regexResult;
  }

  // Tier 2: Gemini AI (for complex cases)
  console.log(`🤖 Regex failed, trying Gemini AI: "${message}"`);
  const geminiResult = await geminiParse(message);
  if (geminiResult) {
    const isArray = Array.isArray(geminiResult);
    const firstTx = isArray ? geminiResult[0] : geminiResult;
    console.log(`✅ Parsed by Gemini: ${message} → ${firstTx?.amount} (${firstTx?.category})${isArray ? ` [${geminiResult.length} transactions]` : ''}`);
    return geminiResult;
  }

  console.log(`❌ Could not parse: "${message}"`);
  return null;
}

export { CATEGORIES, CATEGORY_KEYWORDS, regexParse, geminiParse };