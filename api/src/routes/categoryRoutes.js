import express from 'express';
import * as categoryController from '../controllers/categoryController.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkFeatureAccess } from '../services/subscription.js';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const categories = await categoryController.getCategories(userId);
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, icon, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check plan access for custom categories
    const hasAccess = await checkFeatureAccess(userId, 'custom_categories');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Fitur Custom Categories hanya tersedia untuk plan Premium. Upgrade sekarang!' });
    }

    const category = await categoryController.createCategory(userId, { name, icon, color });
    res.json({ success: true, category });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, icon, color } = req.body;

    const category = await categoryController.updateCategory(id, userId, { name, icon, color });
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found or cannot be updated' });
    }

    res.json({ success: true, category });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const category = await categoryController.deleteCategory(id, userId);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found or cannot be deleted' });
    }

    res.json({ success: true, message: 'Category deleted', category });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;