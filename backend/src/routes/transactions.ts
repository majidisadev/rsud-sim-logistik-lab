import express from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/auth';

const router = express.Router();

// Get all transactions with filters
router.get('/', async (req, res) => {
  try {
    const { type, item_id, start_date, end_date } = req.query;

    let query = `
      SELECT 
        t.*,
        i.name as item_name,
        i.image as item_image,
        l.lot_number,
        u.username as user_name
      FROM transactions t
      INNER JOIN items i ON i.id = t.item_id
      INNER JOIN lots l ON l.id = t.lot_id
      INNER JOIN users u ON u.id = t.user_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (type) {
      query += ` AND t.type = $${paramCount++}`;
      params.push(type);
    }

    if (item_id) {
      query += ` AND t.item_id = $${paramCount++}`;
      params.push(item_id);
    }

    if (start_date) {
      query += ` AND DATE(t.created_at) >= $${paramCount++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(t.created_at) <= $${paramCount++}`;
      params.push(end_date);
    }

    query += ` ORDER BY t.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get transaction statistics for dashboard
router.get('/stats', async (req, res) => {
  try {
    const { period } = req.query; // 'daily' or 'monthly'

    if (period === 'daily') {
      const result = await pool.query(
        `SELECT 
          DATE(created_at) as date,
          type,
          COUNT(*) as count
         FROM transactions
         WHERE DATE(created_at) = CURRENT_DATE
         GROUP BY DATE(created_at), type
         ORDER BY type`
      );
      res.json(result.rows);
    } else {
      // Monthly stats
      const result = await pool.query(
        `SELECT 
          TO_CHAR(created_at, 'YYYY-MM') as month,
          type,
          COUNT(*) as count
         FROM transactions
         WHERE created_at >= DATE_TRUNC('year', CURRENT_DATE)
         GROUP BY TO_CHAR(created_at, 'YYYY-MM'), type
         ORDER BY month, type`
      );
      res.json(result.rows);
    }
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create transaction (Barang Masuk or Keluar)
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { type, item_id, lot_id, quantity, notes, lot_number, expiration_date } = req.body;

    if (!type || !item_id || !quantity) {
      return res.status(400).json({ error: 'Type, item_id, and quantity are required' });
    }

    if (!['Masuk', 'Keluar'].includes(type)) {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be positive' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let finalLotId = lot_id;

      // If lot_id not provided, create new lot
      if (!lot_id) {
        if (!lot_number) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Lot number is required when creating new lot' });
        }

        // Check if lot already exists
        const existingLot = await client.query(
          'SELECT id FROM lots WHERE item_id = $1 AND lot_number = $2',
          [item_id, lot_number]
        );

        if (existingLot.rows.length > 0) {
          finalLotId = existingLot.rows[0].id;
        } else {
          // Create new lot
          const lotResult = await client.query(
            `INSERT INTO lots (item_id, lot_number, expiration_date, stock)
             VALUES ($1, $2, $3, 0)
             RETURNING id`,
            [item_id, lot_number, expiration_date || null]
          );
          finalLotId = lotResult.rows[0].id;
        }
      }

      // Get current lot stock
      const lotResult = await client.query(
        'SELECT stock FROM lots WHERE id = $1',
        [finalLotId]
      );

      if (lotResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Lot not found' });
      }

      const currentStock = lotResult.rows[0].stock;
      let newStock: number;

      if (type === 'Masuk') {
        newStock = currentStock + quantity;
      } else {
        // Keluar
        newStock = currentStock - quantity;
        if (newStock < 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Insufficient stock in lot' });
        }
      }

      // Update lot stock
      await client.query(
        'UPDATE lots SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newStock, finalLotId]
      );

      // Create transaction
      const transactionResult = await client.query(
        `INSERT INTO transactions (type, item_id, lot_id, quantity, user_id, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [type, item_id, finalLotId, quantity, req.user!.id, notes || null]
      );

      await client.query('COMMIT');

      // Get full transaction details
      const fullResult = await pool.query(
        `SELECT 
          t.*,
          i.name as item_name,
          l.lot_number,
          u.username as user_name
         FROM transactions t
         INNER JOIN items i ON i.id = t.item_id
         INNER JOIN lots l ON l.id = t.lot_id
         INNER JOIN users u ON u.id = t.user_id
         WHERE t.id = $1`,
        [transactionResult.rows[0].id]
      );

      res.status(201).json(fullResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update transaction
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { quantity, notes } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current transaction
      const currentResult = await client.query(
        'SELECT * FROM transactions WHERE id = $1',
        [id]
      );

      if (currentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Transaction not found' });
      }

      const currentTransaction = currentResult.rows[0];

      // Get current lot stock
      const lotResult = await client.query(
        'SELECT stock FROM lots WHERE id = $1',
        [currentTransaction.lot_id]
      );

      const currentStock = lotResult.rows[0].stock;
      const oldQuantity = currentTransaction.quantity;
      const quantityDiff = quantity - oldQuantity;

      let newStock: number;

      if (currentTransaction.type === 'Masuk') {
        // If quantity increased, add to stock; if decreased, subtract
        newStock = currentStock + quantityDiff;
      } else {
        // Keluar: if quantity increased, subtract from stock; if decreased, add
        newStock = currentStock - quantityDiff;
      }

      if (newStock < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient stock in lot' });
      }

      // Update lot stock
      await client.query(
        'UPDATE lots SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newStock, currentTransaction.lot_id]
      );

      // Update transaction
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (quantity !== undefined) {
        updateFields.push(`quantity = $${paramCount++}`);
        values.push(quantity);
      }

      if (notes !== undefined) {
        updateFields.push(`notes = $${paramCount++}`);
        values.push(notes);
      }

      if (updateFields.length > 0) {
        values.push(id);
        await client.query(
          `UPDATE transactions SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
          values
        );
      }

      await client.query('COMMIT');

      // Get updated transaction
      const result = await pool.query(
        `SELECT 
          t.*,
          i.name as item_name,
          l.lot_number,
          u.username as user_name
         FROM transactions t
         INNER JOIN items i ON i.id = t.item_id
         INNER JOIN lots l ON l.id = t.lot_id
         INNER JOIN users u ON u.id = t.user_id
         WHERE t.id = $1`,
        [id]
      );

      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete transaction (Admin and PJ Gudang only, User cannot delete)
router.delete('/:id', requireRole('Admin', 'PJ Gudang'), async (req, res) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get transaction
      const transactionResult = await client.query(
        'SELECT * FROM transactions WHERE id = $1',
        [id]
      );

      if (transactionResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Transaction not found' });
      }

      const transaction = transactionResult.rows[0];

      // Get current lot stock
      const lotResult = await client.query(
        'SELECT stock FROM lots WHERE id = $1',
        [transaction.lot_id]
      );

      const currentStock = lotResult.rows[0].stock;
      let newStock: number;

      if (transaction.type === 'Masuk') {
        // Reverse masuk: subtract
        newStock = currentStock - transaction.quantity;
      } else {
        // Reverse keluar: add
        newStock = currentStock + transaction.quantity;
      }

      if (newStock < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Cannot delete: would result in negative stock' });
      }

      // Update lot stock
      await client.query(
        'UPDATE lots SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newStock, transaction.lot_id]
      );

      // Delete transaction
      await client.query('DELETE FROM transactions WHERE id = $1', [id]);

      await client.query('COMMIT');

      res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

