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
  'Pinjaman',
  'Lainnya'
];

const INCOME_KEYWORDS = ['gaji', 'bonus', 'jual', 'transfer masuk', 'dapat', 'terima', 'uang masuk', 'pembayaran', 'profit', 'dividen', 'thr', 'commission', 'komisi', 'saldo', 'topup', 'isi saldo', 'deposit', 'transfer', 'bayar', 'uang dapat', 'uang terima', 'penerimaan', 'uang', 'nambah', 'tambah', 'masukin', 'masuk', 'terima uang', 'pinjam', 'pinjeman', 'hutang', 'utang', 'borrow'];

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
  
  // Step 2: Merge numbers - hapus spasi antara digits: "1 000000" → "1000000"
  normalized = normalized.replace(/(\d)\s+(0+)/g, '$1$2');
  
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
    'Investasi': ['invest', 'saham', 'crypto', 'reksadana', 'deposito'],
    'Pinjaman': ['pinjam', 'pinjeman', 'hutang', 'utang', 'borrow', 'loan', 'lend', 'kembali', 'bayar kembali']
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
// INTENT DETECTION + PARSING (Hybrid: LLM do it all)
// ============================================

async function parseWithLLM(message) {
  const today = new Date().toISOString().split('T')[0];
  
  // DETECT INTENT: transaction vs query
  const intentPrompt = `Cek intent pesan ini:

PESAN: "${message}"

Jenis:
- "transaction" = catat transaksi (keluar/masuk uang)
- "query" = minta laporan/info (hitung.total, berapa, saldo, laporan, summary)

Jawab JSON saja: {"intent":"transaction|query"}

Contoh:
- "beli kopi 25rb" → {"intent":"transaction"}
- "pengeluaran bulan ini" → {"intent":"query"}
- "saldo ada berapa" → {"intent":"query"}
- "gimana keuangan saya" → {"intent":"query"}`;

  // Try LLM untuk intent detection
  const groqKey = process.env.GROQ_API_KEY;
  let intent = 'transaction'; // default
  
  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: intentPrompt }],
          temperature: 0.1,
          max_tokens: 32
        })
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        const match = text?.match(/"intent":"(\w+)"/);
        if (match) intent = match[1];
      }
    } catch (e) { console.log(`⚠️ Intent: ${e.message}`); }
  }

  console.log(`🎯 Intent: ${intent}`);

  // IF QUERY - return query object (bot akan handle)
  if (intent === 'query') {
    const queryPrompt = `Parse query keuangan:

PESAN: "${message}"

Categories untuk query:
- "expense": pengeluaran
- "income": pemasukan  
- "balance": saldo
- "month": bulan ini
- "week": minggu ini
- "day": hari ini
- "year": tahun ini
- "all": semua/keseluruhan
- "highest": terbesar/terbanyak
- "category": per kategori

Jawab JSON valid: {"query":"X","timeframe":"Y","category":"Z"}

Contoh:
- "pengeluaran bulan ini" → {"query":"expense","timeframe":"month","category":"all"}
- "saldo ada berapa" → {"query":"balance","timeframe":"day","category":"all"}
- "pengeluaran terbesar dimana" → {"query":"expense","timeframe":"all","category":"highest"}
- "laporan april" → {"query":"all","timeframe":"month","category":"all"}`;

    let queryResult = { query: 'expense', timeframe: 'month', category: 'all' };
    
    if (groqKey) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: queryPrompt }],
            temperature: 0.1,
            max_tokens: 64
          })
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          const match = text?.match(/\{[\s\S]*\}/);
          if (match) queryResult = JSON.parse(match[0]);
        }
      } catch (e) { console.log(`⚠️ Query: ${e.message}`); }
    }

    console.log(`🔍 Query parsed:`, queryResult);
    return {
      type: 'query',
      query: queryResult.query,
      timeframe: queryResult.timeframe,
      category: queryResult.category,
      date: today
    };
  }

  // IF TRANSACTION - proceed with normal parsing
  return null; // Placeholder - akan lanjut di main function
}

// Parse QUERY dengan LLM
async function parseQueryWithLLM(message) {
  const today = new Date().toISOString().split('T')[0];
  
  const prompt = `Parse query keuangan Indonesia:

PESAN: "${message}"

Format: {"query":"expense|income|balance|budget|all","timeframe":"day|week|month|year|all","special":"highest|category|all|none"}

Contoh:
- "pengeluaran bulan ini" → {"query":"expense","timeframe":"month","special":"none"}
- "saldo ada berapa" → {"query":"balance","timeframe":"day","special":"none"}
- "sisa budget makanan" → {"query":"budget","timeframe":"month","special":"none","category":"Makanan & Minuman"}
- "budget makan dan minum" → {"query":"budget","timeframe":"month","special":"none","category":"Makanan & Minuman"}
- "pengeluaran terbesar dimana" → {"query":"expense","timeframe":"all","special":"highest"}
- "laporan april" → {"query":"all","timeframe":"month","special":"category"}
- "gimana keuangan saya" → {"query":"all","timeframe":"all","special":"none"}

Jawab JSON valid saja.`;

  let result = { query: 'expense', timeframe: 'month', special: 'none', category: 'all' };
  
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 80
        })
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        console.log(`🔍 Raw LLM response: "${text}"`);
        // More robust JSON extraction
        const jsonMatch = text?.match(/\{[^{}]*\}/);
        if (jsonMatch) {
          try {
            result = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.log(`⚠️ JSON parse failed: ${e.message}`);
          }
        }
      }
    } catch (e) { console.log(`⚠️ Query: ${e.message}`); }
  }

  return {
    type: 'query',
    date: today,
    raw: message,
    ...result
  };
}

async function classifyWithLLM(segment) {
  // STRICT PROMPT
  const prompt = `Output HARUS JSON VALID TANPA TEXT LAIN:

{"type":"expense|income","category":"X"}

Rules:
- income: gaji, bonus, jual, transfer masuk, dapat, terima, nambah saldo, masukin uang, topup saldo, pinjam, pinjeman, hutang
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

  // ===== DETECT INTENT: transaction vs query =====
  const queryKeywords = ['berapa', 'total', 'saldo', 'laporan', 'pengeluaran', 'pemasukan', 'keuangan', 'gimana', 'apa', 'cek', 'lihat', 'hitung', 'bulan', 'minggu', 'hari', 'tahun', 'terbesar', 'terbanyak', 'dimana', 'raport', 'summary'];
  const isQuery = queryKeywords.some(k => message.toLowerCase().includes(k));
  
  if (isQuery) {
    console.log(`🎯 Intent: QUERY - "${message}"`);
    return await parseQueryWithLLM(message);
  }

  console.log(`🎯 Intent: TRANSACTION - "${message}"`);

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
      
      // Check if need fallback: LLM returns null OR wrong type (income keywords → expense)
      const keywords = ['nambah', 'masukin', 'masuk', 'terima', 'dapat', 'gaji', 'bonus', 'transfer', 'saldo', 'topup', 'uang'];
      const hasIncomeKeyword = keywords.some(k => segment.includes(k));
      const needsFallback = !llmResult || (hasIncomeKeyword && llmResult?.type === 'expense');
      
      if (needsFallback) {
        console.log(`🔄 Force fallback for: "${segment}" (LLM type was wrong or null)`);
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