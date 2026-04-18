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

const CATEGORY_ICONS = {
  'Makanan & Minuman': '🍔',
  'Transportasi': '🚌',
  'Belanja': '🛒',
  'Hiburan': '🎮',
  'Kesehatan': '💊',
  'Tagihan': '📄',
  'Gaji': '💰',
  'Investasi': '📈',
  'Lainnya': '📦'
};

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
  return sendToAPI('/api/users/register', {
    telegram_id: telegramId,
    name,
    username
  });
};

const loginAndGetToken = async (telegramId, name = '', username = '') => {
  const res = await sendToAPI('/api/users/login', {
    telegram_id: telegramId,
    name,
    username
  });
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
  const stats = await getUserStats(telegramId, today, today);
  return stats;
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

// === COMMANDS ===

const START_COMMAND = `bot.command('start', async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  const userName = from.first_name || 'User';
  
  // Regular /start - auto register and show dashboard link
  try {
    const token = await loginAndGetToken(from.id, userName, from.username);
    await ctx.reply(
      "👋 Halo " + userName + "! *Selamat datang di FinChat!* 🎉\\n\\n" +
      "✅ Kamu sudah login!\\n\\n" +
      "🌐 *Buka Dashboard:*\\n" +
      "https://finchat.vercel.app/dashboard\\n\\n" +
      "Atau klik button di bawah:",
      { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🌐 Buka Dashboard', url: 'https://finchat.vercel.app/dashboard' }]
          ]
        }
      }
    );
    return;
  } catch (error) {
    console.error('Registration error:', error);
  }

  ctx.session.onboarding = true;
  ctx.session.onboardingStep = 1;

  const welcomeMessage = "👋 Halo " + userName + "! Selamat datang di *FinChat*! 🎉\\n\\n" +
    "Saya akan membantu kamu mencatat keuangan dengan mudah.\\n\\n" +
    "Sebelum mulai, mari atur preferensi kamu:\\n\\n" +
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
});`;

eval(START_COMMAND);

bot.command('bantuan', async (ctx) => {
  const helpMessage = `📚 *Daftar Command FinChat:*

📝 *Pencatatan:*
Ketik pesan natural seperti:
"Beli makan 30rb"
"Gaji masuk 5jt"

📋 *Command:*
/start - Memulai bot
/ringkasan - Ringkasan hari ini
/bulanini - Laporan bulan ini
/budget - Lihat budget per kategori
/hapus - Hapus transaksi terakhir
/dashboard - Buka web dashboard
/bantuan - Daftar command ini

💡 _Tips: Kamu bisa catat transaksi langsung tanpa command!_`;

  await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
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

bot.command('budget', async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  try {
    const token = await loginAndGetToken(from.id);
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const res = await getFromAPI(
      `/api/budgets/spending?month=${month}&year=${year}`,
      token
    );

    const spending = res.spending;

    if (!spending || spending.length === 0) {
      return await ctx.reply(
        `📊 *Budget Bulan Ini*

Belum ada budget yang diset untuk bulan ini.

💡 Set budget di web dashboard:
/dashboard`,
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

      budgetText += `${icon} *${item.category_name}*\n`;
      budgetText += `${progressBar} ${percent.toFixed(0)}%\n`;
      budgetText += `Terpakai: ${formatRupiah(item.spent)} / ${formatRupiah(item.budget_amount)} ${statusEmoji}\n`;
      budgetText += `Sisa: ${formatRupiah(item.remaining)}\n\n`;
    });

    const totalBudget = spending.reduce((s, i) => s + i.budget_amount, 0);
    const totalSpent = spending.reduce((s, i) => s + i.spent, 0);
    budgetText += `━━━━━━━━━━━━━━━━━━\n`;
    budgetText += `*Total:* ${formatRupiah(totalSpent)} / ${formatRupiah(totalBudget)}`;

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
    
    if (transactions.length === 0) {
      return await ctx.reply('Tidak ada transaksi untuk dihapus.');
    }

    const lastTx = transactions[0];
    const icon = CATEGORY_ICONS[lastTx.category_name] || '📦';
    const typeText = lastTx.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
    
    ctx.session.pendingDelete = lastTx.id;

    await ctx.reply(
      `🗑️ *Hapus transaksi terakhir?*

${icon} ${lastTx.description || typeText}
💰 ${formatRupiah(lastTx.amount)}
📅 ${new Date(lastTx.date).toLocaleDateString('id-ID')}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Ya, Hapus', callback_data: 'confirm_delete' },
              { text: '❌ Batal', callback_data: 'cancel_delete' }
            ]
          ]
        }
      }
    );
  } catch (error) {
    await ctx.reply('Maaf, ada masalah. Coba lagi nanti.');
  }
});

bot.command('dashboard', async (ctx) => {
  await ctx.reply(
    '🌐 *Buka FinChat Dashboard:*\n\nhttps://finchat-dashboard.vercel.app\n\nLogin dengan akun Telegram kamu!',
    { parse_mode: 'Markdown' }
  );
});

bot.command('upgrade', async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  try {
    const token = await loginAndGetToken(from.id, from.first_name, from.username);
    const { data: subData } = await axios.get(`${API_URL}/api/subscription/status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const sub = subData.subscription;
    const usage = sub.transactionUsage;

    const currentInfo = sub.plan === 'free'
      ? `📊 ${usage.used}/${usage.limit} transaksi bulan ini`
      : `✅ Plan aktif sampai ${sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('id-ID') : 'Unlimited'}`;

    await ctx.reply(
      `⭐ *Upgrade FinChat Plan*\n\nPlan saat ini: *${sub.planName}*\n${currentInfo}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🆓 *Free* - Gratis\n• 30 transaksi/bulan\n• Dashboard basic\n\n` +
      `🚀 *Pro* - Rp 29.000/bulan\n• Unlimited transaksi\n• Export PDF/Excel\n• Budget alerts\n• Dashboard lengkap\n\n` +
      `🏢 *Business* - Rp 79.000/bulan\n• Semua fitur Pro\n• Multi-user\n• Priority support\n• API access\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Upgrade sekarang di dashboard! 👇`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '⭐ Upgrade di Dashboard', url: `${process.env.WEB_URL || 'https://finchat-dashboard.vercel.app'}/dashboard/upgrade` }],
          ]
        }
      }
    );
  } catch (error) {
    await ctx.reply(
      '⭐ *Upgrade FinChat Plan*\n\nUpgrade untuk unlimited transaksi, export, dan fitur premium lainnya!\n\n' +
      'Buka dashboard untuk upgrade: /dashboard',
      { parse_mode: 'Markdown' }
    );
  }
});

// === TEXT MESSAGE HANDLER ===

bot.on('message:text', async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  const text = ctx.message.text;
  
  if (text.startsWith('/')) return;

  // Handle onboarding responses
  if (ctx.session.onboarding) return;

  // Handle "ya"/"tidak" for text-based confirmations
  if (text.toLowerCase() === 'ya' || text.toLowerCase() === 'y') {
    if (ctx.session.pendingTransaction) {
      try {
        const { parsed } = ctx.session.pendingTransaction;
        await createTransaction(
          from.id,
          parsed.amount,
          parsed.type,
          parsed.category,
          parsed.description,
          parsed.date
        );

        const stats = await getTodaySummary(from.id);
        const expense = stats.expense?.total || 0;

        const icon = CATEGORY_ICONS[parsed.category] || '📦';
        await ctx.reply(
          `✅ Tersimpan! ${icon}\n\n${parsed.description}\n${formatRupiah(parsed.amount)} (${parsed.category})\n\n💸 Total hari ini: ${formatRupiah(expense)}`
        );
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

  // Handle awaiting amount edit
  if (ctx.session.awaitingAmount && ctx.session.pendingTransaction) {
    const newAmount = parseInt(text.replace(/[^0-9]/g, ''));
    if (newAmount > 0) {
      ctx.session.pendingTransaction.parsed.amount = newAmount;
      ctx.session.awaitingAmount = false;

      const { parsed } = ctx.session.pendingTransaction;
      const icon = CATEGORY_ICONS[parsed.category] || '📦';

      await ctx.reply(
        `📝 Nominal diupdate! Konfirmasi:\n\n${icon} ${parsed.description}\n💰 ${formatRupiah(parsed.amount)}\n📂 ${parsed.category}\n📅 ${new Date(parsed.date).toLocaleDateString('id-ID')}`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Simpan', callback_data: 'save_transaction' },
                { text: '❌ Batal', callback_data: 'cancel_transaction' }
              ]
            ]
          }
        }
      );
      return;
    } else {
      await ctx.reply('Nominal tidak valid. Ketik angka saja, misal: 50000');
      return;
    }
  }

  // Handle awaiting category edit
  if (ctx.session.awaitingCategory && ctx.session.pendingTransaction) {
    const categories = Object.keys(CATEGORY_ICONS);
    const matched = categories.find(c => c.toLowerCase().includes(text.toLowerCase()));
    
    if (matched) {
      ctx.session.pendingTransaction.parsed.category = matched;
      ctx.session.awaitingCategory = false;

      const { parsed } = ctx.session.pendingTransaction;
      const icon = CATEGORY_ICONS[parsed.category] || '📦';

      await ctx.reply(
        `📝 Kategori diupdate! Konfirmasi:\n\n${icon} ${parsed.description}\n💰 ${formatRupiah(parsed.amount)}\n📂 ${parsed.category}\n📅 ${new Date(parsed.date).toLocaleDateString('id-ID')}`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Simpan', callback_data: 'save_transaction' },
                { text: '❌ Batal', callback_data: 'cancel_transaction' }
              ]
            ]
          }
        }
      );
      return;
    } else {
      await ctx.reply(`Kategori tidak ditemukan. Pilih salah satu:\n${categories.map(c => `• ${c}`).join('\n')}`);
      return;
    }
  }

  // Parse new transaction
  try {
    // Check transaction limit for free plan
    const limitCheck = await checkTransactionLimit(from.id);
    if (!limitCheck.allowed) {
      await ctx.reply(
        `⚠️ *Batas Transaksi Tercapai*\n\nKamu sudah mencatat ${limitCheck.count}/${limitCheck.limit} transaksi bulan ini (Free Plan).\n\nUpgrade ke Pro untuk unlimited transaksi! 🚀`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const parsed = await parseTransaction(text);
    
    if (!parsed || !parsed.amount) {
      return await ctx.reply(
        '❓ Maaf, saya tidak bisa memahami pesan ini.\n\nContoh penulisan yang benar:\n• "Beli kopi 25rb"\n• "Makan siang 45000"\n• "Gaji 5jt"'
      );
    }

    const icon = CATEGORY_ICONS[parsed.category] || '📦';
    const typeLabel = parsed.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
    
    ctx.session.pendingTransaction = {
      message: text,
      parsed
    };

    await ctx.reply(
      `📝 Saya akan mencatat:\n\n${icon} ${parsed.description || 'Transaksi'}\n💰 ${formatRupiah(parsed.amount)} (${typeLabel})\n📂 ${parsed.category}\n📅 ${new Date(parsed.date).toLocaleDateString('id-ID')}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Simpan', callback_data: 'save_transaction' },
              { text: '✏️ Edit Nominal', callback_data: 'edit_amount' }
            ],
            [
              { text: '📂 Edit Kategori', callback_data: 'edit_category' },
              { text: '❌ Batal', callback_data: 'cancel_transaction' }
            ]
          ]
        }
      }
    );
  } catch (error) {
    console.error('Parse error:', error.message);
    await ctx.reply('Maaf, ada masalah memproses pesan. Coba lagi.');
  }
});

// === CALLBACK QUERY HANDLER ===

bot.on('callback_query', async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  const callbackData = ctx.callbackQuery.data;

  // Onboarding timezone selection
  if (callbackData?.startsWith('tz_')) {
    const timezone = callbackData === 'tz_skip' ? 'Asia/Jakarta' : callbackData.replace('tz_', '');
    
    try {
      const token = await loginAndGetToken(from.id, from.first_name, from.username);
      await axios.put(
        `${API_URL}/api/users/me`,
        { timezone },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (e) {
      console.error('Timezone update error:', e.message);
    }

    ctx.session.onboardingStep = 2;
    
    await ctx.editMessageText(
      `✅ Zona waktu diset ke ${timezone === 'Asia/Jakarta' ? 'WIB' : timezone}!\n\n💡 *Mau set budget awal?*\n\nBudget membantu kamu mengontrol pengeluaran per kategori setiap bulan.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📊 Set Budget Nanti (di Dashboard)', callback_data: 'onboard_budget_later' },
              { text: '⏭️ Skip', callback_data: 'onboard_skip' }
            ]
          ]
        }
      }
    );
    await ctx.answerCallbackQuery();
    return;
  }

  // Onboarding budget skip
  if (callbackData === 'onboard_budget_later' || callbackData === 'onboard_skip') {
    ctx.session.onboarding = false;
    ctx.session.onboardingStep = 0;

    await ctx.editMessageText(
      "🎉 *Setup selesai!*\n\n" +
      "Sekarang kamu bisa mulai mencatat transaksi!\n\n" +
      "📝 Contoh: Ketik \"Beli kopi 25rb\"\n\n" +
      "🌐 Klik button di bawah untuk buka dashboard:",
      { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🌐 Buka Dashboard', url: 'https://finchat.vercel.app/dashboard' }]
          ]
        }
      }
    );
    await ctx.answerCallbackQuery();
    return;
  }

  // Save transaction
  if (callbackData === 'save_transaction') {
    if (ctx.session.pendingTransaction) {
      try {
        const { parsed } = ctx.session.pendingTransaction;
        await createTransaction(
          from.id,
          parsed.amount,
          parsed.type,
          parsed.category,
          parsed.description,
          parsed.date
        );

        const stats = await getTodaySummary(from.id);
        const expense = stats.expense?.total || 0;
        const icon = CATEGORY_ICONS[parsed.category] || '📦';

        await ctx.editMessageText(
          `✅ Tersimpan! ${icon}\n\n${parsed.description}\n${formatRupiah(parsed.amount)} (${parsed.category})\n\n💸 Total pengeluaran hari ini: ${formatRupiah(expense)}`
        );
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
    const categoryList = Object.entries(CATEGORY_ICONS)
      .map(([name, icon]) => `${icon} ${name}`)
      .join('\n');
    await ctx.editMessageText(
      `📂 *Edit Kategori*\n\nKetik nama kategori:\n${categoryList}`,
      { parse_mode: 'Markdown' }
    );
    ctx.session.awaitingCategory = true;
    ctx.session.awaitingAmount = false;
  } else if (callbackData === 'cancel_transaction') {
    await ctx.editMessageText('❌ Transaksi dibatalkan.');
    ctx.session.pendingTransaction = undefined;
    ctx.session.awaitingAmount = false;
    ctx.session.awaitingCategory = false;
  } else if (callbackData === 'confirm_delete') {
    if (ctx.session.pendingDelete) {
      try {
        const token = await loginAndGetToken(from.id);
        await axios.delete(`${API_URL}/api/transactions/${ctx.session.pendingDelete}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        await ctx.editMessageText('✅ Transaksi berhasil dihapus!');
      } catch (error) {
        await ctx.editMessageText('❌ Gagal menghapus transaksi.');
      }
      ctx.session.pendingDelete = undefined;
    }
  } else if (callbackData === 'cancel_delete') {
    await ctx.editMessageText('Hapus transaksi dibatalkan.');
    ctx.session.pendingDelete = undefined;
  }

  await ctx.answerCallbackQuery();
});

console.log('🤖 FinChat Bot starting...');

bot.start().catch((err) => {
  console.error('Failed to start bot:', err.message);
});