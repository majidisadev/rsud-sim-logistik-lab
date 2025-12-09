-- Create Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'PJ Gudang', 'User')),
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Categories table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  cover_image TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  cover_image TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Items table
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  unit VARCHAR(50),
  temperature VARCHAR(50),
  min_stock INTEGER NOT NULL DEFAULT 1 CHECK (min_stock >= 0),
  image TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Item Suppliers junction table
CREATE TABLE IF NOT EXISTS item_suppliers (
  item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, supplier_id)
);

-- Create Lots table
CREATE TABLE IF NOT EXISTS lots (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  lot_number VARCHAR(100) NOT NULL,
  expiration_date DATE,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(item_id, lot_number)
);

-- Create Stock Opname table
CREATE TABLE IF NOT EXISTS stock_opnames (
  id SERIAL PRIMARY KEY,
  opname_date DATE NOT NULL,
  officer_id INTEGER NOT NULL REFERENCES users(id),
  validated_by INTEGER REFERENCES users(id),
  validation_status VARCHAR(20) DEFAULT 'Belum' CHECK (validation_status IN ('Belum', 'Disetujui', 'Tidak Disetujui')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Stock Opname Items table
CREATE TABLE IF NOT EXISTS stock_opname_items (
  id SERIAL PRIMARY KEY,
  stock_opname_id INTEGER NOT NULL REFERENCES stock_opnames(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  recorded_stock INTEGER NOT NULL,
  opname_stock INTEGER NOT NULL,
  expiration_match VARCHAR(20) NOT NULL CHECK (expiration_match IN ('Sesuai', 'Tidak sesuai')),
  recorded_expiration DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Transactions table (for both masuk and keluar)
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  type VARCHAR(10) NOT NULL CHECK (type IN ('Masuk', 'Keluar')),
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  lot_id INTEGER NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  user_id INTEGER NOT NULL REFERENCES users(id),
  notes VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_lots_item ON lots(item_id);
CREATE INDEX IF NOT EXISTS idx_lots_expiration ON lots(expiration_date);
CREATE INDEX IF NOT EXISTS idx_transactions_item ON transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_opname_items_opname ON stock_opname_items(stock_opname_id);
CREATE INDEX IF NOT EXISTS idx_stock_opname_items_item ON stock_opname_items(item_id);

