import express from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/auth';
import { findPendingLotIdsBlockingNewOpname } from '../services/opnameFreeze';
import { applyOpnameValidationDecisions } from '../services/opnameApplyDecisions';

const router = express.Router();

type TemperatureMatch = 'Sesuai' | 'Tidak sesuai';

function isTemperatureMatch(value: any): value is TemperatureMatch {
  return value === 'Sesuai' || value === 'Tidak sesuai';
}

/** Normalisasi input ke YYYY-MM-DD untuk kolom DATE — jangan pakai toISOString() (geser tanggal vs zona waktu). */
function localYmdFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toNullableDateString(value: any): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return null;
    return localYmdFromDate(value);
  }
  if (typeof value === 'string') {
    const v = value.trim();
    if (v === '') return null;
    const dateOnly = v.match(/^(\d{4}-\d{2}-\d{2})(?:\s|$)/);
    if (dateOnly) return dateOnly[1];
    const d = new Date(v);
    if (Number.isFinite(d.getTime())) return localYmdFromDate(d);
    return v;
  }
  const s = String(value);
  const dateOnly = s.match(/^(\d{4}-\d{2}-\d{2})(?:\s|$)/);
  if (dateOnly) return dateOnly[1];
  const d = new Date(s);
  if (Number.isFinite(d.getTime())) return localYmdFromDate(d);
  return s;
}

async function ensureOpnameEditable(opnameId: string | number) {
  const opnameResult = await pool.query('SELECT validation_status FROM stock_opnames WHERE id = $1', [
    opnameId,
  ]);

  if (opnameResult.rows.length === 0) {
    return { ok: false as const, status: 404, error: 'Stock opname not found' };
  }

  if (opnameResult.rows[0].validation_status !== 'Belum') {
    return { ok: false as const, status: 400, error: 'Cannot modify validated opname' };
  }

  return { ok: true as const };
}

async function buildOpnameWithItemsAndLots(opnameId: string | number) {
  const opnameResult = await pool.query(
    `SELECT 
        so.*,
        u1.username as officer_name,
        u2.username as validator_name
     FROM stock_opnames so
     INNER JOIN users u1 ON u1.id = so.officer_id
     LEFT JOIN users u2 ON u2.id = so.validated_by
     WHERE so.id = $1`,
    [opnameId]
  );

  if (opnameResult.rows.length === 0) return null;

  const opname = opnameResult.rows[0];

  const itemsResult = await pool.query(
    `SELECT 
        soi.*,
        i.name as item_name,
        i.image as item_image,
        i.unit,
        i.temperature as item_temperature,
        (soi.opname_stock - soi.recorded_stock) as stock_diff
     FROM stock_opname_items soi
     INNER JOIN items i ON i.id = soi.item_id
     WHERE soi.stock_opname_id = $1
     ORDER BY soi.created_at DESC, i.name`,
    [opnameId]
  );

  const itemIds = itemsResult.rows.map((r: any) => r.id);
  const lotsByItemId = new Map<number, any[]>();
  if (itemIds.length > 0) {
    const lotsResult = await pool.query(
      `SELECT
          soil.id,
          soil.stock_opname_item_id,
          soil.lot_id,
          soil.recorded_lot_stock,
          soil.opname_lot_stock,
          soil.recorded_expiration::text as recorded_expiration,
          soil.opname_expiration::text as opname_expiration,
          soil.created_at,
          soil.stock_validation_status,
          soil.expiration_validation_status,
          soil.stock_adjustment_posted,
          l.lot_number,
          l.item_id as lot_item_id
       FROM stock_opname_item_lots soil
       INNER JOIN lots l ON l.id = soil.lot_id
       WHERE soil.stock_opname_item_id = ANY($1::int[])
       ORDER BY soil.created_at ASC`,
      [itemIds]
    );

    for (const row of lotsResult.rows) {
      const key = row.stock_opname_item_id as number;
      const curr = lotsByItemId.get(key) ?? [];
      curr.push(row);
      lotsByItemId.set(key, curr);
    }
  }

  const items = itemsResult.rows.map((it: any) => ({
    ...it,
    recorded_temperature: it.recorded_temperature ?? it.item_temperature ?? null,
    lots: lotsByItemId.get(it.id) ?? [],
  }));

  return { ...opname, items };
}

// Get flat list of stock opname items (for /stock-opname page)
router.get('/items', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20)
    );
    const offset = (page - 1) * limit;

    const itemIdRaw = req.query.item_id;
    const officerIdRaw = req.query.officer_id;
    const dateStartRaw = req.query.date_start;
    const dateEndRaw = req.query.date_end;
    const pendingValidationRaw = req.query.pending_validation;
    const pvs = Array.isArray(pendingValidationRaw)
      ? String(pendingValidationRaw[0])
      : String(pendingValidationRaw ?? '');
    const pendingOnly = pvs === 'true' || pvs === '1';

    const whereParts: string[] = [];
    const whereParams: any[] = [];
    let paramCount = 1;

    if (itemIdRaw !== undefined && itemIdRaw !== null && String(itemIdRaw).trim() !== '') {
      whereParts.push(`soi.item_id = $${paramCount++}`);
      whereParams.push(Number(itemIdRaw));
    }

    if (officerIdRaw !== undefined && officerIdRaw !== null && String(officerIdRaw).trim() !== '') {
      whereParts.push(`so.officer_id = $${paramCount++}`);
      whereParams.push(Number(officerIdRaw));
    }

    const dateStart = toNullableDateString(dateStartRaw);
    const dateEnd = toNullableDateString(dateEndRaw);
    if (dateStart) {
      whereParts.push(`so.opname_date >= $${paramCount++}`);
      whereParams.push(dateStart);
    }
    if (dateEnd) {
      whereParts.push(`so.opname_date <= $${paramCount++}`);
      whereParams.push(dateEnd);
    }

    if (pendingOnly) {
      whereParts.push(`so.validation_status = 'Belum'`);
      whereParts.push(`(
        soi.temperature_validation_status = 'Belum'
        OR EXISTS (
          SELECT 1 FROM stock_opname_item_lots soil
          WHERE soil.stock_opname_item_id = soi.id
            AND (soil.stock_validation_status = 'Belum' OR soil.expiration_validation_status = 'Belum')
        )
        OR (
          NOT EXISTS (SELECT 1 FROM stock_opname_item_lots soil2 WHERE soil2.stock_opname_item_id = soi.id)
          AND (
            soi.stock_validation_status = 'Belum'
            OR soi.expiration_validation_status = 'Belum'
          )
        )
      )`);
    }

    const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    const totalResult = await pool.query(
      `SELECT COUNT(*)::int as total
       FROM stock_opname_items soi
       INNER JOIN stock_opnames so ON so.id = soi.stock_opname_id
       ${whereSql}`,
      whereParams
    );

    const total = totalResult.rows?.[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const itemsResult = await pool.query(
      `SELECT
          soi.*,
          so.id as stock_opname_id,
          so.opname_date,
          so.validation_status,
          so.officer_id,
          u.username as officer_name,
          i.name as item_name,
          i.image as item_image,
          i.unit,
          i.temperature as item_temperature,
          (soi.opname_stock - soi.recorded_stock) as stock_diff
       FROM stock_opname_items soi
       INNER JOIN stock_opnames so ON so.id = soi.stock_opname_id
       INNER JOIN users u ON u.id = so.officer_id
       INNER JOIN items i ON i.id = soi.item_id
       ${whereSql}
       ORDER BY soi.created_at DESC, soi.id DESC
       LIMIT $${paramCount++}
       OFFSET $${paramCount++}`,
      [...whereParams, limit, offset]
    );

    const opnameItemIds = itemsResult.rows.map((r: any) => r.id);
    const lotsByOpnameItemId = new Map<number, any[]>();
    if (opnameItemIds.length > 0) {
      const lotsResult = await pool.query(
        `SELECT
            soil.id,
            soil.stock_opname_item_id,
            soil.lot_id,
            soil.recorded_lot_stock,
            soil.opname_lot_stock,
            soil.recorded_expiration::text as recorded_expiration,
            soil.opname_expiration::text as opname_expiration,
            soil.created_at,
            soil.stock_validation_status,
            soil.expiration_validation_status,
            soil.stock_adjustment_posted,
            l.lot_number
         FROM stock_opname_item_lots soil
         INNER JOIN lots l ON l.id = soil.lot_id
         WHERE soil.stock_opname_item_id = ANY($1::int[])
         ORDER BY soil.created_at ASC`,
        [opnameItemIds]
      );

      for (const row of lotsResult.rows) {
        const key = row.stock_opname_item_id as number;
        const curr = lotsByOpnameItemId.get(key) ?? [];
        curr.push(row);
        lotsByOpnameItemId.set(key, curr);
      }
    }

    res.json({
      data: itemsResult.rows.map((row: any) => ({
        ...row,
        recorded_temperature: row.recorded_temperature ?? row.item_temperature ?? null,
        lots: lotsByOpnameItemId.get(row.id) ?? [],
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
      },
    });
  } catch (error) {
    console.error('Get stock opname items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get distinct officers from existing opnames (for /stock-opname filter)
router.get('/officers', async (req, res) => {
  try {
    const dateStart = toNullableDateString(req.query.date_start);
    const dateEnd = toNullableDateString(req.query.date_end);

    const whereParts: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (dateStart) {
      whereParts.push(`so.opname_date >= $${paramCount++}`);
      params.push(dateStart);
    }
    if (dateEnd) {
      whereParts.push(`so.opname_date <= $${paramCount++}`);
      params.push(dateEnd);
    }

    const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT DISTINCT
          so.officer_id,
          u.username as officer_name
       FROM stock_opnames so
       INNER JOIN users u ON u.id = so.officer_id
       ${whereSql}
       ORDER BY u.username`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get stock opname officers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
    const opnames = result.rows;
    const opnameIds = opnames.map((o: any) => o.id);

    if (opnameIds.length === 0) return res.json([]);

    const itemsResult = await pool.query(
      `SELECT 
          soi.*,
          i.name as item_name,
          i.image as item_image,
          i.unit,
          i.temperature as item_temperature
       FROM stock_opname_items soi
       INNER JOIN items i ON i.id = soi.item_id
       WHERE soi.stock_opname_id = ANY($1::int[])
       ORDER BY soi.created_at DESC`,
      [opnameIds]
    );

    const opnameItemIds = itemsResult.rows.map((r: any) => r.id);
    const lotsByOpnameItemId = new Map<number, any[]>();
    if (opnameItemIds.length > 0) {
      const lotsResult = await pool.query(
        `SELECT
            soil.id,
            soil.stock_opname_item_id,
            soil.lot_id,
            soil.recorded_lot_stock,
            soil.opname_lot_stock,
            soil.recorded_expiration::text as recorded_expiration,
            soil.opname_expiration::text as opname_expiration,
            soil.created_at,
            soil.stock_validation_status,
            soil.expiration_validation_status,
            soil.stock_adjustment_posted,
            l.lot_number
         FROM stock_opname_item_lots soil
         INNER JOIN lots l ON l.id = soil.lot_id
         WHERE soil.stock_opname_item_id = ANY($1::int[])
         ORDER BY soil.created_at ASC`,
        [opnameItemIds]
      );

      for (const row of lotsResult.rows) {
        const key = row.stock_opname_item_id as number;
        const curr = lotsByOpnameItemId.get(key) ?? [];
        curr.push(row);
        lotsByOpnameItemId.set(key, curr);
      }
    }

    const itemsByOpnameId = new Map<number, any[]>();
    for (const row of itemsResult.rows) {
      const key = row.stock_opname_id as number;
      const curr = itemsByOpnameId.get(key) ?? [];
      curr.push({
        ...row,
        recorded_temperature: row.recorded_temperature ?? row.item_temperature ?? null,
        lots: lotsByOpnameItemId.get(row.id) ?? [],
      });
      itemsByOpnameId.set(key, curr);
    }

    res.json(
      opnames.map((o: any) => ({
        ...o,
        items: itemsByOpnameId.get(o.id) ?? [],
      }))
    );
  } catch (error) {
    console.error('Get stock opnames error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get stock opname by ID (detail + validation UI)
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const data = await buildOpnameWithItemsAndLots(id);
    if (!data) {
      return res.status(404).json({ error: 'Stock opname not found' });
    }
    res.json(data);
  } catch (error) {
    console.error('Get stock opname by id error:', error);
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
        const itemId = item?.item_id;
        const lots = Array.isArray(item?.lots) ? item.lots : null;

        // Backward compatibility: old payload without lots
        if (!lots) {
          const { recorded_stock, opname_stock, expiration_match, recorded_expiration } = item;
          const legacyItemId = item?.item_id;
          if (legacyItemId) {
            const legacyPendingLegacy = await client.query(
              `SELECT 1 FROM stock_opname_items soi
               INNER JOIN stock_opnames so ON so.id = soi.stock_opname_id
               WHERE soi.item_id = $1 AND so.validation_status = 'Belum'
               AND NOT EXISTS (SELECT 1 FROM stock_opname_item_lots x WHERE x.stock_opname_item_id = soi.id)
               AND (
                 soi.temperature_validation_status = 'Belum'
                 OR soi.stock_validation_status = 'Belum'
                 OR soi.expiration_validation_status = 'Belum'
               )
               LIMIT 1`,
              [legacyItemId]
            );
            if (legacyPendingLegacy.rows.length > 0) {
              throw new Error('ITEM_HAS_PENDING_LEGACY_OPNAME');
            }
          }

          // Get recorded expiration from lots if not provided
          let finalRecordedExpiration = recorded_expiration;
          if (!finalRecordedExpiration) {
            const expirationResult = await client.query(
              `SELECT MIN(expiration_date) as expiration_date
               FROM lots
               WHERE item_id = $1 AND stock > 0 AND expiration_date IS NOT NULL`,
              [itemId]
            );
            finalRecordedExpiration = expirationResult.rows[0]?.expiration_date || null;
          }

          await client.query(
            `INSERT INTO stock_opname_items 
             (stock_opname_id, item_id, recorded_stock, opname_stock, expiration_match, recorded_expiration, recorded_temperature, temperature_match,
              temperature_validation_status, stock_validation_status, expiration_validation_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Belum', 'Belum', 'Belum')`,
            [
              opnameId,
              itemId,
              recorded_stock,
              opname_stock,
              expiration_match || 'Sesuai',
              toNullableDateString(finalRecordedExpiration),
              item?.recorded_temperature ?? null,
              isTemperatureMatch(item?.temperature_match) ? item.temperature_match : null,
            ]
          );
          continue;
        }

        if (!itemId) {
          throw new Error('Item ID is required');
        }

        const legacyPending = await client.query(
          `SELECT 1 FROM stock_opname_items soi
           INNER JOIN stock_opnames so ON so.id = soi.stock_opname_id
           WHERE soi.item_id = $1 AND so.validation_status = 'Belum'
           AND NOT EXISTS (SELECT 1 FROM stock_opname_item_lots x WHERE x.stock_opname_item_id = soi.id)
           AND (
             soi.temperature_validation_status = 'Belum'
             OR soi.stock_validation_status = 'Belum'
             OR soi.expiration_validation_status = 'Belum'
           )
           LIMIT 1`,
          [itemId]
        );
        if (legacyPending.rows.length > 0) {
          throw new Error('ITEM_HAS_PENDING_LEGACY_OPNAME');
        }

        const itemDetail = await client.query('SELECT temperature FROM items WHERE id = $1', [itemId]);
        if (itemDetail.rows.length === 0) {
          throw new Error('Item not found');
        }

        const recordedTemperature = item?.recorded_temperature ?? itemDetail.rows[0].temperature ?? null;
        const opnameTemperature = item?.opname_temperature ?? null;
        const temperatureMatch = isTemperatureMatch(item?.temperature_match)
          ? item.temperature_match
          : null;

        // Insert parent item with totals computed from lots
        const lotIds = lots.map((l: any) => l?.lot_id).filter((x: any) => !!x);
        if (lotIds.length === 0) {
          throw new Error('At least one lot is required');
        }

        const blockedLots = await findPendingLotIdsBlockingNewOpname(client, lotIds as number[]);
        if (blockedLots.length > 0) {
          throw new Error(`LOTS_PENDING_OPNAME:${blockedLots.join(',')}`);
        }

        const lotRowsResult = await client.query(
          `SELECT id, stock, expiration_date::text as expiration_date
           FROM lots
           WHERE item_id = $1 AND id = ANY($2::int[])`,
          [itemId, lotIds]
        );

        const lotById = new Map<number, any>();
        for (const r of lotRowsResult.rows) lotById.set(r.id, r);

        const lotInserts: Array<{
          lot_id: number;
          recorded_lot_stock: number;
          opname_lot_stock: number;
          recorded_expiration: string | null;
          opname_expiration: string | null;
        }> = [];

        let totalRecorded = 0;
        let totalOpname = 0;
        let minRecordedExpiration: string | null = null;

        for (const l of lots) {
          const lotId = Number(l?.lot_id);
          const opnameLotStock = Number(l?.opname_lot_stock);
          if (!Number.isFinite(lotId) || !Number.isFinite(opnameLotStock)) {
            throw new Error('Invalid lot payload');
          }

          const lotRow = lotById.get(lotId);
          if (!lotRow) {
            throw new Error('Lot not found for item');
          }

          const recordedLotStock = Number(lotRow.stock ?? 0);
          totalRecorded += recordedLotStock;
          totalOpname += opnameLotStock;

          const recordedExp = toNullableDateString(lotRow.expiration_date);
          if (recordedExp) {
            if (!minRecordedExpiration || recordedExp < minRecordedExpiration) minRecordedExpiration = recordedExp;
          }

          lotInserts.push({
            lot_id: lotId,
            recorded_lot_stock: recordedLotStock,
            opname_lot_stock: opnameLotStock,
            recorded_expiration: recordedExp,
            opname_expiration: toNullableDateString(l?.opname_expiration),
          });
        }

        const parentInsert = await client.query(
          `INSERT INTO stock_opname_items 
           (stock_opname_id, item_id, recorded_stock, opname_stock, expiration_match, recorded_expiration, recorded_temperature, opname_temperature, temperature_match,
            temperature_validation_status, stock_validation_status, expiration_validation_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Belum', NULL, NULL)
           RETURNING id`,
          [
            opnameId,
            itemId,
            totalRecorded,
            totalOpname,
            'Sesuai',
            minRecordedExpiration,
            recordedTemperature,
            opnameTemperature,
            temperatureMatch,
          ]
        );

        const opnameItemId = parentInsert.rows[0].id;
        for (const li of lotInserts) {
          await client.query(
            `INSERT INTO stock_opname_item_lots
             (stock_opname_item_id, lot_id, recorded_lot_stock, opname_lot_stock, recorded_expiration, opname_expiration,
              stock_validation_status, expiration_validation_status)
             VALUES ($1, $2, $3, $4, $5, $6, 'Belum', 'Belum')`,
            [
              opnameItemId,
              li.lot_id,
              li.recorded_lot_stock,
              li.opname_lot_stock,
              li.recorded_expiration,
              li.opname_expiration,
            ]
          );
        }
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
    if (error?.message === 'ITEM_HAS_PENDING_LEGACY_OPNAME') {
      return res.status(400).json({
        error: 'Barang ini masih memiliki stock opname lama yang belum selesai divalidasi',
      });
    }
    if (typeof error?.message === 'string' && error.message.startsWith('LOTS_PENDING_OPNAME:')) {
      return res.status(400).json({
        error: 'Salah satu lot masih dalam stock opname yang belum selesai divalidasi',
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add item to stock opname (disabled - create happens via POST /stock-opnames)
router.post('/:id/items', async (req: AuthRequest, res) => {
  return res.status(404).json({ error: 'Endpoint disabled' });
});

// Delete item from stock opname (disabled - list-only UI)
router.delete('/:id/items/:itemId', async (req, res) => {
  return res.status(404).json({ error: 'Endpoint disabled' });
});

// Update stock opname item (temperature match)
router.patch('/:id/items/:itemId', async (req: AuthRequest, res) => {
  return res.status(404).json({ error: 'Endpoint disabled' });
});

// Add lot to existing stock opname item (append lot stock tercatat)
router.post('/:id/items/:itemId/lots', async (req: AuthRequest, res) => {
  return res.status(404).json({ error: 'Endpoint disabled' });
});

// Update existing lot row (edit lot stock opname + tanggal kadaluarsa lot opname)
router.patch('/:id/items/:itemId/lots/:itemLotId', async (req: AuthRequest, res) => {
  return res.status(404).json({ error: 'Endpoint disabled' });
});

// Validate stock opname (Admin only)
router.patch('/:id/validate', requireRole('Admin'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await applyOpnameValidationDecisions(client, id, req.body ?? {}, req.user!.id);
      await client.query('COMMIT');
      const data = await buildOpnameWithItemsAndLots(id);
      res.json(data);
    } catch (e: any) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Validate stock opname error:', error);
    const code = error?.statusCode;
    if (code === 404) {
      return res.status(404).json({ error: error.message || 'Not found' });
    }
    if (code === 400) {
      return res.status(400).json({ error: error.message || 'Bad request' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

