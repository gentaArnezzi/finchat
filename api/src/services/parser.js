/**
 * Transaction Parser for FinChat
 * Strategy: Regex first (80%) → AI fallback (20%)
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

const CATEGORY_KEYWORDS = {
  'Makanan & Minuman': ['makan', 'minum', 'kopi', 'teh', 'soto', 'nasi', 'ayam', 'mie', 'bakso', 'pizza', 'burger', 'snack', 'roti', 'kue', 'es', 'jus', 'susu', 'indomaret', 'alfamart', 'convenience', 'makan', 'sarapan', 'siang', 'malam', 'lapar', 'food', 'cafe', 'restaurant', 'rokok', 'sigaret', 'cigarette', 'gas', 'galon', 'air galon'],
  'Transportasi': ['bensin', 'parkir', 'tol', 'ojek', 'gojek', 'grab', 'taxi', 'bus', 'kereta', 'metro', 'bbm', 'sulfuel', 'parkir', 'taxi', 'grab', 'gojek', 'angkot', 'travel', 'gas', 'fuel', 'pertamina'],
  'Belanja': ['beli', 'shopping', 'toko', 'market', 'supermarket', 'tokopedia', 'shopee', 'lazada', 'ecommerce', 'belanja', 'barang', 'shopping', 'zara', 'unilever'],
  'Hiburan': ['nonton', 'film', 'bioskop', 'game', 'konser', 'musik', 'netflix', 'spotify', 'disney', 'hbo', 'youtube', 'spotify', 'tiket', 'bioskop', 'bola', 'match'],
  'Kesehatan': ['obat', 'dokter', 'rumah sakit', 'apotek', 'medical', 'check up', 'vitamin', 'health', 'rs', 'klinik', 'medis', 'obat', 'influenza', 'sakit'],
  'Tagihan': ['listrik', 'air', 'internet', 'pulsa', 'token', 'wifi', 'paket', 'langganan', 'bpjs', 'tokenlistrik', 'token_listrik', 'bill', 'payment', 'ulang', 'iuran', 'bulanan'],
  'Gaji': ['gaji', 'salary', 'thr', 'bonus', 'income', 'pendapatan', 'upah', 'fee', 'komisi', 'receh', 'uang masuk'],
  'Investasi': ['invest', 'saham', 'reksadana', 'crypto', 'deposito', 'obligasi', 'investasi', 'trading', 'btc', 'eth', 'saham', 'idx'],
  'Lainnya': []
};

const INCOME_KEYWORDS = ['gaji', 'masuk', 'terima', 'dapat', 'uang masuk', 'saldo', 'transfer masuk', 'bonus', 'thr', 'pendapatan', 'upah', 'fee', 'komisi', 'receh'];
const EXPENSE_KEYWORDS = ['beli', 'bayar', 'kirim', 'keluar', 'spent', 'belanja', 'jajan', 'lunas', 'cicil', 'tunai'];

/**
 * Parse amount from Indonesian text
 */
function parseAmount(text) {
  const lower = text.toLowerCase().replace(/\s+/g, ' ');

  const patterns = [
    // Decimal juta: 1.5jt, 1,5jt
    /(\d+)[.,](\d+)\s*(?:jt|juta)/i,
    // juta: 1jt, 2juta, 15jt
    /(\d+)\s*(?:jt|juta)/i,
    // ribu: 35rb, 35ribu, 35rbu, 35rebu
    /(\d+)\s*(?:rb|rbu|ribu|rebu)/i,
    // k with space: 35k, 100k
    /(\d+)\s*k\b/i,
    // k without space: 25k, 30k
    /(\d+)k\b/i,
    // Formatted: 1.500.000 or 1,500,000
    /(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+)(?!\d)/i,
    // Raw number >= 1000
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
    /(\d+)\s*(?:rb|rbu|ribu|rebu)/gi,
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
 * Detect category from text keywords
 */
function detectCategory(text, type = 'expense') {
  const lower = text.toLowerCase();
  
  // Check keywords
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.length === 0) continue;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return category;
      }
    }
  }
  
  // Default
  return type === 'income' ? 'Gaji' : 'Lainnya';
}

/**
 * Extract description - clean up
 */
function extractDescription(text, amount) {
  let desc = text;
  
  // Remove amount patterns
  const amountPatterns = [
    /(\d+)[.,]?(\d*)\s*(?:jt|juta|rb|rbu|ribu|k)\b/gi,
    /(?:rp\.?\s*)?\d{1,3}(?:[.,]\d{3})+/gi,
    /\b\d{4,}\b/g,
  ];
  
  for (const pattern of amountPatterns) {
    desc = desc.replace(pattern, '');
  }
  
  // Clean up common patterns
  desc = desc
    .replace(/^abis\s+/i, '')
    .replace(/^dari\s+/i, '')
    .replace(/^beli\s+/i, '')
    .replace(/^ke\s+/i, '')
    .replace(/,\s*,/g, ',')
    .replace(/^\s*[-–:,]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (desc) {
    desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  }
  
  return desc || 'Transaksi';
}

/**
 * Main regex parser - handles 80% of cases
 */
function regexParse(message) {
  const singleAmount = parseAmount(message);
  const allAmounts = parseAllAmounts(message);
  const type = detectType(message);

  // === Multiple Transactions ===
  if (allAmounts.length > 1) {
    const uniqueAmounts = [...new Set(allAmounts)];
    
    // Single unique amount → single transaction
    if (uniqueAmounts.length === 1) {
      return [{
        type,
        amount: uniqueAmounts[0],
        category: detectCategory(message, type),
        description: extractDescription(message, uniqueAmounts[0]),
        date: new Date().toISOString().split('T')[0],
        parsedBy: 'regex'
      }];
    }

    // Multiple unique amounts → parse each
    const transactions = [];
    const lowerMsg = message.toLowerCase();
    
    // Sort by position in message
    const amountPositions = uniqueAmounts.map(amt => {
      let amtStr = amt >= 1000000 ? (amt / 1000000) + 'jt' : (amt / 1000) + 'k';
      const pos = lowerMsg.indexOf(amtStr);
      return { amount: amt, pos: pos >= 0 ? pos : 999 };
    }).sort((a, b) => a.pos - b.pos);

    for (let i = 0; i < amountPositions.length; i++) {
      const { amount, pos } = amountPositions[i];
      
      // Get text before this amount
      let contextBefore = '';
      if (pos > 0 && pos < message.length) {
        contextBefore = message.substring(0, pos).trim();
      }
      
      // Clean up the description
      let desc = contextBefore
        .replace(/^abis\s+/i, '')
        .replace(/^dari\s+/i, '')
        .replace(/^beli\s+/i, '')
        .replace(/,\s*$/, '')
        .trim();
      
      if (!desc) {
        // Fallback: use detected category as description
        desc = detectCategory(contextBefore, type);
      }
      
      if (desc) {
        desc = desc.charAt(0).toUpperCase() + desc.slice(1);
      }
      
      transactions.push({
        type,
        amount,
        category: detectCategory(contextBefore, type),
        description: desc || `Transaksi ${i + 1}`,
        date: new Date().toISOString().split('T')[0],
        parsedBy: 'regex'
      });
    }
    
    return transactions;
  }

  // === Single Transaction ===
  if (singleAmount === 0) return null;

  return [{
    type,
    amount: singleAmount,
    category: detectCategory(message, type),
    description: extractDescription(message, singleAmount),
    date: new Date().toISOString().split('T')[0],
    parsedBy: 'regex'
  }];
}

/**
 * Gemini AI - FALLBACK ONLY for complex cases
 */
async function geminiFallback(message, retries = 2) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('⚠️ GEMINI_API_KEY not configured');
    return null;
  }

  const today = new Date().toISOString().split('T')[0];

  const prompt = `Parse transaksi keuangan Indonesia ke JSON.

KATEGORI: ${CATEGORIES.join(', ')}

PESAN: "${message}"

Format:
- Jika 1 transaksi: {"type":"expense/income","amount":number,"category":"kategori","description":"deskripsi","date":"${today}"}
- Jika multi: [{"type":"expense","amount":25000,"category":"Makanan & Minuman","description":"Kopi","date":"${today}"}]

Jawab JSON saja, tanpa markdown.`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
      
      // Use v1 for Gemini 2.x, fallback to v1beta for older models
      const version = model.includes('2.0') || model.includes('2.5') ? 'v1' : 'v1beta';
      const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 512,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`⚠️ Gemini API error ${response.status}: ${errorText}`);
        if (response.status === 429 && attempt < retries - 1) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return null;
      }

      const data = await response.json();
      
      if (data.error) {
        console.log(`⚠️ Gemini error: ${data.error.message}`);
        return null;
      }
      
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        console.log('⚠️ Gemini returned empty response');
        return null;
      }

      const cleanJson = text.replace(/```json|```/g, '').trim();
      let parsed;
      try {
        parsed = JSON.parse(cleanJson);
      } catch (parseError) {
        console.log(`⚠️ Failed to parse Gemini JSON: ${cleanJson.substring(0, 100)}`);
        return null;
      }

      if (!parsed || (Array.isArray(parsed) && parsed.length === 0)) return null;

      return (Array.isArray(parsed) ? parsed : [parsed]).filter(tx => tx.amount > 0).map(tx => ({
        type: tx.type || 'expense',
        amount: tx.amount,
        category: CATEGORIES.includes(tx.category) ? tx.category : detectCategory(tx.description || message, tx.type),
        description: tx.description || message,
        date: tx.date || today,
        parsedBy: 'gemini'
      }));

    } catch (error) {
      console.log(`⚠️ Gemini attempt ${attempt + 1} failed: ${error.message}`);
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
  
  return null;
}

/**
 * Main parser: Regex first (80%) → AI fallback (20%)
 */
export async function parseTransaction(message) {
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return null;
  }

  // === TIER 1: Regex (80% cases) ===
  const regexResult = regexParse(message);
  if (regexResult && regexResult.length > 0) {
    const isArray = Array.isArray(regexResult);
    const firstTx = isArray ? regexResult[0] : regexResult;
    console.log(`✅ Regex: "${message}" → ${firstTx.amount} (${firstTx.category})${isArray ? ` [${regexResult.length}]` : ''}`);
    return regexResult;
  }

  // === TIER 2: AI Fallback (20% complex cases) ===
  console.log(`🤖 Regex failed, trying Gemini: "${message}"`);
  const aiResult = await geminiFallback(message);
  if (aiResult && aiResult.length > 0) {
    const isArray = Array.isArray(aiResult);
    const firstTx = isArray ? aiResult[0] : aiResult;
    console.log(`✅ Gemini: "${message}" → ${firstTx.amount} (${firstTx.category})${isArray ? ` [${aiResult.length}]` : ''}`);
    return aiResult;
  }

  console.log(`❌ Parse failed: "${message}"`);
  return null;
}

export { CATEGORIES, CATEGORY_KEYWORDS };