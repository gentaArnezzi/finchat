import express from 'express';
import * as subscriptionService from '../services/subscription.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/subscription/plans - List available plans
 */
router.get('/plans', (req, res) => {
  const plans = Object.entries(subscriptionService.PLANS).map(([key, plan]) => ({
    id: key,
    ...plan,
    priceFormatted: new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(plan.price)
  }));
  res.json({ success: true, plans });
});

/**
 * GET /api/subscription/status - Get current user's subscription status
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [plan, subscription, limit] = await Promise.all([
      subscriptionService.getUserPlan(userId),
      subscriptionService.getActiveSubscription(userId),
      subscriptionService.checkTransactionLimit(userId)
    ]);

    const planConfig = subscriptionService.PLANS[plan] || subscriptionService.PLANS.free;

    res.json({
      success: true,
      subscription: {
        plan,
        planName: planConfig.name,
        price: planConfig.price,
        features: planConfig.features,
        expiresAt: subscription?.expires_at || null,
        status: subscription?.status || 'free',
        transactionUsage: {
          used: limit.count,
          limit: limit.limit === Infinity ? 'unlimited' : limit.limit,
          allowed: limit.allowed
        }
      }
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

/**
 * POST /api/subscription/create-payment - Create a payment order
 */
router.post('/create-payment', authenticateToken, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!plan || !['pro', 'business'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Choose "pro" or "business".' });
    }

    const result = await subscriptionService.createPaymentOrder(req.user.id, plan);
    res.json({ success: true, payment: result });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment' });
  }
});

/**
 * POST /api/subscription/webhook - Midtrans notification webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    const result = await subscriptionService.handlePaymentNotification(req.body);
    console.log(`💳 Payment ${result.status} for order ${req.body.order_id}`);
    res.json({ success: true, status: result.status });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/subscription/dev-activate - Dev only: activate plan without payment
 */
router.post('/dev-activate', authenticateToken, async (req, res) => {
  // Only allow if Midtrans is NOT configured
  if (process.env.MIDTRANS_SERVER_KEY) {
    return res.status(403).json({ error: 'Payment system active. Please pay via Midtrans.' });
  }

  try {
    const { plan } = req.body;
    if (!plan || !['pro', 'premium'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const subId = await subscriptionService.devActivatePlan(req.user.id, plan);
    res.json({ success: true, subscriptionId: subId, plan });
  } catch (error) {
    console.error('Dev activate error:', error);
    res.status(500).json({ error: 'Failed to activate plan' });
  }
});

/**
 * GET /api/subscription/payments - Get payment history
 */
router.get('/payments', authenticateToken, async (req, res) => {
  try {
    const payments = await subscriptionService.getPaymentHistory(req.user.id);
    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get payment history' });
  }
});

/**
 * GET /api/subscription/check-feature/:feature - Check if user has access to feature
 */
router.get('/check-feature/:feature', authenticateToken, async (req, res) => {
  try {
    const hasAccess = await subscriptionService.checkFeatureAccess(req.user.id, req.params.feature);
    res.json({ success: true, hasAccess, feature: req.params.feature });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check feature access' });
  }
});

export default router;
