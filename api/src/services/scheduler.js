import cron from 'node-cron';
import {
  sendDailyReminder,
  sendBudgetAlerts,
  sendWeeklySummary,
  sendMonthlyReport
} from './notificationService.js';

export const startScheduler = () => {
  console.log('📅 Starting notification scheduler...');

  // Daily reminder at 21:00 WIB (14:00 UTC)
  cron.schedule('0 14 * * *', async () => {
    console.log('Running daily reminder job...');
    await sendDailyReminder();
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

  console.log('✅ Scheduler started: daily reminder (21:00 WIB), budget alerts (6h), weekly (Mon 08:00), monthly (1st 09:00)');
};
