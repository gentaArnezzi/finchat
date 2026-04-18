import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
  'Makanan & Minuman': ['makan', 'minum', 'kopi', 'teh', 'sarapan', 'siang', 'malam', 'lunch', 'dinner', 'breakfast', 'food', 'cafe', 'starbucks', 'warteg', 'pedagang', 'rumah makan', 'restoran', 'ayam', 'nasi', 'soto', 'bakso', 'mie', 'gorengan', 'snack', 'cemilan'],
  'Transportasi': ['bensin', 'parkir', 'tol', 'ojek', 'grab', 'gojek', 'taxi', 'buse', 'kereta', 'bicycle', 'motor', 'mobil', 'sewa', 'fuel', 'transport', 'commuter', 'transjak', 'angkot'],
  'Belanja': ['beli', 'shopping', 'belanja', 'toko', 'market', 'supermarket', 'minimarket', 'indomaret', 'alfamart', 'tokopedia', 'shopee', 'lazada', 'amazon', 'fashion', 'pakaian', 'sepatu', 'tas', 'elektronik'],
  'Hiburan': ['film', 'movie', 'bioskop', 'nonton', 'konser', 'game', 'gaming', 'netflix', 'spotify', 'youtube', 'spotify', 'tv', 'masuk', 'taman', 'rekreasi', '_LIB', 'karaoke'],
  'Kesehatan': ['obat', 'dokter', 'rumah sakit', 'klinik', 'apotek', 'obat', 'vitamin', 'medical', 'health', 'rumah sakit', 'cek', 'check up', 'laboratorium', 'obat', 'herbal'],
  'Tagihan': ['listrik', 'air', 'internet', 'pulsa', 'token', 'token listrik', 'pbb', 'cicilan', 'angsuran', 'wifi', 'phone', 'bill', 'tagihan', 'bpjs', 'asuransi'],
  'Gaji': ['gaji', 'salary', 'upah', 'bonus', 'thr', 'tunjangan', 'income', 'pendapatan', 'uang masuk', 'receiving', 'pembayaran', 'payment received', 'transfer masuk'],
  'Investasi': ['invest', 'investasi', 'saham', 'reksadana', 'crypto', 'bitcoin', 'obligasi', 'deposito', 'emerald', 'gold', 'emas', 'unit link', 'investment'],
  'Lainnya': []
};

function detectCategory(text, amount, type) {
  const lowerText = text.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return category;
    }
  }
  
  if (type === 'income') {
    return 'Gaji';
  }
  
  return 'Lainnya';
}

export async function parseTransaction(message) {
  try {
    const systemPrompt = `You are a financial transaction parser for an Indonesian personal finance app called FinChat. Your task is to extract structured transaction data from natural language messages in Indonesian.

CATEGORIES (use these exact names):
- Makanan & Minuman (food & drinks)
- Transportasi (transportation)
- Belanja (shopping)
- Hiburan (entertainment)
- Kesehatan (health)
- Tagihan (bills)
- Gaji (salary/income)
- Investasi (investment)
- Lainnya (other)

RULES:
1. Detect transaction type (income/expense) from context
2. Extract amount in IDR (Indonesian Rupiah)
3. Detect category from keywords in the message
4. Extract description (what the transaction is for)
5. If date not mentioned, use today

AMOUNT PATTERNS TO DETECT:
- "25rb", "25k", "25000" → 25000
- "1jt", "1juta", "1000000" → 1000000
- "50rbu", "50000" → 50000
- "100k" → 100000
- "5jt" → 5000000

Respond ONLY with valid JSON in this exact format:
{
  "type": "income" or "expense",
  "amount": number,
  "category": "exact category name from list above",
  "description": "brief description of transaction",
  "date": "YYYY-MM-DD" (today if not specified)
}

If you cannot determine the amount, return null.`;

    const userMessage = message;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage }
      ]
    });

    const content = response.content[0].text;
    let parsed;
    
    try {
      parsed = JSON.parse(content);
    } catch {
      const fallbackParsed = detectCategory(message, 0, 'expense');
      return {
        type: fallbackParsed === 'Gaji' ? 'income' : 'expense',
        amount: 0,
        category: fallbackParsed,
        description: message,
        date: new Date().toISOString().split('T')[0]
      };
    }

    if (!parsed.amount || parsed.amount === 0) {
      return null;
    }

    return {
      type: parsed.type || 'expense',
      amount: parsed.amount,
      category: parsed.category || detectCategory(message, parsed.amount, parsed.type),
      description: parsed.description || message,
      date: parsed.date || new Date().toISOString().split('T')[0]
    };
  } catch (error) {
    console.error('Error parsing transaction:', error.message);
    
    const amountMatch = message.match(/(\d{3,})/);
    const amount = amountMatch ? parseInt(amountMatch[1]) : 0;
    const type = message.toLowerCase().includes('gaji') || 
                 message.toLowerCase().includes('terima') || 
                 message.toLowerCase().includes('masuk') ? 'income' : 'expense';
    const category = detectCategory(message, amount, type);
    
    return {
      type,
      amount,
      category,
      description: message,
      date: new Date().toISOString().split('T')[0]
    };
  }
}

export { CATEGORIES, CATEGORY_KEYWORDS };