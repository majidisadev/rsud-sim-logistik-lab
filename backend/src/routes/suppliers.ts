import express from 'express';
import pool from '../config/database';
import { requireRole } from '../middleware/auth';

const router = express.Router();

// Get all suppliers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM suppliers ORDER BY name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get supplier by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM suppliers WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const supplier = result.rows[0];

    // Get items with this supplier
    const itemsResult = await pool.query(
      `SELECT i.id, i.name, i.image, i.unit
       FROM items i
       INNER JOIN item_suppliers is_rel ON is_rel.item_id = i.id
       WHERE is_rel.supplier_id = $1 AND i.status = 'Active'
       ORDER BY i.name`,
      [id]
    );

    res.json({
      ...supplier,
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create supplier (Admin only)
router.post('/', requireRole('Admin'), async (req, res) => {
  try {
    const { name, email, phone, cover_image } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Supplier name is required' });
    }

    const result = await pool.query(
      'INSERT INTO suppliers (name, email, phone, cover_image) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email || null, phone || null, cover_image || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Supplier name already exists' });
    }
    console.error('Create supplier error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update supplier (Admin only)
router.put('/:id', requireRole('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, cover_image } = req.body;

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name) {
      updateFields.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (email !== undefined) {
      updateFields.push(`email = $${paramCount++}`);
      values.push(email);
    }

    if (phone !== undefined) {
      updateFields.push(`phone = $${paramCount++}`);
      values.push(phone);
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
      `UPDATE suppliers SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Supplier name already exists' });
    }
    console.error('Update supplier error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete supplier (Admin only)
router.delete('/:id', requireRole('Admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM suppliers WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

