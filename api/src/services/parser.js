/**
 * Hybrid Transaction Parser
 * Tier 1: Regex-based parser (FREE, handles ~80% of messages)
 * Tier 2: Gemini Flash API fallback (FREE tier / very cheap)
 * 
 * Replaces Claude API to minimize costs.
 */

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
  'Makanan & Minuman': ['makan', 'minum', 'kopi', 'teh', 'sarapan', 'siang', 'malam', 'lunch', 'dinner', 'breakfast', 'food', 'cafe', 'starbucks', 'warteg', 'rumah makan', 'restoran', 'resto', 'ayam', 'nasi', 'soto', 'bakso', 'mie', 'gorengan', 'snack', 'cemilan', 'jajan', 'boba', 'pizza', 'burger', 'rendang', 'padang', 'seafood', 'martabak', 'roti', 'kue', 'dessert', 'es', 'juice', 'jus', 'susu', 'indomie', 'minuman'],
  'Transportasi': ['bensin', 'parkir', 'tol', 'ojek', 'ojol', 'grab', 'gojek', 'taxi', 'taksi', 'bus', 'kereta', 'mrt', 'lrt', 'krl', 'motor', 'mobil', 'fuel', 'transport', 'commuter', 'transjakarta', 'angkot', 'becak', 'kapal', 'pesawat', 'tiket', 'bbm', 'solar', 'pertalite', 'pertamax'],
  'Belanja': ['beli', 'shopping', 'belanja', 'toko', 'market', 'supermarket', 'minimarket', 'indomaret', 'alfamart', 'tokopedia', 'shopee', 'lazada', 'fashion', 'pakaian', 'baju', 'celana', 'sepatu', 'tas', 'elektronik', 'gadget', 'hp', 'laptop', 'online', 'olshop'],
  'Hiburan': ['film', 'movie', 'bioskop', 'nonton', 'konser', 'game', 'gaming', 'netflix', 'spotify', 'youtube', 'disney', 'tv', 'taman', 'rekreasi', 'karaoke', 'jalan-jalan', 'wisata', 'liburan', 'vacation', 'piknik', 'hangout', 'nongkrong'],
  'Kesehatan': ['obat', 'dokter', 'rumah sakit', 'rs', 'klinik', 'apotek', 'vitamin', 'medical', 'health', 'check up', 'lab', 'laboratorium', 'gigi', 'mata', 'terapi', 'fisio', 'bpjs'],
  'Tagihan': ['listrik', 'air', 'pdam', 'internet', 'pulsa', 'token', 'pbb', 'cicilan', 'angsuran', 'kredit', 'wifi', 'indihome', 'telkom', 'bill', 'tagihan', 'bpjs', 'asuransi', 'sewa', 'kos', 'kontrakan', 'iuran', 'spp', 'pajak'],
  'Gaji': ['gaji', 'salary', 'upah', 'bonus', 'thr', 'tunjangan', 'income', 'pendapatan', 'terima', 'transfer masuk', 'freelance', 'honor', 'komisi', 'fee', 'dapat', 'dapet', 'masuk'],
  'Investasi': ['invest', 'investasi', 'saham', 'reksadana', 'crypto', 'bitcoin', 'obligasi', 'deposito', 'emas', 'gold', 'dividen', 'trading', 'forex'],
  'Lainnya': []
};

// Income indicator words - comprehensive list
const INCOME_KEYWORDS = [
  // Direct income words
  'gaji', 'salary', 'terima', 'masuk', 'income', 'pendapatan', 
  'bonus', 'thr', 'freelance', 'honor', 'dividen', 'komisi', 'fee', 
  'dapat', 'dapet', 'transfer masuk', 'tunjangan', 'upah',
  // Indonesian variations
  'uang masuk', 'uang yang masuk', 'penerimaan', 'pemasukan',
  'dapat uang', 'dapet uang', 'nenerima uang', 'uang terima',
  'dibayar', 'dapat payment', 'dapat bayaran', 'fee proyek',
  'penjualan', 'jual', 'laku', 'terjual',
  // English
  'received', 'earned', 'get paid', 'payment received',
  'profit', 'revenue', 'sale proceeds'
];

/**
 * Parse amount from Indonesian text
 * Handles: 35rb, 35k, 35000, 1.5jt, 1,5juta, 35ribu, etc.
 */
function parseAmount(text) {
  const lower = text.toLowerCase().replace(/\s+/g, ' ');

  // Patterns ordered from most specific to least
  const patterns = [
    // 1.5jt, 1,5jt, 1.5juta, 2,5 juta
    /(\d+)[.,](\d+)\s*(?:jt|juta)/i,
    // 1jt, 2juta, 15jt
    /(\d+)\s*(?:jt|juta)/i,
    // 35rb, 35ribu, 35rbu, 100rb
    /(\d+)\s*(?:rb|rbu|ribu)/i,
    // 35k, 100k
    /(\d+)\s*k\b/i,
    // Raw numbers >= 1000 (likely IDR)
    /(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+)(?!\d)/i,
    // Raw numbers >= 1000
    /(\d{4,})/,
  ];

  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (match) {
      if (pattern === patterns[0]) {
        // Decimal juta: 1.5jt = 1,500,000
        return parseInt(match[1]) * 1000000 + parseInt(match[2]) * 100000;
      }
      if (pattern === patterns[1]) {
        // juta: 1jt = 1,000,000
        return parseInt(match[1]) * 1000000;
      }
      if (pattern === patterns[2]) {
        // ribu: 35rb = 35,000
        return parseInt(match[1]) * 1000;
      }
      if (pattern === patterns[3]) {
        // k: 35k = 35,000
        return parseInt(match[1]) * 1000;
      }
      if (pattern === patterns[4]) {
        // Formatted number: 1.500.000 or 1,500,000
        return parseInt(match[1].replace(/[.,]/g, ''));
      }
      // Raw number
      return parseInt(match[1]);
    }
  }
  return 0;
}

/**
 * Parse all amounts from text (for multiple transactions)
 */
function parseAllAmounts(text) {
  const lower = text.toLowerCase().replace(/\s+/g, ' ');
  const amounts = [];

  // Pattern for all amount formats with their multipliers
  const allPatterns = [
    { regex: /(\d+)[.,](\d+)\s*(?:jt|juta)/i, multiplier: (m) => parseInt(m[1]) * 1000000 + parseInt(m[2]) * 100000 },
    { regex: /(\d+)\s*(?:jt|juta)/i, multiplier: (m) => parseInt(m[1]) * 1000000 },
    { regex: /(\d+)\s*(?:rb|rbu|ribu)/i, multiplier: (m) => parseInt(m[1]) * 1000 },
    { regex: /(\d+)\s*k\b/i, multiplier: (m) => parseInt(m[1]) * 1000 },
    { regex: /(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+)(?!\d)/i, multiplier: (m) => parseInt(m[1].replace(/[.,]/g, '')) },
    { regex: /(\d{4,})/g, multiplier: (m) => parseInt(m[1]) },
  ];

  // Global patterns that can find multiple matches
  const globalPatterns = [
    /(\d+)\s*(?:rb|rbu|ribu)/gi,
    /(\d+)\s*k\b/gi,
    /(\d+)\s*(?:jt|juta)/gi,
    /(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+)/gi,
    /(\d{4,})/g,
  ];

  for (const pattern of globalPatterns) {
    const matches = [...lower.matchAll(pattern)];
    for (const match of matches) {
      const amountStr = match[1] || match[0].replace(/[^\d]/g, '');
      let amount = parseInt(amountStr.replace(/[.,]/g, ''));
      
      // Apply multiplier based on suffix
      if (match[0].toLowerCase().includes('jt') || match[0].toLowerCase().includes('juta')) {
        if (amount < 100) amount *= 1000000;
        else amount *= 1000000;
      } else if (match[0].toLowerCase().includes('rb') || match[0].toLowerCase().includes('ribu') || match[0].toLowerCase().includes('k')) {
        amount *= 1000;
      }
      
      if (amount >= 1000 && !amounts.includes(amount)) {
        amounts.push(amount);
      }
    }
  }

  return amounts.sort((a, b) => b - a); // Sort descending
}

  return 0;
}

/**
 * Detect transaction type (income or expense)
 */
function detectType(text) {
  const lower = text.toLowerCase();
  
  // Check for income keywords FIRST
  for (const keyword of INCOME_KEYWORDS) {
    if (lower.includes(keyword)) return 'income';
  }
  
  // Check for expense keywords
  const EXPENSE_KEYWORDS = [
    'beli', 'bayar', 'kirim', 'transfer', 'keluar', 'spent',
    'belanja', 'jajan', 'beli', 'bayar', 'lunas', 'cicil',
    'uang', 'tunai', 'kartu', 'debit', 'kredit'
  ];
  
  // Only return expense if we find strong expense keywords
  // NOT just "uang" alone
  for (const keyword of EXPENSE_KEYWORDS) {
    if (keyword === 'uang' && !lower.includes('uang masuk')) continue;
    if (lower.includes(keyword)) return 'expense';
  }
  
  return 'expense';
}

/**
 * Detect category from text keywords
 */
function detectCategory(text, type) {
  const lower = text.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.length === 0) continue;
    if (keywords.some(kw => lower.includes(kw))) {
      return category;
    }
  }

  // Default based on type
  if (type === 'income') return 'Gaji';
  return 'Lainnya';
}

/**
 * Clean and extract description
 */
function extractDescription(text) {
  // Remove amount-related tokens
  let desc = text
    .replace(/(\d+)[.,]?(\d*)\s*(?:jt|juta|rb|rbu|ribu|k)\b/gi, '')
    .replace(/(?:rp\.?\s*)?\d{1,3}(?:[.,]\d{3})+/gi, '')
    .replace(/\b\d{4,}\b/g, '')
    .replace(/^\s*[-–]\s*/, '')
    .trim();

  // Capitalize first letter
  if (desc) {
    desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  }

  return desc || text.trim();
}

/**
 * TIER 1: Regex-based parser
 * Returns parsed transaction or null if confidence is too low
 */
function regexParse(message) {
  // First try single amount parse
  const singleAmount = parseAmount(message);
  
  // Check for multiple amounts
  const allAmounts = parseAllAmounts(message);
  
  // If multiple different amounts found, create multiple transactions
  if (allAmounts.length > 1) {
    console.log(`📊 Detected multiple transactions: ${allAmounts.length} amounts found`);
    
    // Parse each amount individually to get proper category/description
    const transactions = [];
    const type = detectType(message);
    
    for (const amount of allAmounts) {
      // Find the amount in the original message to get context for category
      const amountStr = amount >= 1000000 
        ? (amount / 1000000) + 'jt'
        : (amount / 1000) + 'rb';
      
      // Find the position to extract description around this amount
      const pos = message.toLowerCase().indexOf(amountStr);
      let contextMsg = message;
      if (pos > 0) {
        const start = Math.max(0, pos - 30);
        const end = Math.min(message.length, pos + 30);
        contextMsg = message.substring(start, end);
      }
      
      const category = detectCategory(contextMsg, type);
      const description = extractDescription(contextMsg) || 'Multi-transaksi';
      
      transactions.push({
        type,
        amount,
        category,
        description,
        date: new Date().toISOString().split('T')[0],
        parsedBy: 'regex'
      });
    }
    
    return transactions.length > 0 ? transactions : null;
  }
  
  // Single transaction (original logic)
  if (singleAmount === 0) return null;

  const type = detectType(message);
  const category = detectCategory(message, type);
  const description = extractDescription(message);
  const date = new Date().toISOString().split('T')[0];

  return [{
    type,
    amount: singleAmount,
    category,
    description,
    date,
    parsedBy: 'regex'
  }];
}

/**
 * TIER 2: Gemini Flash API fallback
 */
async function geminiParse(message) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set, skipping AI parse');
    return null;
  }

  const today = new Date().toISOString().split('T')[0];

  const prompt = `Kamu adalah parser transaksi keuangan untuk aplikasi Indonesia. Ekstrak data dari pesan berikut.

KATEGORI (gunakan nama persis):
Makanan & Minuman, Transportasi, Belanja, Hiburan, Kesehatan, Tagihan, Gaji, Investasi, Lainnya

ATURAN:
- Deteksi tipe: "income" (pemasukan) atau "expense" (pengeluaran)
- Ekstrak jumlah dalam Rupiah (25rb=25000, 1jt=1000000, 50k=50000)
- Deteksi kategori dari konteks
- Jika tanggal tidak disebutkan, gunakan ${today}

Pesan: "${message}"

Jawab HANYA dengan JSON valid:
{"type":"income/expense","amount":number,"category":"nama kategori","description":"deskripsi singkat","date":"YYYY-MM-DD"}`;

  try {
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 200,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', response.status, errText);
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) return null;

    // Clean potential markdown code blocks
    const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (!parsed.amount || parsed.amount === 0) return null;

    return {
      type: parsed.type || 'expense',
      amount: parsed.amount,
      category: CATEGORIES.includes(parsed.category) ? parsed.category : detectCategory(message, parsed.type),
      description: parsed.description || message,
      date: parsed.date || today,
      parsedBy: 'gemini'
    };
  } catch (error) {
    console.error('Gemini parse error:', error.message);
    return null;
  }
}

/**
 * Main hybrid parser: Regex first → Gemini Flash fallback
 */
export async function parseTransaction(message) {
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return null;
  }

  // Tier 1: Try regex parsing
  const regexResult = regexParse(message);
  if (regexResult) {
    console.log(`✅ Parsed by regex: ${message} → ${regexResult.amount} (${regexResult.category})`);
    return regexResult;
  }

  // Tier 2: Try Gemini Flash
  console.log(`🤖 Regex failed, trying Gemini Flash: "${message}"`);
  const geminiResult = await geminiParse(message);
  if (geminiResult) {
    console.log(`✅ Parsed by Gemini: ${message} → ${geminiResult.amount} (${geminiResult.category})`);
    return geminiResult;
  }

  // Both failed
  console.log(`❌ Could not parse: "${message}"`);
  return null;
}

export { CATEGORIES, CATEGORY_KEYWORDS, regexParse, geminiParse };
