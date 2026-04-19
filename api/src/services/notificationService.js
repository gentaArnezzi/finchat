import axios from 'axios';
import { query } from '../db.js';
import dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const formatRupiah = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const sendTelegramMessage = async (chatId, text) => {
  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error(`Failed to send message to ${chatId}:`, error.message);
  }
};

const TIMEZONE_OFFSETS = {
  'Asia/Jakarta': 7,
  'Asia/Makassar': 8,
  'Asia/Jayapura': 9,
};

export const sendDailyReminder = async (currentTime = null) => {
  try {
    const result = await query(`
      SELECT u.telegram_id, u.name, p.reminder_time, u.timezone
      FROM users u
      JOIN user_preferences p ON u.id = p.user_id
      WHERE p.daily_reminder = true
    `);

    // Group users by adjusted hour in their timezone
    const usersByHour = {};
    
    for (const user of result.rows) {
      const offset = TIMEZONE_OFFSETS[user.timezone] || 7;
      const reminderHour = parseInt(user.reminder_time?.split(':')[0] || '21');
      const userHourUTC = (reminderHour - offset + 24) % 24;
      const hourKey = userHourUTC.toString().padStart(2, '0') + ':00';
      
      if (!usersByHour[hourKey]) usersByHour[hourKey] = [];
      usersByHour[hourKey].push(user);
    }
    
    // Only process for current UTC hour if specified
    if (currentTime) {
      const users = usersByHour[currentTime] || [];
      for (const user of users) {
        await sendTelegramMessage(
          user.telegram_id,
          `⏰ <b>Reminder Harian</b>\n\nHalo ${user.name}! Jangan lupa catat pengeluaran hari ini ya!\n\nKetik transaksi langsung di chat ini 📝`
        );
      }
      console.log(`Daily reminder sent to ${users.length} users for hour ${currentTime}`);
      return { sent: users.length };
    }

    for (const user of result.rows) {
      await sendTelegramMessage(
        user.telegram_id,
        `⏰ <b>Reminder Harian</b>\n\nHalo ${user.name}! Jangan lupa catat pengeluaran hari ini ya!\n\nKetik transaksi langsung di chat ini 📝`
      );
    }

    console.log(`Daily reminder sent to ${result.rows.length} users`);
  } catch (error) {
    console.error('Failed to send daily reminders:', error);
  }
};

export const sendBudgetAlerts = async () => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const result = await query(`
      SELECT 
        u.telegram_id, u.name,
        b.amount as budget_amount,
        c.name as category_name,
        c.icon as category_icon,
        COALESCE(SUM(t.amount), 0) as spent
      FROM budgets b
      JOIN users u ON b.user_id = u.id
      JOIN user_preferences p ON u.id = p.user_id AND p.budget_alerts = true
      LEFT JOIN categories c ON b.category_id = c.id
      LEFT JOIN transactions t ON t.category_id = b.category_id 
        AND t.user_id = b.user_id 
        AND t.type = 'expense'
        AND t.date >= $1 AND t.date <= $2
      WHERE b.month = $3 AND b.year = $4
      GROUP BY u.telegram_id, u.name, b.amount, c.name, c.icon
    `, [startDate, endDate, month, year]);

    for (const row of result.rows) {
      const spent = parseFloat(row.spent);
      const budget = parseFloat(row.budget_amount);
      const percent = (spent / budget) * 100;

      if (percent >= 100) {
        await sendTelegramMessage(
          row.telegram_id,
          `🚨 <b>Budget Exceeded!</b>\n\n${row.category_icon} ${row.category_name}\nBudget: ${formatRupiah(budget)}\nTerpakai: ${formatRupiah(spent)} (${percent.toFixed(0)}%)\n\n⚠️ Kamu sudah melebihi budget!`
        );
      } else if (percent >= 80) {
        await sendTelegramMessage(
          row.telegram_id,
          `⚠️ <b>Budget Hampir Habis!</b>\n\n${row.category_icon} ${row.category_name}\nBudget: ${formatRupiah(budget)}\nTerpakai: ${formatRupiah(spent)} (${percent.toFixed(0)}%)\nSisa: ${formatRupiah(budget - spent)}\n\n💡 Perhatikan pengeluaranmu di kategori ini.`
        );
      }
    }

    console.log(`Budget alerts checked for ${result.rows.length} budgets`);
  } catch (error) {
    console.error('Failed to send budget alerts:', error);
  }
};

export const sendWeeklySummary = async () => {
  try {
    const result = await query(`
      SELECT u.telegram_id, u.name, u.id as user_id
      FROM users u
      JOIN user_preferences p ON u.id = p.user_id
      WHERE p.weekly_summary = true
    `);

    for (const user of result.rows) {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const stats = await query(`
        SELECT type, SUM(amount) as total, COUNT(*) as count
        FROM transactions
        WHERE user_id = $1 AND date >= $2 AND date <= $3
        GROUP BY type
      `, [user.user_id, startDate, endDate]);

      let income = 0, expense = 0, incomeCount = 0, expenseCount = 0;
      stats.rows.forEach(r => {
        if (r.type === 'income') { income = parseFloat(r.total); incomeCount = parseInt(r.count); }
        if (r.type === 'expense') { expense = parseFloat(r.total); expenseCount = parseInt(r.count); }
      });

      const topCategories = await query(`
        SELECT c.name, c.icon, SUM(t.amount) as total
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = $1 AND t.date >= $2 AND t.date <= $3 AND t.type = 'expense'
        GROUP BY c.name, c.icon
        ORDER BY total DESC
        LIMIT 3
      `, [user.user_id, startDate, endDate]);

      let categoryText = topCategories.rows.map(c =>
        `  ${c.icon} ${c.name}: ${formatRupiah(parseFloat(c.total))}`
      ).join('\n');

      await sendTelegramMessage(
        user.telegram_id,
        `📊 <b>Ringkasan Mingguan</b>\n(${startDate} s/d ${endDate})\n\n💰 Pemasukan: ${formatRupiah(income)} (${incomeCount} transaksi)\n💸 Pengeluaran: ${formatRupiah(expense)} (${expenseCount} transaksi)\n📈 Saldo: ${formatRupiah(income - expense)}\n\n🔝 <b>Top Pengeluaran:</b>\n${categoryText || '  Tidak ada data'}\n\nBuka dashboard: /dashboard`
      );
    }

    console.log(`Weekly summary sent to ${result.rows.length} users`);
  } catch (error) {
    console.error('Failed to send weekly summary:', error);
  }
};

export const sendMonthlyReport = async () => {
  try {
    const prevMonth = new Date();
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const month = prevMonth.getMonth() + 1;
    const year = prevMonth.getFullYear();
    const monthName = prevMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    const result = await query(`
      SELECT u.telegram_id, u.name, u.id as user_id
      FROM users u
      JOIN user_preferences p ON u.id = p.user_id
      WHERE p.monthly_report = true
    `);

    for (const user of result.rows) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const stats = await query(`
        SELECT type, SUM(amount) as total, COUNT(*) as count
        FROM transactions
        WHERE user_id = $1 AND date >= $2 AND date <= $3
        GROUP BY type
      `, [user.user_id, startDate, endDate]);

      let income = 0, expense = 0;
      stats.rows.forEach(r => {
        if (r.type === 'income') income = parseFloat(r.total);
        if (r.type === 'expense') expense = parseFloat(r.total);
      });

      await sendTelegramMessage(
        user.telegram_id,
        `📅 <b>Laporan Bulanan - ${monthName}</b>\n\n💰 Total Pemasukan: ${formatRupiah(income)}\n💸 Total Pengeluaran: ${formatRupiah(expense)}\n📈 Saldo: ${formatRupiah(income - expense)}\n\nLihat detail lengkap di dashboard:\n/dashboard`
      );
    }

    console.log(`Monthly report sent to ${result.rows.length} users`);
  } catch (error) {
    console.error('Failed to send monthly report:', error);
  }
};
