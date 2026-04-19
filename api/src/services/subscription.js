/**
 * Subscription & Payment Service
 * Handles plan management, Midtrans integration, and feature gating.
 */

import { query } from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Plan definitions
export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceAnnual: 0,
    txLimit: 50,
    features: ['50 transaksi/bulan', 'Dashboard basic', 'Kategori otomatis'],
  },
  pro: {
    name: 'Pro',
    price: 14900,
    priceAnnual: 10000,
    txLimit: Infinity,
    features: ['Unlimited transaksi', 'Export PDF/Excel', 'Budget alerts', 'Dashboard lengkap', 'AI categorization'],
  },
  business: {
    name: 'Business',
    price: 29900,
    priceAnnual: 25000,
    txLimit: Infinity,
    features: ['Semua fitur Pro', 'Custom categories unlimited', 'Priority support', 'Data unlimited'],
  }
};

/**
 * Get active subscription for a user
 */
export async function getActiveSubscription(userId) {
  const result = await query(
    `SELECT s.*, p.amount as payment_amount, p.payment_method, p.paid_at
     FROM subscriptions s
     LEFT JOIN payments p ON s.payment_id = p.id
     WHERE s.user_id = $1 AND s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > NOW())
     ORDER BY s.created_at DESC LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Get user's current plan (checks active subscription)
 */
export async function getUserPlan(userId) {
  const sub = await getActiveSubscription(userId);
  if (sub) return sub.plan;

  // Check user's plan field as fallback
  const userResult = await query('SELECT plan FROM users WHERE id = $1', [userId]);
  return userResult.rows[0]?.plan || 'free';
}

/**
 * Check if user can perform action based on plan
 */
export async function checkFeatureAccess(userId, feature) {
  const plan = await getUserPlan(userId);

  const featureGating = {
    export: ['pro', 'business'],
    budget_alerts: ['pro', 'business'],
    unlimited_transactions: ['pro', 'business'],
    custom_categories: ['business'],
  };

  const allowedPlans = featureGating[feature];
  if (!allowedPlans) return true; // Feature not gated

  return allowedPlans.includes(plan);
}

/**
 * Check transaction limit for current month
 * Uses stored monthly count to prevent counting deleted transactions
 */
export async function checkTransactionLimit(userId) {
  const plan = await getUserPlan(userId);
  const planConfig = PLANS[plan] || PLANS.free;

  if (planConfig.txLimit === Infinity) {
    return { allowed: true, count: 0, limit: Infinity, plan };
  }

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  // Get user's stored count and reset date
  const userResult = await query(
    'SELECT monthly_tx_count, monthly_reset_at FROM users WHERE id = $1',
    [userId]
  );
  
  let count = userResult.rows[0]?.monthly_tx_count || 0;
  const resetAt = userResult.rows[0]?.monthly_reset_at;
  
  // If new month, reset count from actual transactions
  const resetDate = resetAt ? new Date(resetAt) : null;
  const monthStart = new Date(currentMonth);
  if (!resetDate || resetDate < monthStart) {
    const startOfMonth = currentMonth;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const endOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    const txResult = await query(
      'SELECT COUNT(*) as count FROM transactions WHERE user_id = $1 AND date >= $2 AND date <= $3 AND is_deleted IS NOT TRUE',
      [userId, startOfMonth, endOfMonth]
    );
    count = parseInt(txResult.rows[0].count);
    
    // Update stored count
    await query(
      'UPDATE users SET monthly_tx_count = $1, monthly_reset_at = NOW() WHERE id = $2',
      [count, userId]
    );
  }

  return {
    allowed: count < planConfig.txLimit,
    count,
    limit: planConfig.txLimit,
    plan
  };
}

/**
 * Create payment order via Midtrans Snap
 */
export async function createPaymentOrder(userId, planKey, annual = false) {
  const plan = PLANS[planKey];
  if (!plan || plan.price === 0) {
    throw new Error('Invalid plan for payment');
  }

  const amount = annual && plan.priceAnnual ? plan.priceAnnual : plan.price;
  const billingPeriod = annual ? 'tahunan' : 'bulanan';

  // Get user info
  const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0];
  if (!user) throw new Error('User not found');

  const orderId = `FINCHAT-${planKey.toUpperCase()}-${Date.now()}`;

  // Save payment record
  const paymentId = uuidv4();
  await query(
    `INSERT INTO payments (id, user_id, order_id, plan, amount, status, billing_period)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
    [paymentId, userId, orderId, planKey, amount, billingPeriod]
  );

  // Create Midtrans Snap transaction
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    // Dev mode: return mock payment
    return {
      paymentId,
      orderId,
      plan: planKey,
      amount: amount,
      annual,
      snapToken: null,
      snapUrl: null,
      mode: 'development',
      message: 'Midtrans not configured. Set MIDTRANS_SERVER_KEY in .env'
    };
  }

  const midtransUrl = process.env.MIDTRANS_IS_PRODUCTION === 'true'
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

  const authString = Buffer.from(`${serverKey}:`).toString('base64');

  const payload = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount
    },
    customer_details: {
      first_name: user.name,
      email: `${user.telegram_id}@finchat.id` // placeholder email
    },
    item_details: [{
      id: planKey,
      price: amount,
      quantity: 1,
      name: `FinChat ${plan.name} - 1 ${annual ? 'Tahun' : 'Bulan'}`
    }],
    callbacks: {
      finish: `${process.env.WEB_URL || 'http://localhost:3000'}/dashboard?payment=success`
    }
  };

  const response = await fetch(midtransUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${authString}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Midtrans error:', errText);
    throw new Error('Failed to create payment');
  }

  const snapData = await response.json();

  return {
    paymentId,
    orderId,
    plan: planKey,
    amount: plan.price,
    snapToken: snapData.token,
    snapUrl: snapData.redirect_url
  };
}

/**
 * Handle Midtrans webhook notification
 */
export async function handlePaymentNotification(notification) {
  const { order_id, transaction_status, payment_type, transaction_id, signature_key, gross_amount, status_code } = notification;

  // Verify signature
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (serverKey) {
    const expectedSig = crypto
      .createHash('sha512')
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest('hex');

    if (signature_key && signature_key !== expectedSig) {
      throw new Error('Invalid signature');
    }
  }

  // Find payment
  const paymentResult = await query(
    'SELECT * FROM payments WHERE order_id = $1',
    [order_id]
  );
  const payment = paymentResult.rows[0];
  if (!payment) throw new Error('Payment not found');

  let newStatus = 'pending';
  if (transaction_status === 'capture' || transaction_status === 'settlement') {
    newStatus = 'paid';
  } else if (transaction_status === 'cancel' || transaction_status === 'deny' || transaction_status === 'expire') {
    newStatus = 'failed';
  } else if (transaction_status === 'pending') {
    newStatus = 'pending';
  }

  // Update payment
  await query(
    `UPDATE payments SET status = $1, payment_method = $2, midtrans_transaction_id = $3, 
     paid_at = CASE WHEN $1 = 'paid' THEN NOW() ELSE paid_at END, 
     updated_at = NOW()
     WHERE id = $4`,
    [newStatus, payment_type, transaction_id, payment.id]
  );

  // If paid, activate subscription
  if (newStatus === 'paid') {
    await activateSubscription(payment.user_id, payment.plan, payment.id);
  }

  return { status: newStatus, payment };
}

/**
 * Activate subscription after payment
 */
export async function activateSubscription(userId, planKey, paymentId) {
  // Get billing period from payment if available
  let billingPeriod = 'bulanan';
  if (paymentId) {
    const paymentResult = await query('SELECT billing_period FROM payments WHERE id = $1', [paymentId]);
    if (paymentResult.rows[0]) {
      billingPeriod = paymentResult.rows[0].billing_period || 'bulanan';
    }
  }

  // Deactivate old subscriptions
  await query(
    "UPDATE subscriptions SET status = 'expired', updated_at = NOW() WHERE user_id = $1 AND status = 'active'",
    [userId]
  );

  // Calculate expiry based on billing period
  const expiresAt = new Date();
  if (billingPeriod === 'tahunan') {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  } else {
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  }

  const subId = uuidv4();
  await query(
    `INSERT INTO subscriptions (id, user_id, plan, status, payment_id, started_at, expires_at, billing_period)
     VALUES ($1, $2, $3, 'active', $4, NOW(), $5, $6)`,
    [subId, userId, planKey, paymentId, expiresAt.toISOString(), billingPeriod]
  );

  // Update user's plan
  await query(
    'UPDATE users SET plan = $1, updated_at = NOW() WHERE id = $2',
    [planKey, userId]
  );

  return subId;
}

/**
 * Dev-only: Manually activate a plan (no payment required)
 */
export async function devActivatePlan(userId, planKey) {
  return activateSubscription(userId, planKey, null);
}

/**
 * Get payment history for a user
 */
export async function getPaymentHistory(userId) {
  const result = await query(
    `SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [userId]
  );
  return result.rows;
}
