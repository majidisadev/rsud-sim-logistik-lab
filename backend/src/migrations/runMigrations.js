const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sim_logistik_lab',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function runMigrations() {
  try {
    const createTablesSql = fs.readFileSync(
      path.join(__dirname, 'createTables.sql'),
      'utf8'
    );
    
    await pool.query(createTablesSql);

    const opnameValidationSql = fs.readFileSync(
      path.join(__dirname, 'opnameValidation.sql'),
      'utf8'
    );
    await pool.query(opnameValidationSql);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        id TEXT PRIMARY KEY
      )
    `);
    const mig = await pool.query(
      `INSERT INTO _schema_migrations (id) VALUES ('opname_validation_v1') ON CONFLICT (id) DO NOTHING RETURNING id`
    );
    if (mig.rows.length > 0) {
      await pool.query(`
        UPDATE stock_opname_item_lots
        SET stock_validation_status = 'Disetujui',
            expiration_validation_status = 'Disetujui'
        WHERE stock_validation_status = 'Belum' OR expiration_validation_status = 'Belum'
      `);
      await pool.query(`
        UPDATE stock_opname_items
        SET temperature_validation_status = COALESCE(temperature_validation_status, 'Disetujui')
      `);
      await pool.query(`
        UPDATE stock_opname_items soi
        SET stock_validation_status = 'Disetujui',
            expiration_validation_status = 'Disetujui'
        WHERE NOT EXISTS (
          SELECT 1 FROM stock_opname_item_lots l WHERE l.stock_opname_item_id = soi.id
        )
        AND (stock_validation_status IS NULL OR stock_validation_status = 'Belum')
      `);
      await pool.query(`
        UPDATE stock_opname_items soi
        SET stock_validation_status = NULL,
            expiration_validation_status = NULL
        WHERE EXISTS (
          SELECT 1 FROM stock_opname_item_lots l WHERE l.stock_opname_item_id = soi.id
        )
      `);
      await pool.query(`
        UPDATE stock_opnames SET validation_status = 'Selesai' WHERE validation_status = 'Belum'
      `);
      console.log('One-time opname validation backfill applied');
    }

    console.log('Database migrations completed successfully');
    
    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const checkAdmin = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      ['admin']
    );
    
    if (checkAdmin.rows.length === 0) {
      await pool.query(
        'INSERT INTO users (username, password, role, status) VALUES ($1, $2, $3, $4)',
        ['admin', hashedPassword, 'Admin', 'Active']
      );
      console.log('Default admin user created (username: admin, password: admin123)');
    } else {
      console.log('Admin user already exists');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    await pool.end();
    process.exit(1);
  }
}

runMigrations();

