import express from 'express';
import pool from '../config/database';
import { requireRole } from '../middleware/auth';

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM categories ORDER BY name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get category by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM categories WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const category = result.rows[0];

    // Get items in this category
    const itemsResult = await pool.query(
      `SELECT i.id, i.name, i.image, 
       COALESCE(SUM(l.stock), 0) as stock
       FROM items i
       LEFT JOIN lots l ON l.item_id = i.id
       WHERE i.category_id = $1 AND i.status = 'Active'
       GROUP BY i.id, i.name, i.image
       ORDER BY i.name`,
      [id]
    );

    res.json({
      ...category,
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create category (Admin only)
router.post('/', requireRole('Admin'), async (req, res) => {
  try {
    const { name, cover_image } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const result = await pool.query(
      'INSERT INTO categories (name, cover_image) VALUES ($1, $2) RETURNING *',
      [name, cover_image || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update category (Admin only)
router.put('/:id', requireRole('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, cover_image } = req.body;

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name) {
      updateFields.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (cover_image !== undefined) {
      updateFields.push(`cover_image = $${paramCount++}`);
      values.push(cover_image);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE categories SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete category (Admin only)
router.delete('/:id', requireRole('Admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

