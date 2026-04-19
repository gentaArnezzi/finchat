/**
 * Transaction Parser for FinChat
 * Strategy: Regex first → AI fallback for edge cases
 * 
 * Enhanced with comprehensive keyword matching and context awareness
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

/**
 * COMPREHENSIVE CATEGORY KEYWORDS
 * - Each keyword mapped to priority (1 = highest)
 * - More specific/longer keywords get higher priority
 * - Common transaction verbs mapped to categories
 */
const CATEGORY_KEYWORDS = {
  // === MAKANAN & MINUMAN ===
  // Primary: food & drinks consumption
  'Makanan & Minuman': [
    'makan', 'minum', 'kopi', 'teh', 'soto', 'nasi', 'ayam', 'mie', 'bakso',
    'pizza', 'burger', 'snack', 'roti', 'kue', 'es', 'jus', 'susu', 'wedang',
    'sarapan', 'siang', 'malam', 'lapar', 'lunch', 'dinner', 'breakfast',
    'food', 'cafe', 'café', 'restaurant', 'warteg', 'pedagang', 'rumah makan',
    'indomaret', 'alfamart', 'minimarket', 'convenience', 'starbucks',
    'kopi baik', 'gojek makan', 'grab makan', 'delivery', 'takeaway',
    'gorengan', 'cemilan', 'martabak', 'ketoprak', 'gudeg', 'rawon',
    'pecel', 'sambal', 'saus', 'rokok', 'sigaret', 'cigarette', 'ok',
    // Drinks specific
    'es teh', 'es kopi', 'es buah', 'es durian', 'es teler',
    'matcha', 'latte', 'cappuccino', 'americano', 'espresso',
    // Grocery
    'galon', 'air galon', 'gas elpigi', 'gas 3kg', 'gas 12kg'
  ],

  // === TRANSPORTASI ===
  // Primary: transportation costs, vehicle, fuel, parking
  'Transportasi': [
    'bensin', 'bbm', 'solar', 'pertamax', 'pertalite', 'premium',
    'parkir', 'parking', 'tol', 'highway', 'expressway',
    'ojek', 'gojek', 'grab', 'taxi', 'grabcar', 'gocar',
    'angkot', 'bus', 'buse', 'coach', 'kereta', 'commuter',
    'transjak', 'trans jakarta', 'mrt', 'lrt', 'krl',
    'sewa motor', 'sewa mobil', 'rental', 'lease',
    'bpkb', 'stnk', 'pajak motor', 'pajak mobil', 'tilang',
    'becak', 'becak', 'delman', 'andong', 'cidomo',
    'fuel', 'gas station', 'spbu', 'pertamina', 'shell',
    'parkirmall', 'parkir basement', 'parkir utama',
    'toll', 'fasilitas', ' entrance', ' exit',
    'airport', 'bandara', 'stadium', 'terminal',
    'travel', 'travelling', 'perjalanan'
  ],

  // === BELANJA ===
  // Primary: shopping, e-commerce, physical goods
  'Belanja': [
    'beli', 'shopping', 'belanja', 'shopping', 'toko', 'market',
    'supermarket', 'hypermarket', 'grossmart', 'carrefour', 'transmart',
    'tokopedia', 'shopee', 'lazada', 'bukalapak', 'blibli',
    'amazon', 'zalora', 'bibit', 'fashion', 'pakaian', 'baju',
    'celana', 'rok', 'dress', 'jaket', 'kemeja', 'kaos',
    'sepatu', 'sandal', 'tas', 'backpack', 'hoodie',
    'elektronik', 'gadget', 'hp', 'handphone', 'laptop',
    'komputer', 'monitor', 'keyboard', 'mouse', 'headset',
    'televisi', 'tv', 'speaker', 'earphone', 'airpod',
    'charger', 'casing', 'tempered glass', 'screen protector',
    'barang', 'produk', 'goods', 'item', 'order',
    'checkout', 'pembayaran', 'cod', 'cash on delivery',
    'flash sale', 'big sale', 'harbolnas', '11.11', '12.12',
    'zara', 'uniqlo', 'h&m', 'nike', 'adidas', 'puma',
    'wardah', 'make up', 'kosmetik', 'lipstik', ' foundation',
    'shop', 'toko online', 'olshop', 'reseller'
  ],

  // === HIBURAN ===
  // Primary: entertainment, recreation, leisure activities
  'Hiburan': [
    'nonton', 'watch', 'film', 'movie', 'bioskop', 'cinema',
    'konser', 'concert', 'festival', 'music', 'musik',
    'game', 'gaming', 'playstation', 'xbox', 'steam',
    'netflix', 'spotify', 'youtube', 'disney', 'hbo',
    'wetv', 'viu', 'iqiyi', 'vimeo', 'twitch',
    'tiket', 'ticket', 'masuk', 'admission',
    'karaoke', 'kara', 'rekreasi', 'tour', 'trip',
    'waterpark', 'amusement', 'theme park', 'dufan',
    'museum', 'gallery', 'exhibit', 'pameran',
    'bola', 'match', 'sepakbola', 'football', 'liga',
    'gym', 'fitness', 'senam', 'aerobik', 'yoga',
    'kolam', 'renang', 'swimming', 'pool', 'water',
    'bar', 'pub', 'club', 'clubbing', 'nightlife',
    '按摩', 'spa', 'massage', 'wellness',
    'internet', 'wifi', 'data', 'quota'
  ],

  // === KESEHATAN ===
  // Primary: medical, health, pharmacy
  'Kesehatan': [
    'obat', 'obat-obatan', 'medicine', 'meds',
    'dokter', 'doctor', 'dr', 'drg', 'sppd', 'spem',
    'rumah sakit', 'rs', 'hospital', 'klinik', 'clinic',
    'apotek', 'pharmacy', 'apotek', 'kimia farma',
    'medical', 'medis', 'cek', 'check', 'check up',
    'vitamin', 'suplemen', 'supplement', 'multi vitamin',
    'herbal', 'jamu', ' tradisional', 'acupuncture',
    'suntik', 'vaksin', 'vaccine', 'vacsin', 'booster',
    'rsud', 'rumah sehat', 'primary care',
    'obat kuat', 'viagra', 'Cialis',
    'alat kesehatan', 'alat medis', 'thermometer',
    'masker', 'face mask', 'hand sanitizer', 'handsanitizer',
    'cek labs', 'laboratorium', 'cek darah', 'cek gula',
    'cek kolestrol', 'cek tekanan', 'blood pressure',
    'ke dokter', 'periksa', 'diagnose', 'berobat'
  ],

  // === TAGIHAN ===
  // Primary: bills, utilities, recurring payments
  'Tagihan': [
    'listrik', 'pln', 'token listrik', 'tokenlistrik', 'token_listrik',
    'air', 'pam', 'pdam', 'air masuk', 'air mtan',
    'internet', 'wifi', 'indihome', 'firstmedia', 'biznet',
    'pulsa', 'kuota', 'data', 'internet data',
    'paket', 'delivery', 'kurir', 'jne', 'jnt', 'si Cepat',
    'langganan', 'subscription', 'subscribe', 'subs',
    'bpjs', 'bpjs kesehatan', 'bpjs ketenagakerjaan',
    'cicilan', 'angsuran', 'installment', 'credit',
    'iuran', 'iuran rt', 'iuran rw', 'settlement',
    'uang sekolah', 'uang spp', 'uang pembangunan',
    'uang kursus', 'les', 'tentor', 'tutorial',
    'asuransi', 'insurance', 'premi', 'premi asuransi',
    'tagihan', 'bill', 'invoice',
    'wifi.id', 'myrepublic', 'xl', 'tri', 'axis',
    'token listrikt', 'listrik token', 'tokenlight'
  ],

  // === GAJI ===
  // Primary: income, salary, money received
  'Gaji': [
    'gaji', 'salary', 'upah', 'honor', 'fee',
    'thr', 'tunjangan', 'bonus', '13th', 'bonus tahunan',
    'masuk', 'terima', 'dapat', 'uang masuk', 'penerimaan',
    'transfer masuk', 'saldo masuk', 'incoming',
    'pendapatan', 'income', 'revenue', 'earning',
    'komisi', 'komisi', 'commission', 'markup',
    'receh', 'uang receh', 'uang sehari',
    'profit', 'keuntungan', 'laba', 'rugi',
    'dividen', 'dividen', 'deviden', 'bagi hasil',
    'refund', 'pengembalian', 'return uang',
    'jual', 'jualan', 'penjualan', 'jual barang',
    'pembayaran', 'payment received', 'paid',
    'top up', 'isi saldo', 'deposit'
  ],

  // === INVESTASI ===
  // Primary: investment, savings, wealth building
  'Investasi': [
    'invest', 'investasi', 'investing', 'modal',
    'saham', 'stock', 'stocks', 'idx', 'ihsg', 'beidx',
    'reksadana', 'reksadana', 'mutual fund',
    'crypto', 'bitcoin', 'btc', 'eth', 'ethereum', 'dogecoin',
    'deposito', 'deposit', 'tabungan',
    'obligasi', 'bond', 'surat utang',
    'unit link', 'investment linked',
    'emas', 'gold', 'perak', 'silver',
    'investor', 'trader', 'trading',
    'trading place', 'broker', ' Sekuritas',
    'makelar', 'dealer', 'agent',
    'dana', 'dana kelola', 'dana kelolaan',
    'reksadana', 'syariah', 'reksadana syariah',
    'nft', 'token', 'token kripto',
    'poh', 'price coin', 'price',
    'buy', 'top up crypto', 'beli coin'
  ],

  // === LAINNYA ===
  // Fallback for uncategorized
  'Lainnya': [
    'lain', 'other', 'others', 'misc', 'miscellaneous'
  ]
};

/**
 * TRANSACTION VERBS that indicate the intent
 */
const TRANSACTION_VERBS = {
  type: {
    expense: ['bayar', 'beli', 'jual', 'belanja', 'spend', 'transfer', 'kirim', 'bayar', 'lunas', 'cicil', 'take', 'pay', 'checkout', 'tarik'],
    income: ['terima', 'dapat', 'masuk', 'jual', 'recevice', 'get', 'got', 'nabung', 'topup', 'deposit', 'transfer masuk', 'uang masuk', 'gaji', 'bonus', 'thr']
  },
  category: {
    'Makanan & Minuman': ['makan', 'minum', 'beli makan', 'beli kopi', 'beli makanan', 'jajan'],
    'Transportasi': ['bayar parkir', 'bayar tol', 'bayar bensin', 'naik', 'tumpangan'],
    'Belanja': ['beli', 'shopping', 'belanja', 'order', 'checkout'],
    'Hiburan': ['nonton', 'main', 'play', 'subscribe', 'streaming'],
    'Kesehatan': ['berobat', 'periksa', 'cek kesehatan', 'ke dokter', 'beli obat'],
    'Tagihan': ['bayar.listrik', 'bayar air', 'bayar wifi', 'bayar pulsa', 'bayar cicilan', 'bayar bpjs', 'bayar asuransi'],
    'Gaji': ['gajian', 'terima', 'dapat', 'masuk', 'jual'],
    'Investasi': ['invest', 'beli saham', 'beli reksadana', 'beli crypto', 'nabung', 'deposit']
  }
};

/**
 * INCOME SIGNAL WORDS
 */
const INCOME_KEYWORDS = [
  'gaji', 'salary', 'thr', 'bonus', 'terima', 'masuk', 'dapat',
  'uang masuk', 'transfer masuk', 'pembayaran masuk', 'saldo',
  'income', 'pendapatan', 'upah', 'fee', 'komisi', 'receh',
  'uang receh', 'profit', 'keuntungan', 'laba', 'jual', 'dividen',
  'refund', 'top up', 'isi saldo', 'deposit'
];

/**
 * EXPENSE SIGNAL WORDS
 */
const EXPENSE_KEYWORDS = [
  'bayar', 'beli', 'jual', 'belanja', 'spend', 'keluar',
  'spent', 'transaction', 'paid', 'checkout', 'lunas',
  'cicil', 'angsuran', 'tunai', 'cash', 'debit'
];

/**
 * Parse amount from Indonesian text
 * Handles: 10k, 10rb, 10jt, 1.5jt, 1.000, 1000, Rp10.000, etc.
 */
function parseAmount(text) {
  const lower = text.toLowerCase().replace(/\s+/g, ' ');
  if (!lower || typeof lower !== 'string') return 0;

  const patterns = [
    // Pattern 0: Decimal juta: "1.5jt", "1,5jt", "1.5 juta"
    {
      re: /(\d+)[.,](\d+)\s*(?:jt|juta)\b/i,
      calc: (m) => parseInt(m[1]) * 1000000 + parseInt(m[2]) * 100000
    },
    // Pattern 1: juta: "1jt", "2jt", "15jt", "1 juta", "2 juta"
    {
      re: /(\d+)\s*(?:jt|juta)\b/i,
      calc: (m) => parseInt(m[1]) * 1000000
    },
    // Pattern 2: ribu: "35rb", "35ribu", "35rbu", "35rebu"
    {
      re: /(\d+)\s*(?:rb|rbu|ribu|rebu)\b/i,
      calc: (m) => parseInt(m[1]) * 1000
    },
    // Pattern 3: "35k" or "35 k" (with space)
    {
      re: /(\d+)\s*k\b/i,
      calc: (m) => parseInt(m[1]) * 1000
    },
    // Pattern 4: "25k", "30k" (no space)
    {
      re: /(\d+)k\b/i,
      calc: (m) => parseInt(m[1]) * 1000
    },
    // Pattern 5: Formatted: "1.500.000" or "1,500,000" or "Rp 1500000"
    {
      re: /(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+)/i,
      calc: (m) => parseInt(m[1].replace(/[.,]/g, ''))
    },
    // Pattern 6: Raw number >= 1000 (fallback)
    {
      re: /\b(\d{4,})\b/,
      calc: (m) => parseInt(m[1])
    }
  ];

  for (const p of patterns) {
    const match = lower.match(p.re);
    if (match) {
      try {
        return p.calc(match);
      } catch (e) {
        continue;
      }
    }
  }
  return 0;
}

/**
 * Parse ALL amounts from text (for multiple transactions)
 */
function parseAllAmounts(text) {
  const lower = text.toLowerCase().replace(/\s+/g, ' ');
  if (!lower) return [];

  const amounts = [];

  // Pattern groups
  const patternGroups = [
    { re: /(\d+)\s*(?:jt|juta)/gi, multiplier: 1000000 },
    { re: /(\d+)\s*(?:rb|rbu|ribu|rebu)/gi, multiplier: 1000 },
    { re: /(\d+)\s*k\b/gi, multiplier: 1000 },
    { re: /(\d+)k\b/gi, multiplier: 1000 },
    { re: /\b(\d{4,})\b/g, multiplier: 1 }
  ];

  for (const pg of patternGroups) {
    const matches = [...lower.matchAll(pg.re)];
    for (const match of matches) {
      const numStr = match[1] || match[0].replace(/[^\d]/g, '');
      const amount = parseInt(numStr) * pg.multiplier;
      if (amount >= 1000 && !amounts.includes(amount)) {
        amounts.push(amount);
      }
    }
  }

  // Sort descending (largest first - usually the main amount)
  return [...new Set(amounts)].sort((a, b) => b - a);
}

/**
 * Detect transaction type (income vs expense)
 */
function detectType(text) {
  const lower = text.toLowerCase();
  
  // Check income keywords first (they're more specific)
  for (const kw of INCOME_KEYWORDS) {
    if (lower.includes(kw)) return 'income';
  }
  
  return 'expense';
}

/**
 * COMPREHENSIVE CATEGORY DETECTION
 * Priority: 
 * 1. Keywords BEFORE the amount
 * 2. High-priority specific keywords
 * 3. Position-aware detection
 */
function detectCategory(text, type = 'expense') {
  const lower = text.toLowerCase();
  const amount = parseAmount(text);
  
  // Find amount position for context
  let amountPos = -1;
  if (amount > 0) {
    // Try various amount representations
    const representations = [
      (amount / 1000000) + 'jt',
      (amount / 1000) + 'k',
      amount.toString()
    ];
    for (const rep of representations) {
      amountPos = lower.indexOf(rep);
      if (amountPos !== -1) break;
    }
  }

  // Collect ALL keyword matches with their positions
  const matches = [];
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'Lainnya') continue; // Skip fallback category
    
    for (const kw of keywords) {
      const pos = lower.indexOf(kw);
      if (pos !== -1) {
        matches.push({
          category,
          keyword: kw,
          position: pos,
          keywordLength: kw.length,
          // Distance to amount (if available)
          distanceToAmount: amountPos !== -1 ? Math.abs(pos - amountPos) : 999,
          // Is keyword BEFORE amount? (more likely to describe the transaction)
          isBeforeAmount: amountPos !== -1 && pos < amountPos
        });
      }
    }
  }

  if (matches.length === 0) {
    return type === 'income' ? 'Gaji' : 'Lainnya';
  }

  // === SORTING PRIORITY ===
  // 1. Keywords BEFORE amount get priority (context describes what you're paying for)
  // 2. Longer/more specific keywords get priority
  // 3. Keywords closer to amount get priority
  
  matches.sort((a, b) => {
    // Priority 1: "Before amount" gets huge bonus
    if (a.isBeforeAmount !== b.isBeforeAmount) {
      return a.isBeforeAmount ? -1 : 1;
    }
    
    // Priority 2: High-priority transport keywords
    const transportPriority = ['parkir', 'bensin', 'tol', 'ojek', 'gojek', 'grab'];
    const aIsTransport = transportPriority.includes(a.keyword);
    const bIsTransport = transportPriority.includes(b.keyword);
    if (aIsTransport !== bIsTransport) {
      return aIsTransport ? -1 : 1;
    }
    
    // Priority 3: Keyword length (longer = more specific)
    if (a.keywordLength !== b.keywordLength) {
      return b.keywordLength - a.keywordLength;
    }
    
    // Priority 4: Distance to amount
    if (a.distanceToAmount !== b.distanceToAmount) {
      return a.distanceToAmount - b.distanceToAmount;
    }
    
    return 0;
  });

  return matches[0].category;
}

/**
 * Extract description from text
 */
function extractDescription(text, amount) {
  if (!text) return 'Transaksi';
  
  let desc = text;
  
  // Remove amount patterns
  const amountPatterns = [
    /(\d+)[.,]?(\d*)\s*(?:jt|juta|rb|rbu|ribu|k)\b/gi,
    /(?:rp\.?\s*)?\d{1,3}(?:[.,]\d{3})+/gi,
    /\b\d{4,}\b/g,
  ];
  
  for (const p of amountPatterns) {
    desc = desc.replace(p, '');
  }
  
  // Clean common patterns
  desc = desc
    .replace(/^abis\s+/i, '')
    .replace(/^dari\s+/i, '')
    .replace(/^beli\s+/i, '')
    .replace(/^ke\s+/i, '')
    .replace(/^bayar\s+/i, '')
    .replace(/^dengan\s+/i, '')
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
 * MAIN REGEX PARSER
 */
function regexParse(message) {
  if (!message || typeof message !== 'string') return null;
  
  const singleAmount = parseAmount(message);
  const allAmounts = parseAllAmounts(message);
  const type = detectType(message);

  // === CASE: Multiple Transactions ===
  if (allAmounts.length > 1) {
    const uniqueAmounts = [...new Set(allAmounts)];
    
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

    const transactions = [];
    const lowerMsg = message.toLowerCase();
    
    // Sort by position in message
    const amountPositions = uniqueAmounts.map(amt => {
      const amtStr = amt >= 1000000 
        ? (amt / 1000000) + 'jt'
        : (amt / 1000) + 'k';
      const pos = lowerMsg.indexOf(amtStr);
      return { amount: amt, pos: pos >= 0 ? pos : 999 };
    }).sort((a, b) => a.pos - b.pos);

    for (let i = 0; i < amountPositions.length; i++) {
      const { amount, pos } = amountPositions[i];
      
      let contextBefore = '';
      if (pos > 0 && pos < message.length) {
        contextBefore = message.substring(0, pos).trim();
      }
      
      let desc = contextBefore
        .replace(/^abis\s+/i, '')
        .replace(/^dari\s+/i, '')
        .replace(/^beli\s+/i, '')
        .replace(/^bayar\s+/i, '')
        .replace(/,\s*$/, '')
        .trim();
      
      if (!desc) {
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

  // === CASE: Single Transaction ===
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
 * GEMINI AI FALLBACK
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

Format JSON:
- Jika 1 transaksi: {"type":"expense/income","amount":number,"category":"kategori","description":"deskripsi","date":"${today}"}
- Jika multi: [{"type":"expense","amount":25000,"category":"Makanan & Minuman","description":"Kopi","date":"${today}"}]

Jawab JSON saja, tanpa markdown.`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
      
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
        console.log(`⚠️ Gemini API error ${response.status}: ${errorText.substring(0, 100)}`);
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
        console.log(`⚠️ Failed to parse Gemini JSON: ${cleanJson.substring(0, 80)}`);
        return null;
      }

      if (!parsed || (Array.isArray(parsed) && parsed.length === 0)) return null;

      return (Array.isArray(parsed) ? parsed : [parsed])
        .filter(tx => tx.amount > 0)
        .map(tx => ({
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
 * MAIN PARSER EXPORT
 */
export async function parseTransaction(message) {
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return null;
  }

  // === TIER 1: REGEX ===
  const regexResult = regexParse(message);
  if (regexResult && regexResult.length > 0) {
    const firstTx = Array.isArray(regexResult) ? regexResult[0] : regexResult;
    console.log(`✅ Regex: "${message}" → ${firstTx.amount} (${firstTx.category})`);
    return regexResult;
  }

  // === TIER 2: GEMINI FALLBACK ===
  console.log(`🤖 Regex failed, trying Gemini: "${message}"`);
  const aiResult = await geminiFallback(message);
  if (aiResult && aiResult.length > 0) {
    const firstTx = Array.isArray(aiResult) ? aiResult[0] : aiResult;
    console.log(`✅ Gemini: "${message}" → ${firstTx.amount} (${firstTx.category})`);
    return aiResult;
  }

  console.log(`❌ Parse failed: "${message}"`);
  return null;
}

export { CATEGORIES, CATEGORY_KEYWORDS };