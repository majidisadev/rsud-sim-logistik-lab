import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import pool from '../config/database';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await pool.query(
      'SELECT id, username, password, role, status FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (user.status !== 'Active') {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    const expiresIn: StringValue = (process.env.JWT_EXPIRES_IN || '7d') as StringValue;
    
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      jwtSecret,
      { expiresIn }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as { id: number; username: string; role: string };

    const result = await pool.query(
      'SELECT id, username, role, status FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (user.status !== 'Active') {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;

