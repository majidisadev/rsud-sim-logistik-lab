import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import categoryRoutes from './routes/categories';
import supplierRoutes from './routes/suppliers';
import itemRoutes from './routes/items';
import transactionRoutes from './routes/transactions';
import stockOpnameRoutes from './routes/stockOpnames';
import reportRoutes from './routes/reports';
import { authenticateToken } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Middleware
// CORS configuration - allow requests from any origin for network access
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // If CORS_ORIGIN is set, use it
    if (process.env.CORS_ORIGIN) {
      const allowedOrigins = process.env.CORS_ORIGIN.split(',');
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
    }
    
    // For development/network access: allow localhost and IP addresses
    if (origin.includes('localhost') || origin.match(/^https?:\/\/(\d{1,3}\.){3}\d{1,3}(:\d+)?$/)) {
      return callback(null, true);
    }
    
    // Allow all origins for network access (can be restricted in production)
    callback(null, true);
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/categories', authenticateToken, categoryRoutes);
app.use('/api/suppliers', authenticateToken, supplierRoutes);
app.use('/api/items', authenticateToken, itemRoutes);
app.use('/api/transactions', authenticateToken, transactionRoutes);
app.use('/api/stock-opnames', authenticateToken, stockOpnameRoutes);
app.use('/api/reports', authenticateToken, reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
  console.log(`Accessible from network at http://YOUR_IP:${PORT}`);
});

