/**
 * Transaction Parser for FinChat — LLM-First Edition
 *
 * Architecture:
 *   1. LLM parses everything in ONE call (intent + segmentation + type + amount + category + description)
 *   2. Amount verification: LLM-returned amounts MUST appear in original message (prevents hallucination)
 *   3. Deterministic fallback: kicks in only when LLM fails OR amounts can't be verified
 *
 * Provider cascade: Groq → OpenRouter → Gemini → Deterministic
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

const LLM_TIMEOUT_MS = 5000;

// ============================================
// UNIFIED LLM CALLER (with cascade + timeout)
// ============================================

async function fetchWithTimeout(url, options, timeoutMs = LLM_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

async function callGroq(prompt, maxTokens) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  try {
    const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' }
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.log(`⚠️ Groq: ${e.message}`);
    return null;
  }
}

async function callOpenRouter(prompt, maxTokens) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  try {
    const res = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer': 'https://finchat.id',
        'X-Title': 'FinChat'
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' }
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.log(`⚠️ OpenRouter: ${e.message}`);
    return null;
  }
}

async function callGemini(prompt, maxTokens) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const version = model.includes('2.0') || model.includes('2.5') ? 'v1' : 'v1beta';
    const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${key}`;
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: maxTokens,
          responseMimeType: 'application/json'
        }
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) {
    console.log(`⚠️ Gemini: ${e.message}`);
    return null;
  }
}

async function callLLM(prompt, maxTokens = 400) {
  const providers = [
    { name: 'Groq', fn: callGroq },
    { name: 'OpenRouter', fn: callOpenRouter },
    { name: 'Gemini', fn: callGemini }
  ];
  for (const p of providers) {
    const result = await p.fn(prompt, maxTokens);
    if (result) {
      console.log(`🤖 LLM provider: ${p.name}`);
      return result;
    }
  }
  return null;
}

// ============================================
// PROMPT
// ============================================

function buildPrompt(message) {
  return `Parse pesan keuangan user jadi JSON. Output HARUS JSON VALID tanpa text lain.

PESAN: "${message}"

== ATURAN UTAMA (BACA DULU!) ==

1. KALAU PESAN TIDAK ADA ANGKA NUMERIK (misal: "saldo saya", "laporan", "cek pengeluaran") → WAJIB intent="query". JANGAN BIKIN ANGKA. JANGAN HALUSINASI amount.
2. Amount HANYA boleh dari angka yang BENAR-BENAR ada di pesan. Kalau ragu, pakai intent="query" atau return kosong.
3. Kata kunci query: saldo, berapa, total, laporan, rekap, gimana, cek, lihat, pengeluaran bulan, pemasukan bulan, terbesar, summary.

== SCHEMA ==

Kalau user NANYA INFO:
{"intent":"query","query":"expense|income|balance|all","timeframe":"day|yesterday|week|last_week|month|last_month|year|last_year|all","special":"highest|category|none"}

Kalau user CATAT TRANSAKSI (HARUS ada angka di pesan):
{"intent":"transaction","items":[{"type":"expense|income","amount":<integer>,"category":"<kategori>","description":"<singkat>"}]}

TIMEFRAME MAPPING:
- "hari ini" → day
- "kemarin" → yesterday
- "minggu ini" → week
- "minggu lalu" / "minggu kemarin" → last_week
- "bulan ini" → month
- "bulan lalu" / "bulan kemarin" → last_month
- "tahun ini" → year
- "tahun lalu" / "tahun kemarin" → last_year
- tanpa periode spesifik, default → month (untuk expense/income), all (untuk balance)

== RULES ==

AMOUNT (dalam rupiah, integer penuh):
- "25rb" / "25 ribu" / "25k" = 25000
- "2jt" / "2 juta" = 2000000
- "500" tanpa satuan (< 1000) = 500000 (diasumsikan ribuan)
- JANGAN kalkulasi (kalau "patungan 300rb bagi 3", catat 300000, bukan 100000)

TYPE:
- income = uang MASUK ke user: gaji, bonus, thr, dividen, jual, terima transfer, dapat uang, topup saldo, pinjem DARI orang
- expense = uang KELUAR dari user: beli, bayar, makan, isi bensin, pinjemin KE orang, bayar hutang

CATEGORY (pilih persis satu, default "Lainnya"):
- Makanan & Minuman: makan, kopi, snack, warteg, resto, indomaret, alfamart, bakso, nasi, roti
- Transportasi: ojek, grab, gojek, bensin, parkir, tol, kereta, mrt, taxi
- Belanja: beli barang non-makanan, shopee, tokopedia, baju, elektronik
- Hiburan: nonton, netflix, spotify, game, konser, bioskop
- Kesehatan: obat, dokter, apotek, vitamin, rumah sakit
- Tagihan: listrik, wifi, pulsa, token, bpjs, internet
- Gaji: gaji, thr, bonus kerja, salary
- Investasi: saham, crypto, reksadana, deposito
- Pinjaman: pinjem, hutang, utang (dua arah)
- Lainnya: ga cocok

MULTI-TRANSAKSI:
Pisahkan jadi items terpisah kalau ada pemisah: dan, sama, plus, terus, koma, &, +

DESCRIPTION: singkat (1-4 kata), huruf awal kapital. Contoh: "Kopi", "Ojek kantor", "Gaji bulanan"

== CONTOH ==

"beli kopi 25rb"
→ {"intent":"transaction","items":[{"type":"expense","amount":25000,"category":"Makanan & Minuman","description":"Kopi"}]}

"gaji masuk 5jt"
→ {"intent":"transaction","items":[{"type":"income","amount":5000000,"category":"Gaji","description":"Gaji"}]}

"makan 30rb sama grab 20rb"
→ {"intent":"transaction","items":[{"type":"expense","amount":30000,"category":"Makanan & Minuman","description":"Makan"},{"type":"expense","amount":20000,"category":"Transportasi","description":"Grab"}]}

"pinjem dari andi 500rb"
→ {"intent":"transaction","items":[{"type":"income","amount":500000,"category":"Pinjaman","description":"Pinjem dari Andi"}]}

"bayar listrik 150rb"
→ {"intent":"transaction","items":[{"type":"expense","amount":150000,"category":"Tagihan","description":"Listrik"}]}

"pengeluaran bulan ini berapa"
→ {"intent":"query","query":"expense","timeframe":"month","special":"none"}

"pengeluaran bulan lalu"
→ {"intent":"query","query":"expense","timeframe":"last_month","special":"none"}

"pemasukan minggu lalu"
→ {"intent":"query","query":"income","timeframe":"last_week","special":"none"}

"total tahun lalu"
→ {"intent":"query","query":"all","timeframe":"last_year","special":"none"}

"pengeluaran terbesar dimana"
→ {"intent":"query","query":"expense","timeframe":"all","special":"highest"}

"saldo gw berapa"
→ {"intent":"query","query":"balance","timeframe":"all","special":"none"}

"sisa saldo saya"
→ {"intent":"query","query":"balance","timeframe":"all","special":"none"}

"laporan dong"
→ {"intent":"query","query":"all","timeframe":"month","special":"none"}

"gimana keuangan gw"
→ {"intent":"query","query":"all","timeframe":"month","special":"none"}

"rekap minggu ini"
→ {"intent":"query","query":"all","timeframe":"week","special":"none"}

"pengeluaran kemarin"
→ {"intent":"query","query":"expense","timeframe":"yesterday","special":"none"}

JAWAB JSON SAJA:`;
}

// ============================================
// JSON PARSING
// ============================================

function safeJSONParse(text) {
  if (!text) return null;
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}

// ============================================
// AMOUNT VERIFICATION (THE SAFETY NET)
// ============================================

/**
 * Extract all plausible amounts from raw message, normalized to rupiah.
 * This is the source of truth that the LLM's output is verified against.
 */
function extractAllAmounts(text) {
  if (!text) return new Set();

  const normalized = text
    .toLowerCase()
    .replace(/(\d+)\s*(rb|ribu|rebu|rbu)\b/gi, (_, n) => n + '000')
    .replace(/(\d+)\s*(jt|juta)\b/gi, (_, n) => n + '000000')
    .replace(/(\d+)\s*k(?!\w)/gi, (_, n) => n + '000')
    .replace(/(\d)[.,\s]+(\d{3})/g, '$1$2'); // handle "1.000.000" or "1 000 000"

  const amounts = new Set();
  const matches = normalized.match(/\d+/g) || [];

  for (const m of matches) {
    const n = parseInt(m, 10);
    if (!Number.isFinite(n) || n < 1 || n > 10_000_000_000) continue;

    if (n >= 100) amounts.add(n);
    // "< 1000" interpreted as thousands (Indonesian convention)
    if (n < 1000) amounts.add(n * 1000);
  }

  return amounts;
}

function verifyAmount(amountSet, llmAmount) {
  if (!Number.isInteger(llmAmount) || llmAmount < 100) return false;
  return amountSet.has(llmAmount);
}

// ============================================
// VALIDATION
// ============================================

function validateTransactionItem(item, amountSet) {
  if (!item || typeof item !== 'object') return null;

  const amount = parseInt(item.amount, 10);
  if (!Number.isFinite(amount) || amount < 100 || amount > 10_000_000_000) return null;

  const type = ['expense', 'income'].includes(item.type) ? item.type : 'expense';
  const category = CATEGORIES.includes(item.category) ? item.category : 'Lainnya';

  let description = String(item.description || 'Transaksi').trim().slice(0, 80);
  if (description) description = description.charAt(0).toUpperCase() + description.slice(1);
  else description = 'Transaksi';

  return {
    type,
    amount,
    category,
    description,
    _verified: verifyAmount(amountSet, amount)
  };
}

function validateQuery(obj) {
  const validQuery = ['expense', 'income', 'balance', 'all'];
  const validTimeframe = ['day', 'yesterday', 'week', 'last_week', 'month', 'last_month', 'year', 'last_year', 'all'];
  const validSpecial = ['highest', 'category', 'none'];

  const query = validQuery.includes(obj.query) ? obj.query : 'balance';
  // Balance queries semantically ga punya timeframe — default ke 'all'
  const defaultTimeframe = query === 'balance' ? 'all' : 'month';

  return {
    query,
    timeframe: validTimeframe.includes(obj.timeframe) ? obj.timeframe : defaultTimeframe,
    special: validSpecial.includes(obj.special) ? obj.special : 'none',
    category: 'all' // backward compat dengan versi lama
  };
}

// ============================================
// DETERMINISTIC FALLBACK
// ============================================

const INCOME_KEYWORDS = [
  'gaji', 'bonus', 'thr', 'dividen', 'komisi', 'commission',
  'jual ', 'terima transfer', 'masuk', 'dapat ', 'topup',
  'pinjem dari', 'pinjam dari', 'hutang dari', 'utang dari'
];

const CATEGORY_KEYWORDS = {
  'Makanan & Minuman': ['makan', 'kopi', 'minum', 'cafe', 'resto', 'warteg', 'indomaret', 'alfamart', 'roti', 'snack', 'cemilan', 'nasi', 'ayam', 'soto', 'bakso', 'mie', 'pizza', 'burger', 'teh', 'susu'],
  'Transportasi': ['parkir', 'tol', 'bensin', 'ojek', 'gojek', 'grab', 'taxi', 'kereta', 'mrt', 'krl', 'bus'],
  'Belanja': ['beli', 'shop', 'toko', 'tokopedia', 'shopee', 'lazada', 'baju'],
  'Hiburan': ['nonton', 'game', 'netflix', 'spotify', 'bioskop', 'konser', 'youtube'],
  'Kesehatan': ['obat', 'dokter', 'apotek', 'rumah sakit', 'vitamin', 'klinik'],
  'Tagihan': ['listrik', 'wifi', 'pulsa', 'internet', 'tagihan', 'bpjs', 'token'],
  'Gaji': ['gaji', 'thr', 'salary', 'upah'],
  'Investasi': ['invest', 'saham', 'crypto', 'reksadana', 'deposito'],
  'Pinjaman': ['pinjem', 'pinjam', 'hutang', 'utang', 'loan']
};

const QUERY_KEYWORDS = ['berapa', 'total', 'saldo', 'sisa', 'laporan', 'pengeluaran', 'pemasukan', 'pendapat', 'keuangan', 'gimana', 'cek', 'lihat', 'hitung', 'bulan ini', 'bulan lalu', 'minggu ini', 'minggu lalu', 'hari ini', 'kemarin', 'tahun ini', 'tahun lalu', 'terbesar', 'terbanyak', 'dimana', 'summary', 'rekap'];

function detectType(text) {
  const lower = text.toLowerCase();
  return INCOME_KEYWORDS.some(k => lower.includes(k)) ? 'income' : 'expense';
}

function detectCategory(text) {
  const lower = text.toLowerCase();
  if (CATEGORY_KEYWORDS['Makanan & Minuman'].some(k => lower.includes(k))) return 'Makanan & Minuman';
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat === 'Makanan & Minuman') continue;
    if (kws.some(k => lower.includes(k))) return cat;
  }
  return 'Lainnya';
}

function fallbackParse(message) {
  const lower = message.toLowerCase();
  const isQuery = QUERY_KEYWORDS.some(k => lower.includes(k));

  if (isQuery) {
    const query = lower.includes('saldo') ? 'balance'
      : lower.includes('pemasukan') || lower.includes('pendapat') || lower.includes('income') ? 'income'
        : lower.includes('pengeluaran') || lower.includes('expense') ? 'expense'
          : 'all';

    // Detect timeframe with "lalu/kemarin" support
    let timeframe = 'month';
    if (query === 'balance') {
      timeframe = 'all';
    } else if (lower.includes('kemarin') && !lower.includes('bulan') && !lower.includes('minggu') && !lower.includes('tahun')) {
      timeframe = 'yesterday';
    } else if (lower.includes('hari ini')) {
      timeframe = 'day';
    } else if (lower.includes('minggu')) {
      timeframe = lower.includes('lalu') || lower.includes('kemarin') ? 'last_week' : 'week';
    } else if (lower.includes('tahun')) {
      timeframe = lower.includes('lalu') || lower.includes('kemarin') ? 'last_year' : 'year';
    } else if (lower.includes('bulan')) {
      timeframe = lower.includes('lalu') || lower.includes('kemarin') ? 'last_month' : 'month';
    }

    return {
      intent: 'query',
      query,
      timeframe,
      special: lower.includes('terbesar') || lower.includes('terbanyak') ? 'highest' : 'none',
      category: 'all'
    };
  }

  const segments = message.split(/\s*(?:dan|sama|plus|ditambah|&|\+|,|terus)\s+/i).filter(s => /\d/.test(s));
  if (segments.length === 0) return null;

  const items = [];
  for (const seg of segments) {
    const amountSet = extractAllAmounts(seg);
    if (amountSet.size === 0) continue;

    const amount = Math.max(...amountSet);

    let description = seg
      .replace(/\d+/g, '')
      .replace(/\b(rb|ribu|rebu|rbu|jt|juta|k)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60);
    description = description ? description.charAt(0).toUpperCase() + description.slice(1) : 'Transaksi';

    items.push({
      type: detectType(seg),
      amount,
      category: detectCategory(seg),
      description
    });
  }

  if (items.length === 0) return null;
  return { intent: 'transaction', items };
}

// ============================================
// MAIN PARSER
// ============================================

export async function parseTransaction(message, userId = null) {
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return null;
  }

  const today = new Date().toISOString().split('T')[0];
  console.log(`📩 Input: "${message}"`);

  // ===== TRY LLM =====
  const llmResponse = await callLLM(buildPrompt(message), 400);
  const parsed = safeJSONParse(llmResponse);

  if (parsed?.intent === 'query') {
    console.log(`✅ Query parsed by LLM`);
    return {
      type: 'query',
      date: today,
      raw: message,
      parsedBy: 'llm',
      ...validateQuery(parsed)
    };
  }

  if (parsed?.intent === 'transaction' && Array.isArray(parsed.items) && parsed.items.length > 0) {
    const amountSet = extractAllAmounts(message);
    const validated = parsed.items
      .map(item => validateTransactionItem(item, amountSet))
      .filter(Boolean);

    const allVerified = validated.length > 0 && validated.every(i => i._verified);

    if (allVerified) {
      console.log(`✅ ${validated.length} transaction(s) by LLM — amounts verified`);
      const result = validated.map(({ _verified, ...rest }) => ({
        ...rest,
        date: today,
        parsedBy: 'llm'
      }));
      return result.length === 1 ? result[0] : result;
    }

    const unverified = validated.filter(i => !i._verified).map(i => i.amount);
    console.log(`⚠️ LLM returned unverifiable amounts: ${unverified.join(', ')} — falling back`);
  } else if (llmResponse) {
    console.log(`⚠️ LLM response unparseable, falling back`);
  } else {
    console.log(`⚠️ All LLM providers failed, falling back`);
  }

  // ===== DETERMINISTIC FALLBACK =====
  const fb = fallbackParse(message);
  if (!fb) {
    console.log(`❌ Fallback also failed`);
    return null;
  }

  if (fb.intent === 'query') {
    console.log(`✅ Query parsed by fallback`);
    return { type: 'query', date: today, raw: message, parsedBy: 'fallback', ...fb };
  }

  console.log(`✅ ${fb.items.length} transaction(s) by fallback`);
  const result = fb.items.map(item => ({ ...item, date: today, parsedBy: 'fallback' }));
  return result.length === 1 ? result[0] : result;
}

export { CATEGORIES };