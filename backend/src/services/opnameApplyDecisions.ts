import type { PoolClient } from 'pg';

export type ValidationStatus = 'Belum' | 'Disetujui' | 'Tidak disetujui';

/** Keterangan transaksi penyesuaian stok dari opname (tanpa nomor id dokumen). */
export const OPNAME_ADJUSTMENT_NOTES = 'Penyesuaian Opname';

/**
 * Normalisasi ke YYYY-MM-DD untuk kolom DATE (tanpa jam).
 * Untuk string ISO dengan time (mis. dari JSON), jangan pakai slice(0,10) saja — itu tanggal UTC,
 * bisa beda satu hari vs kalender lokal. Setelah validasi, baca dari PG sebagai ::text (DATE murni).
 */
function normDate(v: string | Date | null | undefined): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) {
    if (!Number.isFinite(v.getTime())) return null;
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(v).trim();
  // Hanya ambil 10 karakter pertama jika ini DATE-only (tanpa komponen waktu); hindari UTC slice dari ISO-Z.
  const dateOnly = s.match(/^(\d{4}-\d{2}-\d{2})(?:\s|$)/);
  if (dateOnly) return dateOnly[1];
  const parsed = new Date(s);
  if (!Number.isFinite(parsed.getTime())) return null;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function datesDiffer(a: string | null | undefined, b: string | null | undefined): boolean {
  return normDate(a) !== normDate(b);
}

export type ValidateBody = {
  items?: Array<{
    stock_opname_item_id: number;
    temperature_validation_status?: ValidationStatus;
    /** Legacy rows without lot children */
    stock_validation_status?: ValidationStatus;
    expiration_validation_status?: ValidationStatus;
  }>;
  lots?: Array<{
    stock_opname_item_lot_id: number;
    stock_validation_status?: ValidationStatus;
    expiration_validation_status?: ValidationStatus;
  }>;
};

export async function applyOpnameValidationDecisions(
  client: PoolClient,
  stockOpnameId: number,
  body: ValidateBody,
  adminUserId: number
): Promise<void> {
  const soCheck = await client.query(`SELECT id, validation_status FROM stock_opnames WHERE id = $1`, [
    stockOpnameId,
  ]);
  if (soCheck.rows.length === 0) {
    const e = new Error('Stock opname not found');
    (e as any).statusCode = 404;
    throw e;
  }
  if (soCheck.rows[0].validation_status !== 'Belum') {
    const e = new Error('Stock opname is not pending validation');
    (e as any).statusCode = 400;
    throw e;
  }

  const items = body.items ?? [];
  const lots = body.lots ?? [];

  for (const it of items) {
    const {
      stock_opname_item_id,
      temperature_validation_status,
      stock_validation_status,
      expiration_validation_status,
    } = it;
    const belong = await client.query(
      `SELECT id FROM stock_opname_items WHERE id = $1 AND stock_opname_id = $2`,
      [stock_opname_item_id, stockOpnameId]
    );
    if (belong.rows.length === 0) continue;

    const sets: string[] = [];
    const vals: any[] = [];
    let n = 1;
    if (temperature_validation_status !== undefined) {
      sets.push(`temperature_validation_status = $${n++}`);
      vals.push(temperature_validation_status);
    }
    if (stock_validation_status !== undefined) {
      sets.push(`stock_validation_status = $${n++}`);
      vals.push(stock_validation_status);
    }
    if (expiration_validation_status !== undefined) {
      sets.push(`expiration_validation_status = $${n++}`);
      vals.push(expiration_validation_status);
    }
    if (sets.length === 0) continue;
    vals.push(stock_opname_item_id);
    await client.query(`UPDATE stock_opname_items SET ${sets.join(', ')} WHERE id = $${n}`, vals);
  }

  for (const lot of lots) {
    const { stock_opname_item_lot_id, stock_validation_status, expiration_validation_status } = lot;
    const belong = await client.query(
      `SELECT soil.id
       FROM stock_opname_item_lots soil
       INNER JOIN stock_opname_items soi ON soi.id = soil.stock_opname_item_id
       WHERE soil.id = $1 AND soi.stock_opname_id = $2`,
      [stock_opname_item_lot_id, stockOpnameId]
    );
    if (belong.rows.length === 0) continue;

    const sets: string[] = [];
    const vals: any[] = [];
    let n = 1;
    if (stock_validation_status !== undefined) {
      sets.push(`stock_validation_status = $${n++}`);
      vals.push(stock_validation_status);
    }
    if (expiration_validation_status !== undefined) {
      sets.push(`expiration_validation_status = $${n++}`);
      vals.push(expiration_validation_status);
    }
    if (sets.length === 0) continue;
    vals.push(stock_opname_item_lot_id);
    await client.query(`UPDATE stock_opname_item_lots SET ${sets.join(', ')} WHERE id = $${n}`, vals);
  }

  // Apply side effects for rows now Disetujui
  const soilRows = await client.query(
    `SELECT
        soil.id,
        soil.stock_opname_item_id,
        soil.lot_id,
        soil.recorded_lot_stock,
        soil.opname_lot_stock,
        soil.recorded_expiration::text as recorded_expiration,
        soil.opname_expiration::text as opname_expiration,
        soil.stock_validation_status,
        soil.expiration_validation_status,
        soil.stock_adjustment_posted,
        soi.item_id,
        soi.stock_opname_id
     FROM stock_opname_item_lots soil
     INNER JOIN stock_opname_items soi ON soi.id = soil.stock_opname_item_id
     WHERE soi.stock_opname_id = $1`,
    [stockOpnameId]
  );

  for (const row of soilRows.rows) {
    if (row.stock_validation_status === 'Disetujui' && !row.stock_adjustment_posted) {
      const rec = Number(row.recorded_lot_stock ?? 0);
      const opn = Number(row.opname_lot_stock ?? 0);
      if (rec !== opn) {
        const delta = Math.abs(opn - rec);
        if (delta > 0) {
          const type = opn > rec ? 'Masuk' : 'Keluar';
          const notes = OPNAME_ADJUSTMENT_NOTES;
          await client.query(`UPDATE lots SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [
            opn,
            row.lot_id,
          ]);
          await client.query(
            `INSERT INTO transactions (type, item_id, lot_id, quantity, user_id, notes)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [type, row.item_id, row.lot_id, delta, adminUserId, notes]
          );
        }
      }
      await client.query(`UPDATE stock_opname_item_lots SET stock_adjustment_posted = TRUE WHERE id = $1`, [
        row.id,
      ]);
    }

    if (row.expiration_validation_status === 'Disetujui') {
      if (datesDiffer(row.recorded_expiration, row.opname_expiration)) {
        await client.query(`UPDATE lots SET expiration_date = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [
          normDate(row.opname_expiration),
          row.lot_id,
        ]);
      }
    }
  }

  const soiRows = await client.query(
    `SELECT soi.* FROM stock_opname_items soi WHERE soi.stock_opname_id = $1`,
    [stockOpnameId]
  );

  for (const soi of soiRows.rows) {
    const childCount = await client.query(
      `SELECT COUNT(*)::int AS c FROM stock_opname_item_lots WHERE stock_opname_item_id = $1`,
      [soi.id]
    );
    const hasLots = (childCount.rows[0]?.c ?? 0) > 0;

    if (soi.temperature_validation_status === 'Disetujui' && hasLots) {
      const recT = soi.recorded_temperature ?? null;
      const opT = soi.opname_temperature ?? null;
      if (String(recT ?? '') !== String(opT ?? '') && opT !== null && String(opT).trim() !== '') {
        await client.query(`UPDATE items SET temperature = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [
          opT,
          soi.item_id,
        ]);
      }
    }

    if (!hasLots) {
      if (soi.stock_validation_status === 'Disetujui' && !soi.legacy_stock_adjustment_posted) {
        const rec = Number(soi.recorded_stock ?? 0);
        const opn = Number(soi.opname_stock ?? 0);
        if (rec !== opn) {
          const delta = Math.abs(opn - rec);
          const type = opn > rec ? 'Masuk' : 'Keluar';
          const lotPick = await client.query(
            `SELECT id, stock FROM lots WHERE item_id = $1 ORDER BY id ASC LIMIT 1`,
            [soi.item_id]
          );
          if (lotPick.rows.length > 0) {
            const lid = lotPick.rows[0].id;
            await client.query(`UPDATE lots SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [
              opn,
              lid,
            ]);
            await client.query(
              `INSERT INTO transactions (type, item_id, lot_id, quantity, user_id, notes)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [type, soi.item_id, lid, delta, adminUserId, OPNAME_ADJUSTMENT_NOTES]
            );
          }
        }
        await client.query(
          `UPDATE stock_opname_items SET legacy_stock_adjustment_posted = TRUE WHERE id = $1`,
          [soi.id]
        );
      }
      if (soi.temperature_validation_status === 'Disetujui') {
        const opT = soi.opname_temperature ?? null;
        if (opT !== null && String(opT).trim() !== '') {
          await client.query(`UPDATE items SET temperature = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [
            opT,
            soi.item_id,
          ]);
        }
      }
    }
  }

  // Close document if nothing left Belum
  const pending = await client.query(
    `SELECT EXISTS (
       SELECT 1 FROM stock_opname_items soi
       WHERE soi.stock_opname_id = $1
         AND NOT EXISTS (SELECT 1 FROM stock_opname_item_lots x WHERE x.stock_opname_item_id = soi.id)
         AND (
           soi.temperature_validation_status = 'Belum'
           OR soi.stock_validation_status = 'Belum'
           OR soi.expiration_validation_status = 'Belum'
         )
     ) OR EXISTS (
       SELECT 1
       FROM stock_opname_items soi
       INNER JOIN stock_opname_item_lots soil ON soil.stock_opname_item_id = soi.id
       WHERE soi.stock_opname_id = $1
         AND (
           soi.temperature_validation_status = 'Belum'
           OR soil.stock_validation_status = 'Belum'
           OR soil.expiration_validation_status = 'Belum'
         )
     ) AS p`,
    [stockOpnameId]
  );

  if (!pending.rows[0]?.p) {
    await client.query(
      `UPDATE stock_opnames SET validation_status = 'Selesai', validated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [adminUserId, stockOpnameId]
    );
  }
}
