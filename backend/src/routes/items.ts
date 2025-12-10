import express from 'express';
import pool from '../config/database';
import { requireRole } from '../middleware/auth';

const router = express.Router();

// Helper function to calculate item expiration from lots
async function getItemExpiration(itemId: number): Promise<Date | null> {
  const result = await pool.query(
    `SELECT MIN(expiration_date) as earliest_expiration
     FROM lots
     WHERE item_id = $1 AND stock > 0 AND expiration_date IS NOT NULL`,
    [itemId]
  );
  return result.rows[0]?.earliest_expiration || null;
}

// Helper function to calculate total stock
async function getItemStock(itemId: number): Promise<number> {
  const result = await pool.query(
    'SELECT COALESCE(SUM(stock), 0) as total_stock FROM lots WHERE item_id = $1',
    [itemId]
  );
  return parseInt(result.rows[0].total_stock) || 0;
}

// Get all items with filters
router.get('/', async (req, res) => {
  try {
    const {
      search,
      category_id,
      expired,
      soon_expired,
      out_of_stock,
      low_stock,
      status,
      include_inactive,
    } = req.query;

    let query = `
      SELECT 
        i.*,
        c.name as category_name,
        COALESCE(SUM(l.stock), 0) as total_stock,
        MIN(CASE WHEN l.stock > 0 AND l.expiration_date IS NOT NULL THEN l.expiration_date END) as expiration_date,
        (SELECT MAX(opname_date) FROM stock_opnames so
         INNER JOIN stock_opname_items soi ON soi.stock_opname_id = so.id
         WHERE soi.item_id = i.id) as last_opname_date,
        COALESCE(
          (SELECT STRING_AGG(s.name, ', ' ORDER BY s.name)
           FROM suppliers s
           INNER JOIN item_suppliers is_rel ON is_rel.supplier_id = s.id
           WHERE is_rel.item_id = i.id),
          ''
        ) as supplier_names
      FROM items i
      LEFT JOIN categories c ON c.id = i.category_id
      LEFT JOIN lots l ON l.item_id = i.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (search) {
      query += ` AND i.name ILIKE $${paramCount++}`;
      params.push(`%${search}%`);
    }

    if (category_id) {
      query += ` AND i.category_id = $${paramCount++}`;
      params.push(category_id);
    }

    if (status) {
      query += ` AND i.status = $${paramCount++}`;
      params.push(status);
    } else if (include_inactive !== 'true') {
      // Only filter by Active status if include_inactive is not true
      query += ` AND i.status = 'Active'`;
    }

    query += ` GROUP BY i.id, c.name`;

    // Apply filters after grouping
    if (expired === 'true') {
      query += ` HAVING MIN(CASE WHEN l.stock > 0 AND l.expiration_date IS NOT NULL THEN l.expiration_date END) < CURRENT_DATE`;
    }

    if (soon_expired === 'true') {
      query += ` HAVING MIN(CASE WHEN l.stock > 0 AND l.expiration_date IS NOT NULL THEN l.expiration_date END) BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`;
    }

    if (out_of_stock === 'true') {
      query += ` HAVING COALESCE(SUM(l.stock), 0) = 0`;
    }

    if (low_stock === 'true') {
      query += ` HAVING COALESCE(SUM(l.stock), 0) > 0 AND COALESCE(SUM(l.stock), 0) <= i.min_stock`;
    }

    query += ` ORDER BY i.name`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get item by ID with details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get item details
    const itemResult = await pool.query(
      `SELECT i.*, c.name as category_name
       FROM items i
       LEFT JOIN categories c ON c.id = i.category_id
       WHERE i.id = $1`,
      [id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = itemResult.rows[0];

    // Get suppliers
    const suppliersResult = await pool.query(
      `SELECT s.* FROM suppliers s
       INNER JOIN item_suppliers is_rel ON is_rel.supplier_id = s.id
       WHERE is_rel.item_id = $1`,
      [id]
    );

    // Get lots
    const lotsResult = await pool.query(
      'SELECT * FROM lots WHERE item_id = $1 ORDER BY created_at DESC',
      [id]
    );

    // Get total stock
    const totalStock = await getItemStock(parseInt(id));

    // Get expiration
    const expiration = await getItemExpiration(parseInt(id));

    // Get last opname date
    const opnameResult = await pool.query(
      `SELECT MAX(opname_date) as last_opname_date
       FROM stock_opnames so
       INNER JOIN stock_opname_items soi ON soi.stock_opname_id = so.id
       WHERE soi.item_id = $1`,
      [id]
    );

    // Get transaction history
    const transactionsResult = await pool.query(
      `SELECT t.*, u.username, l.lot_number
       FROM transactions t
       INNER JOIN users u ON u.id = t.user_id
       INNER JOIN lots l ON l.id = t.lot_id
       WHERE t.item_id = $1
       ORDER BY t.created_at DESC
       LIMIT 100`,
      [id]
    );

    res.json({
      ...item,
      suppliers: suppliersResult.rows,
      lots: lotsResult.rows,
      total_stock: totalStock,
      expiration_date: expiration,
      last_opname_date: opnameResult.rows[0]?.last_opname_date || null,
      transactions: transactionsResult.rows,
    });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create item (Admin only)
router.post('/', requireRole('Admin'), async (req, res) => {
  try {
    const {
      name,
      description,
      category_id,
      unit,
      temperature,
      min_stock,
      stock_awal,
      expiration_date,
      image,
      suppliers,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert item
      const itemResult = await client.query(
        `INSERT INTO items (name, description, category_id, unit, temperature, min_stock, image, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Active')
         RETURNING *`,
        [
          name,
          description || null,
          category_id || null,
          unit || null,
          temperature || null,
          min_stock || 1,
          image || null,
        ]
      );

      const item = itemResult.rows[0];

      // Create initial lot if stock_awal > 0
      if (stock_awal > 0) {
        await client.query(
          `INSERT INTO lots (item_id, lot_number, expiration_date, stock)
           VALUES ($1, 'initial', $2, $3)`,
          [item.id, expiration_date || null, stock_awal]
        );
      } else {
        // Create empty lot
        await client.query(
          `INSERT INTO lots (item_id, lot_number, expiration_date, stock)
           VALUES ($1, 'initial', NULL, 0)`,
          [item.id]
        );
      }

      // Add suppliers
      if (suppliers && Array.isArray(suppliers) && suppliers.length > 0) {
        for (const supplierId of suppliers) {
          await client.query(
            'INSERT INTO item_suppliers (item_id, supplier_id) VALUES ($1, $2)',
            [item.id, supplierId]
          );
        }
      }

      await client.query('COMMIT');

      const totalStock = await getItemStock(item.id);
      const expiration = await getItemExpiration(item.id);

      res.status(201).json({
        ...item,
        total_stock: totalStock,
        expiration_date: expiration,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update item (Admin and PJ Gudang only)
router.put('/:id', requireRole('Admin', 'PJ Gudang'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category_id,
      unit,
      temperature,
      min_stock,
      image,
      suppliers,
    } = req.body;

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name) {
      updateFields.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (category_id !== undefined) {
      updateFields.push(`category_id = $${paramCount++}`);
      values.push(category_id);
    }

    if (unit !== undefined) {
      updateFields.push(`unit = $${paramCount++}`);
      values.push(unit);
    }

    if (temperature !== undefined) {
      updateFields.push(`temperature = $${paramCount++}`);
      values.push(temperature);
    }

    if (min_stock !== undefined) {
      updateFields.push(`min_stock = $${paramCount++}`);
      values.push(min_stock);
    }

    if (image !== undefined) {
      updateFields.push(`image = $${paramCount++}`);
      values.push(image);
    }

    if (updateFields.length === 0 && !suppliers) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const result = await client.query(
          `UPDATE items SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
          values
        );

        if (result.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Item not found' });
        }
      }

      // Update suppliers if provided
      if (suppliers !== undefined) {
        await client.query('DELETE FROM item_suppliers WHERE item_id = $1', [id]);

        if (Array.isArray(suppliers) && suppliers.length > 0) {
          for (const supplierId of suppliers) {
            await client.query(
              'INSERT INTO item_suppliers (item_id, supplier_id) VALUES ($1, $2)',
              [id, supplierId]
            );
          }
        }
      }

      await client.query('COMMIT');

      const itemResult = await client.query('SELECT * FROM items WHERE id = $1', [id]);
      res.json(itemResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle item status (Admin only)
router.patch('/:id/toggle-status', requireRole('Admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE items 
       SET status = CASE WHEN status = 'Active' THEN 'Inactive' ELSE 'Active' END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Toggle item status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get lots for item
router.get('/:id/lots', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM lots WHERE item_id = $1 ORDER BY created_at DESC',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get lots error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create lot for item (Admin, PJ Gudang, User)
router.post('/:id/lots', requireRole('Admin', 'PJ Gudang', 'User'), async (req, res) => {
  try {
    const { id } = req.params;
    const { lot_number, expiration_date, stock } = req.body;

    if (!lot_number) {
      return res.status(400).json({ error: 'Lot number is required' });
    }

    // Check if lot number already exists for this item
    const checkResult = await pool.query(
      'SELECT id FROM lots WHERE item_id = $1 AND lot_number = $2',
      [id, lot_number]
    );

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: 'Lot number already exists for this item' });
    }

    const result = await pool.query(
      `INSERT INTO lots (item_id, lot_number, expiration_date, stock)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, lot_number, expiration_date || null, stock || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create lot error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update lot (Admin, PJ Gudang, User)
router.put('/:id/lots/:lotId', requireRole('Admin', 'PJ Gudang', 'User'), async (req, res) => {
  try {
    const { id, lotId } = req.params;
    const { lot_number, expiration_date } = req.body;

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (lot_number) {
      // Check if new lot number already exists (excluding current lot)
      const checkResult = await pool.query(
        'SELECT id FROM lots WHERE item_id = $1 AND lot_number = $2 AND id != $3',
        [id, lot_number, lotId]
      );

      if (checkResult.rows.length > 0) {
        return res.status(400).json({ error: 'Lot number already exists for this item' });
      }

      updateFields.push(`lot_number = $${paramCount++}`);
      values.push(lot_number);
    }

    if (expiration_date !== undefined) {
      updateFields.push(`expiration_date = $${paramCount++}`);
      values.push(expiration_date);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(lotId, id);

    const result = await pool.query(
      `UPDATE lots SET ${updateFields.join(', ')} WHERE id = $${paramCount} AND item_id = $${paramCount + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lot not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update lot error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete lot (Admin, PJ Gudang, User)
router.delete('/:id/lots/:lotId', requireRole('Admin', 'PJ Gudang', 'User'), async (req, res) => {
  try {
    const { id, lotId } = req.params;

    // Check if lot has stock
    const lotResult = await pool.query(
      'SELECT stock FROM lots WHERE id = $1 AND item_id = $2',
      [lotId, id]
    );

    if (lotResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lot not found' });
    }

    if (lotResult.rows[0].stock > 0) {
      return res.status(400).json({ error: 'Cannot delete lot with stock > 0' });
    }

    await pool.query('DELETE FROM lots WHERE id = $1 AND item_id = $2', [lotId, id]);

    res.json({ message: 'Lot deleted successfully' });
  } catch (error) {
    console.error('Delete lot error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

