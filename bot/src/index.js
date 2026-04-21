import Grammy from 'grammy';
const { Bot, session } = Grammy;

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN || '');

bot.use(
  session({
    initial: () => ({
      pendingTransaction: undefined,
      awaitingAmount: false,
      awaitingCategory: false,
      onboarding: false,
      onboardingStep: 0,
      pendingDelete: undefined,
    }),
  })
);

bot.catch((err) => {
  console.error('Bot error:', err);
});

const API_URL = process.env.API_URL || 'http://localhost:3001';
const WEB_URL = process.env.WEB_URL || 'https://finchat.tspdigital.id';

const CATEGORY_ICONS = {
  'Makanan & Minuman': '🍔',
  'Transportasi': '🚌',
  'Belanja': '🛒',
  'Hiburan': '🎮',
  'Kesehatan': '💊',
  'Tagihan': '📄',
  'Gaji': '💰',
  'Investasi': '📈',
  'Pinjaman': '🤝',
  'Lainnya': '📦'
};

const getCategoryIcon = (categoryName) => CATEGORY_ICONS[categoryName] || '📦';

const formatRupiah = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const sendToAPI = async (endpoint, data) => {
  try {
    const response = await axios.post(`${API_URL}${endpoint}`, data, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error(`API error at ${endpoint}:`, error.message);
    throw error;
  }
};

const getFromAPI = async (endpoint, token) => {
  try {
    const response = await axios.get(`${API_URL}${endpoint}`, {
      timeout: 10000,
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error(`API GET error at ${endpoint}:`, error.message);
    throw error;
  }
};

const registerUser = async (telegramId, name, username) => {
  return sendToAPI('/api/users/register', { telegram_id: telegramId, name, username });
};

const loginAndGetToken = async (telegramId, name = '', username = '') => {
  const res = await sendToAPI('/api/users/login', { telegram_id: telegramId, name, username });
  return res.token;
};

const parseTransaction = async (message) => {
  const { data } = await sendToAPI('/api/transactions/parse', { message });
  return data;
};

const createTransaction = async (telegramId, amount, type, category, description, date) => {
  const token = await loginAndGetToken(telegramId);
  const response = await axios.post(
    `${API_URL}/api/transactions`,
    { amount, type, category, description, date },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

const getUserTransactions = async (telegramId, days = 7) => {
  const token = await loginAndGetToken(telegramId);
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const response = await axios.get(
    `${API_URL}/api/transactions?startDate=${startDate}&endDate=${endDate}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data.transactions;
};

const getUserStats = async (telegramId, startDate, endDate) => {
  const token = await loginAndGetToken(telegramId);
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await axios.get(
    `${API_URL}/api/transactions/stats?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data.stats;
};

const getTodaySummary = async (telegramId) => {
  const today = new Date().toISOString().split('T')[0];
  return getUserStats(telegramId, today, today);
};

const checkTransactionLimit = async (telegramId) => {
  const token = await loginAndGetToken(telegramId);
  const userRes = await getFromAPI('/api/users/me', token);
  const user = userRes.user;

  if (user.plan !== 'free') return { allowed: true };

  const now = new Date();
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const endOfMonth = now.toISOString().split('T')[0];

  const txRes = await axios.get(
    `${API_URL}/api/transactions?startDate=${startOfMonth}&endDate=${endOfMonth}&limit=51`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const count = txRes.data.transactions.length;
  return { allowed: count < 50, count, limit: 50 };
};

// ============================================
// QUERY HANDLING (NEW — replaces old isQuery keyword block)
// ============================================

const fmtDate = (d) => d.toISOString().split('T')[0];

/**
 * Convert parser timeframe string to { startDate, endDate, periodName }.
 */
function resolveTimeframe(timeframe) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  switch (timeframe) {
    case 'day': {
      const d = fmtDate(now);
      return { startDate: d, endDate: d, periodName: 'Hari Ini' };
    }
    case 'yesterday': {
      const d = new Date(year, month, day - 1);
      const s = fmtDate(d);
      return { startDate: s, endDate: s, periodName: 'Kemarin' };
    }
    case 'week': {
      const startOfWeek = new Date(year, month, day - now.getDay());
      return { startDate: fmtDate(startOfWeek), endDate: fmtDate(now), periodName: 'Minggu Ini' };
    }
    case 'last_week': {
      const lastWeekStart = new Date(year, month, day - 7 - now.getDay());
      const lastWeekEnd = new Date(year, month, day - 1 - now.getDay());
      return { startDate: fmtDate(lastWeekStart), endDate: fmtDate(lastWeekEnd), periodName: 'Minggu Lalu' };
    }
    case 'month': {
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      return { startDate, endDate: fmtDate(now), periodName: now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) };
    }
    case 'last_month': {
      const lastMonth = new Date(year, month - 1, 1);
      const lastMonthEnd = new Date(year, month, 0);
      return {
        startDate: fmtDate(lastMonth),
        endDate: fmtDate(lastMonthEnd),
        periodName: lastMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      };
    }
    case 'year': {
      return { startDate: `${year}-01-01`, endDate: `${year}-12-31`, periodName: `Tahun ${year}` };
    }
    case 'last_year': {
      const ly = year - 1;
      return { startDate: `${ly}-01-01`, endDate: `${ly}-12-31`, periodName: `Tahun ${ly}` };
    }
    case 'all':
    default: {
      return { startDate: '2020-01-01', endDate: fmtDate(now), periodName: 'Semua Waktu' };
    }
  }
}

/**
 * Handle a query result from the parser.
 * Parser returns: { type: 'query', query, timeframe, special, category, ... }
 */
async function handleQuery(ctx, queryResult) {
  const from = ctx.from;
  const { query, timeframe, special } = queryResult;

  const { startDate, endDate, periodName } = resolveTimeframe(timeframe);

  try {
    // Special case: category breakdown or highest category
    if (special === 'highest' || special === 'category') {
      return await handleCategoryBreakdown(ctx, from, startDate, endDate, periodName, special);
    }

    const stats = await getUserStats(from.id, startDate, endDate);
    const expense = stats.expense?.total || 0;
    const income = stats.income?.total || 0;
    const expenseCount = stats.expense?.count || 0;
    const incomeCount = stats.income?.count || 0;

    let response = `📊 *Laporan ${periodName}*\n\n`;

    if (query === 'income') {
      response += `💰 Total Pemasukan: ${formatRupiah(income)}\n💵 ${incomeCount} transaksi`;
    } else if (query === 'expense') {
      response += `💸 Total Pengeluaran: ${formatRupiah(expense)}\n📝 ${expenseCount} transaksi`;
    } else if (query === 'balance') {
      response += `💰 Pemasukan: ${formatRupiah(income)}\n💸 Pengeluaran: ${formatRupiah(expense)}\n━━━━━━━━━━━━━━\n📈 *Saldo: ${formatRupiah(income - expense)}*`;
    } else { // 'all'
      response += `💰 Pemasukan: ${formatRupiah(income)} (${incomeCount} txn)\n💸 Pengeluaran: ${formatRupiah(expense)} (${expenseCount} txn)\n━━━━━━━━━━━━━━\n📈 Saldo: ${formatRupiah(income - expense)}`;
    }

    response += `\n\n💡 Ketik /statistik untuk detail per kategori`;
    await ctx.reply(response, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('handleQuery error:', err.message);
    await ctx.reply('Maaf, ada masalah mengambil data. Coba lagi.');
  }
}

async function handleCategoryBreakdown(ctx, from, startDate, endDate, periodName, special) {
  try {
    const token = await loginAndGetToken(from.id);

    // Fetch transactions in range and aggregate locally
    const res = await axios.get(
      `${API_URL}/api/transactions?startDate=${startDate}&endDate=${endDate}&limit=1000`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const transactions = res.data.transactions || [];

    const expenseTxns = transactions.filter(t => t.type === 'expense');
    if (expenseTxns.length === 0) {
      return await ctx.reply(`📊 *${periodName}*\n\nBelum ada pengeluaran di periode ini.`, { parse_mode: 'Markdown' });
    }

    // Group by category
    const byCategory = {};
    for (const t of expenseTxns) {
      const cat = t.category_name || t.category || 'Lainnya';
      byCategory[cat] = (byCategory[cat] || 0) + parseFloat(t.amount);
    }

    const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

    if (special === 'highest') {
      const [topCat, topAmount] = sorted[0];
      const icon = getCategoryIcon(topCat);
      const total = sorted.reduce((s, [, v]) => s + v, 0);
      const pct = ((topAmount / total) * 100).toFixed(0);
      await ctx.reply(
        `🏆 *Pengeluaran Terbesar - ${periodName}*\n\n${icon} *${topCat}*\n💸 ${formatRupiah(topAmount)} (${pct}% dari total)\n\n📊 Total pengeluaran: ${formatRupiah(total)}`,
        { parse_mode: 'Markdown' }
      );
    } else {
      // breakdown
      const total = sorted.reduce((s, [, v]) => s + v, 0);
      let msg = `📊 *Breakdown ${periodName}*\n\n`;
      for (const [cat, amt] of sorted) {
        const icon = getCategoryIcon(cat);
        const pct = ((amt / total) * 100).toFixed(0);
        msg += `${icon} ${cat}: ${formatRupiah(amt)} (${pct}%)\n`;
      }
      msg += `\n━━━━━━━━━━━━━━\n*Total:* ${formatRupiah(total)}`;
      await ctx.reply(msg, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    console.error('handleCategoryBreakdown error:', err.message);
    await ctx.reply('Maaf, ada masalah mengambil data breakdown.');
  }
}

// ============================================
// COMMANDS
// ============================================

bot.command('start', async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  const userName = from.first_name || 'User';

  try {
    const token = await loginAndGetToken(from.id, userName, from.username);
    const webDashboardUrl = WEB_URL + "/dashboard?token=" + token;
    const miniAppUrl = WEB_URL + "/dashboard/app";

    const welcomeMessage = `👋 Halo ${userName}! Selamat datang di *FinChat*! 🎉

💰 *Aplikasi Keuangan ala AI Telegram*

📝 *Yang bisa kamu lakukan:*

✅ *Catat Pemasukan/Pengeluaran*
   Ketik: "Beli kopi 25rb" atau "Gaji masuk 5jt"

📊 *Lihat Laporan (Langsung Ketik!)*
   • "pengeluaran bulan ini"
   • "pemasukan minggu ini"
   • "saldo saya berapa"
   • "pengeluaran terbesar dimana"
   • "total tahun ini"

📊 *Atau Pakai Command:*
   • /ringkasan - hari ini
   • /bulanini - bulan ini
   • /minggu - minggu ini
   • /tahun - tahun ini
   • /statistik - detail per kategori

💎 *Kelola Budget*
   • /budget - lihat budget per kategori
   • /upgrade - upgrade plan

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ketik /bantuan untuk panduan lengkap 👇`;

    await ctx.reply(welcomeMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🌐 Web Dashboard', url: webDashboardUrl }],
          [{ text: '📱 Buka di Telegram', web_app: { url: miniAppUrl } }],
          [{ text: '📚 Panduan Lengkap', callback_data: 'show_help' }]
        ]
      }
    });
    return;
  } catch (error) {
    console.error('Registration error:', error);
  }

  // First time user - onboarding
  ctx.session.onboarding = true;
  ctx.session.onboardingStep = 1;

  const welcomeMessage = "👋 Halo " + userName + "! Selamat datang di *FinChat*! 🎉\n\n" +
    "Saya akan membantu kamu mencatat keuangan dengan mudah.\n\n" +
    "🕐 *Pilih zona waktu:*";

  await ctx.reply(welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'WIB (Jakarta)', callback_data: 'tz_Asia/Jakarta' },
          { text: 'WITA (Makassar)', callback_data: 'tz_Asia/Makassar' }
        ],
        [
          { text: 'WIT (Jayapura)', callback_data: 'tz_Asia/Jayapura' },
          { text: 'Skip ⏭️', callback_data: 'tz_skip' }
        ]
      ]
    }
  });
});

bot.command('bantuan', async (ctx) => {
  const from = ctx.from;
  let token;
  try { token = await loginAndGetToken(from.id, from.first_name, from.username); } catch (e) { }
  const dashboardLink = token ? `${WEB_URL}/dashboard?token=${token}` : `${WEB_URL}/dashboard`;

  const helpMessage = `📚 *Daftar Command FinChat:*

📝 *Pencatatan Transaksi:*
Ketik pesan natural seperti:
• "Beli kopi 25rb"
• "Gaji masuk 5jt"
• "Makan 30rb sama grab 20rb"

📊 *Laporan & Statistik (ketik langsung):*
• "pemasukan bulan ini"
• "pengeluaran minggu ini"
• "saldo gw berapa"
• "pengeluaran bulan lalu"
• "pengeluaran terbesar dimana"
• "total tahun ini"

Atau pake command:
• /ringkasan - Ringkasan hari ini
• /bulanini - Ringkasan bulan ini
• /minggu - Ringkasan minggu ini
• /tahun - Ringkasan tahun ini
• /statistik - Detail per kategori

💰 *Lainnya:*
• /budget - Lihat budget per kategori
• /hapus - Hapus transaksi terakhir
• /dashboard - Buka web dashboard
• /upgrade - Upgrade plan

💡 *Tips:*
• Langsung ketik "saldo saya berapa" untuk cek saldo
• Langsung catat tanpa command juga bisa!`;

  await ctx.reply(helpMessage, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: '🌐 Buka Dashboard', url: dashboardLink }]]
    }
  });
});

bot.command('help', async (ctx) => {
  const from = ctx.from;
  let token;
  try { token = await loginAndGetToken(from.id, from.first_name, from.username); } catch (e) { }
  const dashboardLink = token ? `${WEB_URL}/dashboard?token=${token}` : `${WEB_URL}/dashboard`;

  const helpMessage = `📚 *Panduan FinChat*

📝 *Pencatatan:*
Ketik natural: "Beli kopi 25rb" atau "Gaji 5jt"

📊 *Laporan:*
Ketik: "saldo saya", "pengeluaran bulan ini", dll
Atau /ringkasan /bulanini /minggu /tahun

💡 ketik /bantuan untuk panduan lengkap! 👇`;

  await ctx.reply(helpMessage, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: '🌐 Buka Dashboard', url: dashboardLink }]]
    }
  });
});

bot.command('ringkasan', async (ctx) => {
  const from = ctx.from;
  if (!from) return;
  try {
    const stats = await getTodaySummary(from.id);
    const expense = stats.expense?.total || 0;
    const income = stats.income?.total || 0;
    const message = `📊 *Ringkasan Hari Ini* (${new Date().toLocaleDateString('id-ID')})

💰 Pemasukan: ${formatRupiah(income)}
💸 Pengeluaran: ${formatRupiah(expense)}
📈 Saldo: ${formatRupiah(income - expense)}

Ketik transaksi baru untuk mencatat!`;
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    await ctx.reply('Maaf, ada masalah mengambil data. Coba lagi nanti.');
  }
});

bot.command('bulanini', async (ctx) => {
  const from = ctx.from;
  if (!from) return;
  try {
    const now = new Date();
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const endDate = now.toISOString().split('T')[0];
    const stats = await getUserStats(from.id, startDate, endDate);
    const expense = stats.expense?.total || 0;
    const income = stats.income?.total || 0;
    const message = `📊 *Ringkasan Bulan Ini* (${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})

💰 Total Pemasukan: ${formatRupiah(income)}
💸 Total Pengeluaran: ${formatRupiah(expense)}
📈 Saldo: ${formatRupiah(income - expense)}

${stats.expense?.count ? `📝 ${stats.expense.count} transaksi pengeluaran` : ''}
${stats.income?.count ? `💵 ${stats.income.count} transaksi pemasukan` : ''}`;
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    await ctx.reply('Maaf, ada masalah mengambil data. Coba lagi nanti.');
  }
});

bot.command('minggu', async (ctx) => {
  const from = ctx.from;
  if (!from) return;
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    const startDate = startOfWeek.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];
    const stats = await getUserStats(from.id, startDate, endDate);
    const expense = stats.expense?.total || 0;
    const income = stats.income?.total || 0;
    const message = `📊 *Ringkasan Minggu Ini* (${startOfWeek.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})

💰 Pemasukan: ${formatRupiah(income)}
💸 Pengeluaran: ${formatRupiah(expense)}
📈 Saldo: ${formatRupiah(income - expense)}

📝 ${stats.expense?.count || 0} transaksi pengeluaran
💵 ${stats.income?.count || 0} transaksi pemasukan`;
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    await ctx.reply('Maaf, ada masalah mengambil data. Coba lagi nanti.');
  }
});

bot.command('tahun', async (ctx) => {
  const from = ctx.from;
  if (!from) return;
  try {
    const now = new Date();
    const year = now.getFullYear();
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    const stats = await getUserStats(from.id, startDate, endDate);
    const expense = stats.expense?.total || 0;
    const income = stats.income?.total || 0;
    const message = `📊 *Ringkasan Tahun ${year}*

💰 Total Pemasukan: ${formatRupiah(income)}
💸 Total Pengeluaran: ${formatRupiah(expense)}
📈 Total Saldo: ${formatRupiah(income - expense)}

📝 ${stats.expense?.count || 0} transaksi pengeluaran
💵 ${stats.income?.count || 0} transaksi pemasukan

💡 Gunakan /statistik untuk detail breakdown per kategori`;
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    await ctx.reply('Maaf, ada masalah mengambil data. Coba lagi nanti.');
  }
});

bot.command('statistik', async (ctx) => {
  const from = ctx.from;
  if (!from) return;
  try {
    const token = await loginAndGetToken(from.id);
    const now = new Date();
    const year = now.getFullYear();
    const res = await getFromAPI(`/api/transactions/monthly/${year}/${now.getMonth() + 1}`, token);

    if (!res.stats || res.stats.length === 0) {
      return await ctx.reply(`📈 *Statistik Bulan Ini*\n\nBelum ada data transaksi bulan ini.`, { parse_mode: 'Markdown' });
    }

    let message = `📈 *Statistik Pengeluaran per Kategori* (${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})\n\n`;
    const sortedStats = res.stats.sort((a, b) => parseFloat(b.total) - parseFloat(a.total));
    const totalExpense = sortedStats.reduce((sum, s) => s.type === 'expense' ? sum + parseFloat(s.total) : sum, 0);

    for (const stat of sortedStats) {
      if (stat.type !== 'expense') continue;
      const icon = getCategoryIcon(stat.category);
      const percent = (parseFloat(stat.total) / totalExpense) * 100;
      message += `${icon} ${stat.category}: ${formatRupiah(parseFloat(stat.total))} (${percent.toFixed(0)}%)\n`;
    }

    message += `\n💡 Ketik /budget untuk melihat budget per kategori`;
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    await ctx.reply('Maaf, ada masalah mengambil data. Coba lagi nanti.');
  }
});

bot.command('budget', async (ctx) => {
  const from = ctx.from;
  if (!from) return;
  try {
    const token = await loginAndGetToken(from.id);
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const res = await getFromAPI(`/api/budgets/spending?month=${month}&year=${year}`, token);
    const spending = res.spending;

    if (!spending || spending.length === 0) {
      return await ctx.reply(
        `📊 *Budget Bulan Ini*\n\nBelum ada budget yang diset untuk bulan ini.\n\n💡 Set budget di web dashboard:\n/dashboard`,
        { parse_mode: 'Markdown' }
      );
    }

    let budgetText = `📊 *Budget Bulan Ini* (${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})\n\n`;
    spending.forEach(item => {
      const percent = item.percent_used || 0;
      const icon = item.category_icon || '📦';
      let statusEmoji = '🟢';
      if (percent >= 90) statusEmoji = '🔴';
      else if (percent >= 70) statusEmoji = '🟡';
      const progressBar = generateProgressBar(percent);
      budgetText += `${icon} *${item.category_name}*\n${progressBar} ${percent.toFixed(0)}%\nTerpakai: ${formatRupiah(item.spent)} / ${formatRupiah(item.budget_amount)} ${statusEmoji}\nSisa: ${formatRupiah(item.remaining)}\n\n`;
    });

    const totalBudget = spending.reduce((s, i) => s + i.budget_amount, 0);
    const totalSpent = spending.reduce((s, i) => s + i.spent, 0);
    budgetText += `━━━━━━━━━━━━━━━━━━\n*Total:* ${formatRupiah(totalSpent)} / ${formatRupiah(totalBudget)}`;
    await ctx.reply(budgetText, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Budget error:', error.message);
    await ctx.reply('Maaf, ada masalah mengambil data budget. Coba lagi nanti.');
  }
});

function generateProgressBar(percent) {
  const filled = Math.min(Math.round(percent / 10), 10);
  const empty = 10 - filled;
  return '▓'.repeat(filled) + '░'.repeat(empty);
}

bot.command('hapus', async (ctx) => {
  const from = ctx.from;
  if (!from) return;
  try {
    const transactions = await getUserTransactions(from.id, 1);
    if (transactions.length === 0) return await ctx.reply('Tidak ada transaksi untuk dihapus.');

    const lastTx = transactions[0];
    const icon = getCategoryIcon(lastTx.category_name);
    const typeText = lastTx.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
    ctx.session.pendingDelete = lastTx.id;

    await ctx.reply(
      `🗑️ *Hapus transaksi terakhir?*\n\n${icon} ${lastTx.description || typeText}\n💰 ${formatRupiah(lastTx.amount)}\n📅 ${new Date(lastTx.date).toLocaleDateString('id-ID')}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Ya, Hapus', callback_data: 'confirm_delete' },
            { text: '❌ Batal', callback_data: 'cancel_delete' }
          ]]
        }
      }
    );
  } catch (error) {
    console.error('Hapus error:', error.response?.data || error.message);
    await ctx.reply('Maaf, ada masalah mengambil data. Coba lagi nanti.');
  }
});

bot.command('dashboard', async (ctx) => {
  const from = ctx.from;
  let token;
  try { token = await loginAndGetToken(from.id, from.first_name, from.username); } catch (e) { }
  const dashboardUrl = token ? `${WEB_URL}/dashboard?token=${token}` : `${WEB_URL}/dashboard`;
  await ctx.reply('🌐 Klik tombol di bawah untuk masuk dashboard:', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🌐 Buka Dashboard', url: dashboardUrl }]] }
  });
});

bot.command('upgrade', async (ctx) => {
  const from = ctx.from;
  if (!from) return;
  try {
    const token = await loginAndGetToken(from.id, from.first_name, from.username);
    const { data: subData } = await axios.get(`${API_URL}/api/subscription/status`, { headers: { Authorization: `Bearer ${token}` } });
    const sub = subData.subscription;
    const usage = sub.transactionUsage;
    const currentInfo = sub.plan === 'free'
      ? `📊 ${usage.used}/${usage.limit} transaksi bulan ini`
      : `✅ Plan aktif sampai ${sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('id-ID') : 'Unlimited'}`;

    await ctx.reply(
      `⭐ *Upgrade FinChat Plan*\n\nPlan saat ini: *${sub.planName}*\n${currentInfo}\n\n━━━━━━━━━━━━━━━━━━━━\n\n🆓 *Free* - Gratis\n• 50 transaksi/bulan\n• Dashboard basic\n\n🚀 *Pro* - Rp 29.000/bulan\n• Unlimited transaksi\n• Export PDF/Excel\n• Budget alerts\n• 10 kategori custom\n\n💎 *Business* - Rp 79.000/bulan\n• Semua fitur Pro\n• Kategori unlimited\n• Data unlimited\n• Priority support\n\n━━━━━━━━━━━━━━━━━━━━\n\nUpgrade sekarang di dashboard! 👇`,
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '⭐ Upgrade di Dashboard', url: `${WEB_URL}/dashboard/upgrade` }]] }
      }
    );
  } catch (error) {
    await ctx.reply(
      '⭐ *Upgrade FinChat Plan*\n\nUpgrade untuk unlimited transaksi, export, dan fitur Business lainnya!\n\nBuka dashboard untuk upgrade: /dashboard',
      { parse_mode: 'Markdown' }
    );
  }
});

bot.command('export', async (ctx) => {
  const from = ctx.from;
  if (!from) return;
  try {
    const token = await loginAndGetToken(from.id, from.first_name, from.username);
    const { data: subData } = await axios.get(`${API_URL}/api/subscription/status`, { headers: { Authorization: `Bearer ${token}` } });
    const sub = subData.subscription;
    const plan = sub.plan;

    if (plan !== 'pro' && plan !== 'pro') {
      await ctx.reply(
        `🔒 *Export Tidak Tersedia*\n\nFitur Export PDF/Excel hanya tersedia untuk plan *Pro* dan *Business*.\n\n📊 Plan saat ini: *${sub.planName}*\n\nUpgrade untuk akses fitur ini!`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: '💎 Lihat Plan', callback_data: 'show_upgrade' }]] }
        }
      );
      return;
    }

    await ctx.reply(
      `📊 *Export Laporan Keuangan*\n\nPilih format export:\n\n📄 PDF - Laporan lengkap\n📊 Excel - Data spreadsheet\n\nAtau langsung export periode tertentu:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📄 Export PDF', callback_data: 'export_pdf' }, { text: '📊 Export Excel', callback_data: 'export_excel' }],
            [{ text: '📅 Bulan Ini (PDF)', callback_data: 'export_pdf_this_month' }, { text: '📅 Bulan Ini (Excel)', callback_data: 'export_excel_this_month' }],
            [{ text: '◀️ Kembali', callback_data: 'cancel_export' }]
          ]
        }
      }
    );
  } catch (error) {
    console.error('Export command error:', error);
    await ctx.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
  }
});

bot.command('kategori', async (ctx) => {
  const from = ctx.from;
  if (!from) return;
  try {
    const token = await loginAndGetToken(from.id, from.first_name, from.username);
    const { data: subData } = await axios.get(`${API_URL}/api/subscription/status`, { headers: { Authorization: `Bearer ${token}` } });
    const sub = subData.subscription;
    const plan = sub.plan;

    if (plan !== 'pro') {
      await ctx.reply(
        `🔒 *Custom Categories*\n\nFitur kategori custom hanya tersedia untuk plan *Pro*.\n\n📊 Plan saat ini: *${sub.planName}*\n\nUpgrade ke Pro untuk unlimited custom categories!`,
        { reply_markup: { inline_keyboard: [[{ text: '💎 Upgrade ke Pro', callback_data: 'show_upgrade' }]] } }
      );
      return;
    }

    const { data: catData } = await axios.get(`${API_URL}/api/categories`, { headers: { Authorization: `Bearer ${token}` } });
    const customCategories = catData.categories?.filter(c => c.is_custom) || [];

    let message = `📂 *Custom Categories*\n\nKategori yang kamu buat:\n\n`;
    if (customCategories.length === 0) {
      message += `Belum ada custom categories.\n\nKetik: /kategori tambah [nama] untuk menambah.`;
    } else {
      customCategories.forEach((cat, i) => { message += `${i + 1}. ${cat.name}\n`; });
      message += `\nTotal: ${customCategories.length}/∞`;
    }

    message += `\n\n━━━━━━━━━━━━━━━━━━━━\n📝 *Aksi:*\n/kategori tambah [nama] - Tambah\n/kategori hapus [nama] - Hapus`;
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Kategori command error:', error);
    await ctx.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
  }
});

// ============================================
// TEXT MESSAGE HANDLER
// ============================================

bot.on('message:text', async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  const text = ctx.message.text;

  // ---- /kategori tambah / hapus (sub-commands) ----
  if (text.toLowerCase().startsWith('/kategori tambah ')) {
    const categoryName = text.replace(/^\/kategori tambah /i, '').trim();
    if (!categoryName) return await ctx.reply('❌ Nama kategori tidak boleh kosong.\n\nContoh: /kategori tambah Investasi');

    try {
      const token = await loginAndGetToken(from.id, from.first_name, from.username);
      const { data: subData } = await axios.get(`${API_URL}/api/subscription/status`, { headers: { Authorization: `Bearer ${token}` } });
      if (subData.subscription.plan !== 'pro') {
        return await ctx.reply('🔒 Custom categories hanya untuk plan Business. Upgrade di /upgrade');
      }
      await axios.post(`${API_URL}/api/categories`, { name: categoryName, is_custom: true }, { headers: { Authorization: `Bearer ${token}` } });
      await ctx.reply(`✅ Kategori "${categoryName}" berhasil ditambahkan!`);
    } catch (error) {
      if (error.response?.status === 409) await ctx.reply('❌ Kategori sudah ada.');
      else { console.error('Kategori tambah error:', error); await ctx.reply('❌ Gagal menambah kategori.'); }
    }
    return;
  }

  if (text.toLowerCase().startsWith('/kategori hapus ')) {
    const categoryName = text.replace(/^\/kategori hapus /i, '').trim();
    if (!categoryName) return await ctx.reply('❌ Nama kategori tidak boleh kosong.\n\nContoh: /kategori hapus Investasi');

    try {
      const token = await loginAndGetToken(from.id, from.first_name, from.username);
      const { data: subData } = await axios.get(`${API_URL}/api/subscription/status`, { headers: { Authorization: `Bearer ${token}` } });
      if (subData.subscription.plan !== 'pro') {
        return await ctx.reply('🔒 Custom categories hanya untuk plan Business. Upgrade di /upgrade');
      }
      await axios.delete(`${API_URL}/api/categories/${encodeURIComponent(categoryName)}`, { headers: { Authorization: `Bearer ${token}` } });
      await ctx.reply(`✅ Kategori "${categoryName}" berhasil dihapus!`);
    } catch (error) {
      if (error.response?.status === 404) await ctx.reply('❌ Kategori tidak ditemukan.');
      else { console.error('Kategori hapus error:', error); await ctx.reply('❌ Gagal menghapus kategori.'); }
    }
    return;
  }

  // ---- Session state: ya/tidak confirmation ----
  if (text.toLowerCase() === 'ya' || text.toLowerCase() === 'y') {
    if (ctx.session.pendingTransaction) {
      try {
        const { parsed } = ctx.session.pendingTransaction;
        if (Array.isArray(parsed)) {
          let totalAmount = 0;
          for (const tx of parsed) {
            await createTransaction(from.id, tx.amount, tx.type, tx.category, tx.description, tx.date);
            totalAmount += tx.amount;
          }
          const stats = await getTodaySummary(from.id);
          const expense = stats.expense?.total || 0;
          await ctx.reply(`✅ Tersimpan! ${parsed.length} transaksi\n\n💰 Total: ${formatRupiah(totalAmount)}\n\n💸 Total hari ini: ${formatRupiah(expense)}`);
        } else {
          await createTransaction(from.id, parsed.amount, parsed.type, parsed.category, parsed.description, parsed.date);
          const stats = await getTodaySummary(from.id);
          const expense = stats.expense?.total || 0;
          const income = stats.income?.total || 0;
          const icon = getCategoryIcon(parsed.category);
          const typeEmoji = parsed.type === 'income' ? '💰' : '💸';
          const typeLabel = parsed.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
          await ctx.reply(`✅ Tersimpan! ${typeEmoji}\n\n${typeLabel}\n${icon} ${parsed.description}\n💰 ${formatRupiah(parsed.amount)} (${parsed.category})\n\n💸 Pengeluaran hari ini: ${formatRupiah(expense)}\n💰 Pemasukan hari ini: ${formatRupiah(income)}`);
        }
      } catch (error) {
        await ctx.reply('Maaf, ada masalah menyimpan transaksi.');
      }
      ctx.session.pendingTransaction = undefined;
      return;
    }
  }

  if (text.toLowerCase() === 'tidak' || text.toLowerCase() === 'n') {
    if (ctx.session.pendingTransaction) {
      await ctx.reply('❌ Transaksi dibatalkan.');
      ctx.session.pendingTransaction = undefined;
      return;
    }
  }

  // ---- Session state: awaiting amount edit ----
  if (ctx.session.awaitingAmount && ctx.session.pendingTransaction) {
    const newAmount = parseInt(text.replace(/[^0-9]/g, ''));
    if (newAmount > 0) {
      ctx.session.pendingTransaction.parsed.amount = newAmount;
      ctx.session.awaitingAmount = false;
      const { parsed } = ctx.session.pendingTransaction;
      const icon = getCategoryIcon(parsed.category);
      await ctx.reply(
        `📝 Nominal diupdate! Konfirmasi:\n\n${icon} ${parsed.description}\n💰 ${formatRupiah(parsed.amount)}\n📂 ${parsed.category}\n📅 ${new Date(parsed.date).toLocaleDateString('id-ID')}`,
        {
          reply_markup: { inline_keyboard: [[{ text: '✅ Simpan', callback_data: 'save_transaction' }, { text: '❌ Batal', callback_data: 'cancel_transaction' }]] }
        }
      );
      return;
    } else {
      return await ctx.reply('Nominal tidak valid. Ketik angka saja, misal: 50000');
    }
  }

  // ---- Session state: awaiting category edit ----
  if (ctx.session.awaitingCategory && ctx.session.pendingTransaction) {
    const categories = Object.keys(CATEGORY_ICONS);
    const matched = categories.find(c => c.toLowerCase().includes(text.toLowerCase()));
    if (matched) {
      ctx.session.pendingTransaction.parsed.category = matched;
      ctx.session.awaitingCategory = false;
      const { parsed } = ctx.session.pendingTransaction;
      const icon = getCategoryIcon(parsed.category);
      await ctx.reply(
        `📝 Kategori diupdate! Konfirmasi:\n\n${icon} ${parsed.description}\n💰 ${formatRupiah(parsed.amount)}\n📂 ${parsed.category}\n📅 ${new Date(parsed.date).toLocaleDateString('id-ID')}`,
        {
          reply_markup: { inline_keyboard: [[{ text: '✅ Simpan', callback_data: 'save_transaction' }, { text: '❌ Batal', callback_data: 'cancel_transaction' }]] }
        }
      );
      return;
    } else {
      return await ctx.reply(`Kategori tidak ditemukan. Pilih salah satu:\n${categories.map(c => `• ${c}`).join('\n')}`);
    }
  }

  // ---- Parse message (transaction OR query) ----
  // Parser akan return either:
  //   - { type: 'query', ... }           → handle via handleQuery
  //   - { type: 'expense'|'income', ... } atau array → transaction flow
  //   - null                              → can't parse
  try {
    const parsed = await parseTransaction(text);

    // === QUERY BRANCH ===
    if (parsed && parsed.type === 'query') {
      return await handleQuery(ctx, parsed);
    }

    // === TRANSACTION BRANCH ===
    // Check transaction limit for free plan BEFORE saving
    const limitCheck = await checkTransactionLimit(from.id);
    if (!limitCheck.allowed) {
      const planMsg = limitCheck.limit === Infinity ? 'Pro/Business' : 'Free Plan';
      return await ctx.reply(
        `⚠️ *Batas Transaksi Tercapai*\n\nKamu sudah mencatat ${limitCheck.count}/${limitCheck.limit === Infinity ? '∞' : limitCheck.limit} transaksi bulan ini (${planMsg}).\n\nUpgrade untuk unlimited transaksi! 🚀`,
        { parse_mode: 'Markdown' }
      );
    }

    const txList = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
    const firstTx = txList[0];

    if (!firstTx || !firstTx.amount) {
      return await ctx.reply(
        '❓ Maaf, saya tidak bisa memahami pesan ini.\n\nContoh pencatatan:\n• "Beli kopi 25rb"\n• "Makan siang 45000"\n• "Gaji 5jt"\n\nContoh query:\n• "saldo saya berapa"\n• "pengeluaran bulan ini"\n• "pemasukan minggu lalu"'
      );
    }

    ctx.session.pendingTransaction = { message: text, parsed };

    if (Array.isArray(parsed) && parsed.length > 1) {
      const typeEmoji = firstTx.type === 'income' ? '💰' : '💸';
      const typeLabel = firstTx.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
      let msg = `📝 Saya akan mencatat ${parsed.length} transaksi:\n\n${typeEmoji} ${typeLabel}\n\n`;
      parsed.forEach((tx, i) => {
        const txIcon = getCategoryIcon(tx.category);
        let desc = tx.description || tx.category;
        desc = desc.replace(/^abis dari\s+/i, '').replace(/^dari\s+/i, '').replace(/^beli\s+/i, '').trim();
        msg += `${i + 1}. ${txIcon} ${desc}\n   💰 ${formatRupiah(tx.amount)}\n`;
      });
      msg += `\n📅 ${new Date(parsed[0].date).toLocaleDateString('id-ID')}`;
      await ctx.reply(msg, {
        reply_markup: { inline_keyboard: [[{ text: '✅ Simpan Semua', callback_data: 'save_transaction' }, { text: '❌ Batal', callback_data: 'cancel_transaction' }]] }
      });
    } else {
      const typeEmoji = firstTx.type === 'income' ? '💰' : '💸';
      const typeLabel = firstTx.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
      const icon = getCategoryIcon(firstTx.category);
      await ctx.reply(
        `📝 Saya akan mencatat:\n\n${typeEmoji} ${typeLabel}\n${icon} ${firstTx.description || 'Transaksi'}\n💰 ${formatRupiah(firstTx.amount)}\n📂 ${firstTx.category}\n📅 ${new Date(firstTx.date).toLocaleDateString('id-ID')}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Simpan', callback_data: 'save_transaction' }, { text: '✏️ Edit Nominal', callback_data: 'edit_amount' }],
              [{ text: '📂 Edit Kategori', callback_data: 'edit_category' }, { text: '❌ Batal', callback_data: 'cancel_transaction' }]
            ]
          }
        }
      );
    }
  } catch (error) {
    console.error('Parse error:', error.message);
    await ctx.reply('Maaf, ada masalah memproses pesan. Coba lagi.');
  }
});

// ============================================
// CALLBACK QUERY HANDLER
// ============================================

bot.on('callback_query', async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  const callbackData = ctx.callbackQuery.data;

  if (callbackData === 'show_help') {
    let token;
    try { token = await loginAndGetToken(from.id, from.first_name, from.username); } catch (e) { }
    const dashboardLink = token ? `${WEB_URL}/dashboard?token=${token}` : `${WEB_URL}/dashboard`;

    const helpMessage = `📚 *Panduan Lengkap FinChat:*

📝 *Pencatatan Transaksi:*
Ketik pesan natural seperti:
• "Beli kopi 25rb"
• "Gaji masuk 5jt"

📊 *Query Langsung (Ketik Saja!):*
• "saldo saya berapa"
• "pemasukan bulan ini"
• "pengeluaran minggu lalu"
• "pengeluaran terbesar dimana"
• "total tahun ini"

📊 *Command:*
• /ringkasan - Hari ini
• /bulanini - Bulan ini
• /minggu - Minggu ini
• /tahun - Tahun ini
• /statistik - Detail per kategori
• /budget - Budget per kategori
• /upgrade - Upgrade plan

💡 Langsung ketik aja, tanpa /command!`;

    await ctx.editMessageText(helpMessage, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🌐 Buka Dashboard', url: dashboardLink }]] }
    });
    await ctx.answerCallbackQuery();
    return;
  }

  if (callbackData?.startsWith('tz_')) {
    const timezone = callbackData === 'tz_skip' ? 'Asia/Jakarta' : callbackData.replace('tz_', '');
    try {
      const token = await loginAndGetToken(from.id, from.first_name, from.username);
      await axios.put(`${API_URL}/api/users/me`, { timezone }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {
      console.error('Timezone update error:', e.message);
    }
    ctx.session.onboardingStep = 2;
    await ctx.editMessageText(
      `✅ Zona waktu diset ke ${timezone === 'Asia/Jakarta' ? 'WIB' : timezone}!\n\n💡 *Mau set budget awal?*\n\nBudget membantu kamu mengontrol pengeluaran per kategori setiap bulan.`,
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '📊 Set Budget Nanti (di Dashboard)', callback_data: 'onboard_budget_later' }, { text: '⏭️ Skip', callback_data: 'onboard_skip' }]] }
      }
    );
    await ctx.answerCallbackQuery();
    return;
  }

  if (callbackData === 'onboard_budget_later' || callbackData === 'onboard_skip') {
    ctx.session.onboarding = false;
    ctx.session.onboardingStep = 0;
    await ctx.editMessageText(
      "🎉 *Setup selesai!*\n\nSekarang kamu bisa mulai mencatat transaksi!\n\n📝 Contoh: Ketik \"Beli kopi 25rb\"\n\n🌐 Klik button di bawah untuk buka dashboard:",
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🌐 Buka Dashboard', url: WEB_URL + '/dashboard' }]] }
      }
    );
    await ctx.answerCallbackQuery();
    return;
  }

  if (callbackData === 'save_transaction') {
    if (ctx.session.pendingTransaction) {
      try {
        const { parsed } = ctx.session.pendingTransaction;
        if (Array.isArray(parsed)) {
          let totalAmount = 0;
          for (const tx of parsed) {
            await createTransaction(from.id, tx.amount, tx.type, tx.category, tx.description, tx.date);
            totalAmount += tx.amount;
          }
          const stats = await getTodaySummary(from.id);
          const expense = stats.expense?.total || 0;
          await ctx.editMessageText(`✅ Tersimpan! ${parsed.length} transaksi\n\n💰 Total: ${formatRupiah(totalAmount)}\n\n💸 Total hari ini: ${formatRupiah(expense)}`);
        } else {
          await createTransaction(from.id, parsed.amount, parsed.type, parsed.category, parsed.description, parsed.date);
          const stats = await getTodaySummary(from.id);
          const expense = stats.expense?.total || 0;
          const icon = getCategoryIcon(parsed.category);
          await ctx.editMessageText(`✅ Tersimpan! ${icon}\n\n${parsed.description}\n${formatRupiah(parsed.amount)} (${parsed.category})\n\n💸 Total pengeluaran hari ini: ${formatRupiah(expense)}`);
        }
      } catch (error) {
        await ctx.editMessageText('❌ Gagal menyimpan. Coba lagi.');
      }
      ctx.session.pendingTransaction = undefined;
    }
  } else if (callbackData === 'edit_amount') {
    await ctx.editMessageText('✏️ *Edit Nominal*\n\nKetik jumlah baru (misal: 50000)', { parse_mode: 'Markdown' });
    ctx.session.awaitingAmount = true;
    ctx.session.awaitingCategory = false;
  } else if (callbackData === 'edit_category') {
    const categoryList = Object.entries(CATEGORY_ICONS).map(([name, icon]) => `${icon} ${name}`).join('\n');
    await ctx.editMessageText(`📂 *Edit Kategori*\n\nKetik nama kategori:\n${categoryList}`, { parse_mode: 'Markdown' });
    ctx.session.awaitingCategory = true;
    ctx.session.awaitingAmount = false;
  } else if (callbackData === 'cancel_transaction') {
    try { await ctx.editMessageText('❌ Transaksi dibatalkan.'); } catch (e) { }
    ctx.session.pendingTransaction = undefined;
    ctx.session.awaitingAmount = false;
    ctx.session.awaitingCategory = false;
  } else if (callbackData === 'confirm_delete') {
    if (ctx.session.pendingDelete) {
      try {
        const token = await loginAndGetToken(from.id);
        await axios.delete(`${API_URL}/api/transactions/${ctx.session.pendingDelete}`, { headers: { Authorization: `Bearer ${token}` } });
        await ctx.editMessageText('✅ Transaksi berhasil dihapus!');
      } catch (error) {
        await ctx.editMessageText('❌ Gagal menghapus transaksi.');
      }
      ctx.session.pendingDelete = undefined;
    }
  } else if (callbackData === 'cancel_delete') {
    await ctx.editMessageText('Hapus transaksi dibatalkan.');
    ctx.session.pendingDelete = undefined;
  } else if (callbackData === 'show_upgrade') {
    await ctx.editMessageText(
      '💎 *Upgrade FinChat Plan*\n\n📊 Plan saat ini: Free\n\n🚀 *Pro* - Rp 29.000/bulan\n• Unlimited transaksi\n• Export PDF/Excel\n• Budget alerts\n• 10 kategori custom\n\n💎 *Business* - Rp 79.000/bulan\n• Semua fitur Pro\n• Kategori unlimited\n• Data unlimited\n• Priority support\n\n━━━━━━━━━━━━━━━━━━━━\n\nBuka dashboard untuk upgrade:',
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '💎 Upgrade di Dashboard', url: `${WEB_URL}/dashboard/upgrade` }]] }
      }
    );
  } else if (callbackData === 'export_pdf' || callbackData === 'export_excel' ||
    callbackData === 'export_pdf_this_month' || callbackData === 'export_excel_this_month') {
    await handleExport(ctx, callbackData);
  } else if (callbackData === 'cancel_export') {
    await ctx.editMessageText('❌ Export dibatalkan.');
  }

  await ctx.answerCallbackQuery();
});

async function handleExport(ctx, callbackData) {
  const from = ctx.from;
  if (!from) return;

  const isExcel = callbackData.includes('excel');
  const isThisMonth = callbackData.includes('this_month');

  await ctx.answerCallbackQuery('⏳ Mengambil data...', { timeout: 5 });

  try {
    const token = await loginAndGetToken(from.id, from.first_name, from.username);
    const now = new Date();
    let startDate, endDate;
    if (isThisMonth) {
      startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      endDate = now.toISOString().split('T')[0];
    } else {
      startDate = `${now.getFullYear()}-01-01`;
      endDate = now.toISOString().split('T')[0];
    }

    const format = isExcel ? 'excel' : 'pdf';
    const exportUrl = `${API_URL}/api/export/${format}?startDate=${startDate}&endDate=${endDate}`;

    await ctx.editMessageText(
      `📥 *Download ${isExcel ? 'Excel' : 'PDF'}*\n\n📅 Periode: ${isThisMonth ? 'Bulan Ini' : 'Tahun Ini'}\n\nKlik button di bawah untuk download:`,
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: `📥 Download ${isExcel ? 'Excel' : 'PDF'}`, url: `${exportUrl}&token=${token}` }]] }
      }
    );
  } catch (error) {
    console.error('Export error:', error);
    await ctx.editMessageText('❌ Gagal membuat export. Silakan coba lagi.');
  }
}

console.log('🤖 FinChat Bot starting...');

bot.start().catch((err) => {
  console.error('Failed to start bot:', err.message);
});