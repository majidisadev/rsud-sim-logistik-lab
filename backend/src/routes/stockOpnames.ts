import express from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/auth';

const router = express.Router();

// Get all stock opnames
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        so.*,
        u1.username as officer_name,
        u2.username as validator_name,
        COUNT(DISTINCT soi.id) FILTER (WHERE soi.opname_stock = soi.recorded_stock AND soi.expiration_match = 'Sesuai') as items_match,
        COUNT(DISTINCT soi.id) FILTER (WHERE soi.opname_stock != soi.recorded_stock OR soi.expiration_match != 'Sesuai') as items_mismatch
       FROM stock_opnames so
       INNER JOIN users u1 ON u1.id = so.officer_id
       LEFT JOIN users u2 ON u2.id = so.validated_by
       LEFT JOIN stock_opname_items soi ON soi.stock_opname_id = so.id
       GROUP BY so.id, u1.username, u2.username
       ORDER BY so.opname_date DESC, so.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get stock opnames error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get stock opname by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const opnameResult = await pool.query(
      `SELECT 
        so.*,
        u1.username as officer_name,
        u2.username as validator_name
       FROM stock_opnames so
       INNER JOIN users u1 ON u1.id = so.officer_id
       LEFT JOIN users u2 ON u2.id = so.validated_by
       WHERE so.id = $1`,
      [id]
    );

    if (opnameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Stock opname not found' });
    }

    const opname = opnameResult.rows[0];

    const itemsResult = await pool.query(
      `SELECT 
        soi.*,
        i.name as item_name,
        i.image as item_image,
        i.unit,
        (soi.opname_stock - soi.recorded_stock) as stock_diff
       FROM stock_opname_items soi
       INNER JOIN items i ON i.id = soi.item_id
       WHERE soi.stock_opname_id = $1
       ORDER BY i.name`,
      [id]
    );

    res.json({
      ...opname,
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error('Get stock opname error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create stock opname
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { opname_date, items } = req.body;

    if (!opname_date) {
      return res.status(400).json({ error: 'Opname date is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create stock opname
      const opnameResult = await client.query(
        `INSERT INTO stock_opnames (opname_date, officer_id)
         VALUES ($1, $2)
         RETURNING *`,
        [opname_date, req.user!.id]
      );

      const opnameId = opnameResult.rows[0].id;

      // Insert opname items
      for (const item of items) {
        const { item_id, recorded_stock, opname_stock, expiration_match, recorded_expiration } = item;

        // Get recorded expiration from lots if not provided
        let finalRecordedExpiration = recorded_expiration;
        if (!finalRecordedExpiration) {
          const expirationResult = await client.query(
            `SELECT MIN(expiration_date) as expiration_date
             FROM lots
             WHERE item_id = $1 AND stock > 0 AND expiration_date IS NOT NULL`,
            [item_id]
          );
          finalRecordedExpiration = expirationResult.rows[0]?.expiration_date || null;
        }

        await client.query(
          `INSERT INTO stock_opname_items 
           (stock_opname_id, item_id, recorded_stock, opname_stock, expiration_match, recorded_expiration)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            opnameId,
            item_id,
            recorded_stock,
            opname_stock,
            expiration_match || 'Sesuai',
            finalRecordedExpiration,
          ]
        );
      }

      await client.query('COMMIT');

      // Get full opname details
      const fullResult = await pool.query(
        `SELECT 
          so.*,
          u1.username as officer_name
         FROM stock_opnames so
         INNER JOIN users u1 ON u1.id = so.officer_id
         WHERE so.id = $1`,
        [opnameId]
      );

      res.status(201).json(fullResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Create stock opname error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add item to stock opname
router.post('/:id/items', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { item_id, recorded_stock, opname_stock, expiration_match, recorded_expiration } = req.body;

    if (!item_id || recorded_stock === undefined || opname_stock === undefined) {
      return res.status(400).json({ error: 'Item ID, recorded stock, and opname stock are required' });
    }

    // Check if opname exists and is not validated
    const opnameResult = await pool.query(
      'SELECT validation_status FROM stock_opnames WHERE id = $1',
      [id]
    );

    if (opnameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Stock opname not found' });
    }

    if (opnameResult.rows[0].validation_status !== 'Belum') {
      return res.status(400).json({ error: 'Cannot add items to validated opname' });
    }

    // Get recorded expiration if not provided
    let finalRecordedExpiration = recorded_expiration;
    if (!finalRecordedExpiration) {
      const expirationResult = await pool.query(
        `SELECT MIN(expiration_date) as expiration_date
         FROM lots
         WHERE item_id = $1 AND stock > 0 AND expiration_date IS NOT NULL`,
        [item_id]
      );
      finalRecordedExpiration = expirationResult.rows[0]?.expiration_date || null;
    }

    const result = await pool.query(
      `INSERT INTO stock_opname_items 
       (stock_opname_id, item_id, recorded_stock, opname_stock, expiration_match, recorded_expiration)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        id,
        item_id,
        recorded_stock,
        opname_stock,
        expiration_match || 'Sesuai',
        finalRecordedExpiration,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add opname item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete item from stock opname
router.delete('/:id/items/:itemId', async (req, res) => {
  try {
    const { id, itemId } = req.params;

    // Check if opname is validated
    const opnameResult = await pool.query(
      'SELECT validation_status FROM stock_opnames WHERE id = $1',
      [id]
    );

    if (opnameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Stock opname not found' });
    }

    if (opnameResult.rows[0].validation_status !== 'Belum') {
      return res.status(400).json({ error: 'Cannot delete items from validated opname' });
    }

    await pool.query(
      'DELETE FROM stock_opname_items WHERE stock_opname_id = $1 AND id = $2',
      [id, itemId]
    );

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete opname item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate stock opname (Admin only)
router.patch('/:id/validate', requireRole('Admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { validation_status } = req.body;

    if (!['Disetujui', 'Tidak Disetujui'].includes(validation_status)) {
      return res.status(400).json({ error: 'Invalid validation status' });
    }

    const result = await pool.query(
      `UPDATE stock_opnames 
       SET validation_status = $1, 
           validated_by = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [validation_status, req.user!.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Stock opname not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Validate stock opname error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

