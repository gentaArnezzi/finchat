import cron from 'node-cron';
import {
  sendDailyReminder,
  sendBudgetAlerts,
  sendWeeklySummary,
  sendMonthlyReport
} from './notificationService.js';

export const startScheduler = () => {
  console.log('📅 Starting notification scheduler...');

  // Run every hour to check for daily reminder based on user preference
  cron.schedule('0 * * * *', async () => {
    const now = new Date();
    const hourUTC = now.getUTCHours();
    const hourWIB = (hourUTC + 7) % 24;
    
    // Check all users who have daily_reminder enabled and their reminder_time matches current hour
    console.log(`Running daily reminder check for hour ${hourWIB}...`);
    await sendDailyReminder(hourWIB.toString().padStart(2, '0') + ':00');
  });

  // Budget alert check every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('Running budget alert check...');
    await sendBudgetAlerts();
  });

  // Weekly summary every Monday at 08:00 WIB (01:00 UTC)
  cron.schedule('0 1 * * 1', async () => {
    console.log('Running weekly summary...');
    await sendWeeklySummary();
  });

  // Monthly report on 1st of each month at 09:00 WIB (02:00 UTC)
  cron.schedule('0 2 1 * *', async () => {
    console.log('Running monthly report...');
    await sendMonthlyReport();
  });

  console.log('✅ Scheduler started: hourly reminder check, budget alerts (6h), weekly (Mon 08:00), monthly (1st 09:00)');
};
