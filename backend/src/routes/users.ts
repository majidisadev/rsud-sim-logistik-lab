import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { requireRole } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all users (Admin only)
router.get('/', requireRole('Admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, role, status, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
router.get('/:id', requireRole('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, username, role, status FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user (Admin only)
router.post('/', requireRole('Admin'), async (req, res) => {
  try {
    const { username, password, role, status } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role are required' });
    }

    if (!['Admin', 'PJ Gudang', 'User'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (username, password, role, status) VALUES ($1, $2, $3, $4) RETURNING id, username, role, status',
      [username, hashedPassword, role, status || 'Active']
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (Admin only)
router.put('/:id', requireRole('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, role, status, password } = req.body;

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (username) {
      updateFields.push(`username = $${paramCount++}`);
      values.push(username);
    }

    if (role) {
      if (!['Admin', 'PJ Gudang', 'User'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updateFields.push(`role = $${paramCount++}`);
      values.push(role);
    }

    if (status) {
      if (!['Active', 'Inactive'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updateFields.push(`status = $${paramCount++}`);
      values.push(status);
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push(`password = $${paramCount++}`);
      values.push(hashedPassword);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING id, username, role, status`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

