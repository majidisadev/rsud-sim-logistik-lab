import pool from '../config/database';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

async function runMigrations() {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'createTables.sql'),
      'utf8'
    );
    
    await pool.query(sql);
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

