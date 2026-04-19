import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as exportController from '../controllers/exportController.js';
import { checkFeatureAccess } from '../services/subscription.js';

const router = express.Router();

router.get('/pdf', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check plan access
    const hasAccess = await checkFeatureAccess(userId, 'export');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Fitur Export hanya tersedia untuk plan Pro dan Business. Upgrade sekarang!' });
    }
    
    const { startDate, endDate, category } = req.query;
    await exportController.exportPDF(userId, { startDate, endDate, category }, res);
  } catch (error) {
    console.error('Export PDF error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to export PDF' });
    }
  }
});

router.get('/excel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check plan access
    const hasAccess = await checkFeatureAccess(userId, 'export');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Fitur Export hanya tersedia untuk plan Pro dan Business. Upgrade sekarang!' });
    }
    
    const { startDate, endDate, category } = req.query;
    await exportController.exportExcel(userId, { startDate, endDate, category }, res);
  } catch (error) {
    console.error('Export Excel error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to export Excel' });
    }
  }
});

export default router;
