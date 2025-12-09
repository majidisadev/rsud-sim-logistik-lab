import express from 'express';
import pool from '../config/database';

const router = express.Router();

// Get monthly/yearly report
router.get('/', async (req, res) => {
  try {
    const { period, year, month } = req.query;

    const params: any[] = [];
    let paramCount = 1;
    let dateFilter = '';

    if (period === 'yearly' && year) {
      dateFilter = `AND EXTRACT(YEAR FROM t.created_at) = $${paramCount}`;
      params.push(year);
      paramCount++;
    } else if (period === 'monthly' && year && month) {
      dateFilter = `AND EXTRACT(YEAR FROM t.created_at) = $${paramCount} AND EXTRACT(MONTH FROM t.created_at) = $${paramCount + 1}`;
      params.push(year, month);
      paramCount += 2;
    }

    const result = await pool.query(
      `SELECT 
        i.id,
        i.name as item_name,
        i.unit,
        COALESCE(SUM(CASE WHEN t.type = 'Masuk' THEN t.quantity ELSE 0 END), 0) as total_masuk,
        COALESCE(SUM(CASE WHEN t.type = 'Keluar' THEN t.quantity ELSE 0 END), 0) as total_keluar
       FROM items i
       LEFT JOIN transactions t ON t.item_id = i.id ${dateFilter}
       WHERE i.status = 'Active'
       GROUP BY i.id, i.name, i.unit
       HAVING COALESCE(SUM(CASE WHEN t.type = 'Masuk' THEN t.quantity ELSE 0 END), 0) > 0
          OR COALESCE(SUM(CASE WHEN t.type = 'Keluar' THEN t.quantity ELSE 0 END), 0) > 0
       ORDER BY i.name`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

