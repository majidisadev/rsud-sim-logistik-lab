import type { PoolClient } from 'pg';

/** Item is frozen if any of its lots (or legacy opname line without lots) is in an opname doc still Belum with any aspect still Belum. */
export async function isItemStockFrozen(
  poolOrClient: { query: (text: string, params?: any[]) => Promise<{ rows: any[] }> },
  itemId: number
): Promise<boolean> {
  const r = await poolOrClient.query(
    `SELECT EXISTS (
       SELECT 1
       FROM stock_opname_items soi
       INNER JOIN stock_opnames so ON so.id = soi.stock_opname_id
       WHERE soi.item_id = $1
         AND so.validation_status = 'Belum'
         AND NOT EXISTS (SELECT 1 FROM stock_opname_item_lots x WHERE x.stock_opname_item_id = soi.id)
         AND (
           soi.temperature_validation_status = 'Belum'
           OR soi.stock_validation_status = 'Belum'
           OR soi.expiration_validation_status = 'Belum'
         )
     )
     OR EXISTS (
       SELECT 1
       FROM lots l
       INNER JOIN stock_opname_item_lots soil ON soil.lot_id = l.id
       INNER JOIN stock_opname_items soi ON soi.id = soil.stock_opname_item_id
       INNER JOIN stock_opnames so ON so.id = soi.stock_opname_id
       WHERE l.item_id = $1
         AND so.validation_status = 'Belum'
         AND (
           soi.temperature_validation_status = 'Belum'
           OR soil.stock_validation_status = 'Belum'
           OR soil.expiration_validation_status = 'Belum'
         )
     ) AS frozen`,
    [itemId]
  );
  return Boolean(r.rows[0]?.frozen);
}

export async function findPendingLotIdsBlockingNewOpname(
  client: { query: (text: string, params?: any[]) => Promise<{ rows: any[] }> },
  lotIds: number[]
): Promise<number[]> {
  if (!lotIds.length) return [];
  const r = await client.query(
    `SELECT DISTINCT soil.lot_id
     FROM stock_opname_item_lots soil
     INNER JOIN stock_opname_items soi ON soi.id = soil.stock_opname_item_id
     INNER JOIN stock_opnames so ON so.id = soi.stock_opname_id
     WHERE soil.lot_id = ANY($1::int[])
       AND so.validation_status = 'Belum'
       AND (
         soi.temperature_validation_status = 'Belum'
         OR soil.stock_validation_status = 'Belum'
         OR soil.expiration_validation_status = 'Belum'
       )`,
    [lotIds]
  );
  return r.rows.map((row) => row.lot_id as number);
}

export async function getLotsPendingOpnameFlags(
  client: { query: (text: string, params?: any[]) => Promise<{ rows: any[] }> },
  itemId: number
): Promise<Map<number, boolean>> {
  const legacyP = await client.query(
    `SELECT EXISTS (
       SELECT 1 FROM stock_opname_items soi
       INNER JOIN stock_opnames so ON so.id = soi.stock_opname_id
       WHERE soi.item_id = $1 AND so.validation_status = 'Belum'
       AND NOT EXISTS (SELECT 1 FROM stock_opname_item_lots x WHERE x.stock_opname_item_id = soi.id)
       AND (
         soi.temperature_validation_status = 'Belum'
         OR soi.stock_validation_status = 'Belum'
         OR soi.expiration_validation_status = 'Belum'
       )
     ) AS ex`,
    [itemId]
  );
  if (legacyP.rows[0]?.ex) {
    const all = await client.query(`SELECT id FROM lots WHERE item_id = $1`, [itemId]);
    const m = new Map<number, boolean>();
    for (const row of all.rows) m.set(row.id as number, true);
    return m;
  }

  const r = await client.query(
    `SELECT l.id,
            BOOL_OR(
              so.validation_status = 'Belum'
              AND (
                soi.temperature_validation_status = 'Belum'
                OR soil.stock_validation_status = 'Belum'
                OR soil.expiration_validation_status = 'Belum'
              )
            ) AS pending
     FROM lots l
     LEFT JOIN stock_opname_item_lots soil ON soil.lot_id = l.id
     LEFT JOIN stock_opname_items soi ON soi.id = soil.stock_opname_item_id
     LEFT JOIN stock_opnames so ON so.id = soi.stock_opname_id
     WHERE l.item_id = $1
     GROUP BY l.id`,
    [itemId]
  );
  const m = new Map<number, boolean>();
  for (const row of r.rows) {
    m.set(row.id, Boolean(row.pending));
  }
  return m;
}

export async function assertItemNotFrozen(
  poolOrClient: PoolClient | { query: (t: string, p?: any[]) => Promise<{ rows: any[] }> },
  itemId: number
): Promise<void> {
  const frozen = await isItemStockFrozen(poolOrClient, itemId);
  if (frozen) {
    const err = new Error('STOCK_FROZEN_OPNAME');
    (err as any).statusCode = 400;
    throw err;
  }
}
