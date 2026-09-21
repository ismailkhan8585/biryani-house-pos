-- ============================================================
-- BIRYANI HOUSE POS — Supabase Database Schema
-- ============================================================
-- Run this entire file in Supabase SQL Editor
-- Project: https://supabase.com > SQL Editor > New Query > Paste > Run
-- ============================================================

-- BRANCHES TABLE
CREATE TABLE IF NOT EXISTS branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ur TEXT,
  address TEXT,
  phone TEXT,
  pin TEXT NOT NULL DEFAULT '1234',
  color TEXT DEFAULT '#F97316',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert 3 biryani branches
INSERT INTO branches (name, name_ur, address, phone, pin, color) VALUES
  ('Branch 1 — Main',  'شاخ 1 — مین',  'Main Branch Address,  City', '0300-0000000', '1111', '#F97316'),
  ('Branch 2 — City',  'شاخ 2 — شہر',  'City Branch Address,  City', '0300-0000000', '2222', '#EF4444'),
  ('Branch 3 — North', 'شاخ 3 — نارتھ', 'North Branch Address, City', '0300-0000000', '3333', '#8B5CF6');

-- CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ur TEXT,
  icon TEXT DEFAULT '🍽️',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

INSERT INTO categories (name_en, name_ur, icon, sort_order) VALUES
  ('Biryani',       'بریانی',   '🍛', 1),
  ('Karahi',        'کڑاہی',    '🥘', 2),
  ('Rice Dishes',   'چاول',    '🍚', 3),
  ('Bread',         'روٹی',    '🫓', 4),
  ('Drinks',        'مشروبات', '🥤', 5),
  ('Raita & Salad', 'رائتہ',   '🥗', 6),
  ('Extras',        'اضافی',   '➕', 7);

-- MENU ITEMS TABLE
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ur TEXT,
  category_id UUID REFERENCES categories(id),
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  image_url TEXT,
  emoji TEXT DEFAULT '🍛',
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Biryani items
INSERT INTO menu_items (name_en, name_ur, category_id, price, emoji, is_featured)
SELECT 'Chicken Biryani (Full)', 'چکن بریانی (فل)', id, 850, '🍛', true FROM categories WHERE name_en = 'Biryani';

INSERT INTO menu_items (name_en, name_ur, category_id, price, emoji)
SELECT 'Chicken Biryani (Half)', 'چکن بریانی (ہاف)', id, 450, '🍛' FROM categories WHERE name_en = 'Biryani';

INSERT INTO menu_items (name_en, name_ur, category_id, price, emoji, is_featured)
SELECT 'Mutton Biryani (Full)', 'مٹن بریانی (فل)', id, 1200, '🍛', true FROM categories WHERE name_en = 'Biryani';

INSERT INTO menu_items (name_en, name_ur, category_id, price, emoji)
SELECT 'Mutton Biryani (Half)', 'مٹن بریانی (ہاف)', id, 650, '🍛' FROM categories WHERE name_en = 'Biryani';

INSERT INTO menu_items (name_en, name_ur, category_id, price, emoji)
SELECT 'Beef Biryani (Full)', 'بیف بریانی (فل)', id, 950, '🍛' FROM categories WHERE name_en = 'Biryani';

INSERT INTO menu_items (name_en, name_ur, category_id, price, emoji)
SELECT 'Special Biryani Platter', 'سپیشل بریانی پلیٹر', id, 1500, '🍛' FROM categories WHERE name_en = 'Biryani';

-- Karahi items
INSERT INTO menu_items (name_en, name_ur, category_id, price, emoji, is_featured)
SELECT 'Chicken Karahi (Full)', 'چکن کڑاہی (فل)', id, 1400, '🥘', true FROM categories WHERE name_en = 'Karahi';

INSERT INTO menu_items (name_en, name_ur, category_id, price, emoji)
SELECT 'Chicken Karahi (Half)', 'چکن کڑاہی (ہاف)', id, 750, '🥘' FROM categories WHERE name_en = 'Karahi';

INSERT INTO menu_items (name_en, name_ur, category_id, price, emoji)
SELECT 'Mutton Karahi (Full)', 'مٹن کڑاہی (فل)', id, 2000, '🥘' FROM categories WHERE name_en = 'Karahi';

INSERT INTO menu_items (name_en, name_ur, category_id, price, emoji)
SELECT 'White Karahi', 'سفید کڑاہی', id, 1500, '🥘' FROM categories WHERE name_en = 'Karahi';

-- Rice / Bread / Drinks / Sides
INSERT INTO menu_items (name_en, name_ur, category_id, price, emoji)
SELECT 'Plain Rice', 'سادہ چاول', id, 150, '🍚' FROM categories WHERE name_en = 'Rice Dishes';

INSERT INTO menu_items (name_en, name_ur, category_id, price, emoji)
SELECT 'Roghni Naan', 'روغنی نان', id, 50, '🫓' FROM categories WHERE name_en = 'Bread';

INSERT INTO menu_items (name_en, name_ur, category_id, price, emoji)
SELECT 'Tandoori Roti', 'تندوری روٹی', id, 30, '🫓' FROM categories WHERE name_en = 'Bread';

INSERT INTO menu_items (name_en, name_ur, category_id, price, emoji)
SELECT 'Soft Drink (Bottle)', 'سافٹ ڈرنک', id, 120, '🥤' FROM categories WHERE name_en = 'Drinks';

INSERT INTO menu_items (name_en, name_ur, category_id, price, emoji)
SELECT 'Lassi (Glass)', 'لسی (گلاس)', id, 100, '🥤' FROM categories WHERE name_en = 'Drinks';

INSERT INTO menu_items (name_en, name_ur, category_id, price, emoji)
SELECT 'Water (Bottle)', 'پانی (بوتل)', id, 60, '🥤' FROM categories WHERE name_en = 'Drinks';

INSERT INTO menu_items (name_en, name_ur, category_id, price, emoji)
SELECT 'Raita', 'رائتہ', id, 80, '🥗' FROM categories WHERE name_en = 'Raita & Salad';

INSERT INTO menu_items (name_en, name_ur, category_id, price, emoji)
SELECT 'Kachumber Salad', 'کچمبر سلاد', id, 80, '🥗' FROM categories WHERE name_en = 'Raita & Salad';

INSERT INTO menu_items (name_en, name_ur, category_id, price, emoji)
SELECT 'Extra Gravy', 'اضافی سالن', id, 50, '➕' FROM categories WHERE name_en = 'Extras';

INSERT INTO menu_items (name_en, name_ur, category_id, price, emoji)
SELECT 'Extra Naan', 'اضافی نان', id, 40, '➕' FROM categories WHERE name_en = 'Extras';

-- RESTAURANT TABLES (dine-in seating)
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES branches(id),
  table_number INTEGER NOT NULL,
  table_name TEXT,
  capacity INTEGER DEFAULT 4,
  status TEXT DEFAULT 'AVAILABLE',
  -- AVAILABLE | OCCUPIED | RESERVED | CLEANING
  current_order_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, table_number)
);

-- Insert 10 tables for each branch
INSERT INTO restaurant_tables (branch_id, table_number, table_name, capacity)
SELECT
  b.id,
  t.num,
  'Table ' || t.num,
  CASE WHEN t.num <= 5 THEN 4 ELSE 6 END
FROM branches b
CROSS JOIN generate_series(1, 10) AS t(num);

-- ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  branch_id UUID REFERENCES branches(id) NOT NULL,
  order_type TEXT NOT NULL,
  -- DINE_IN | TAKEAWAY | DELIVERY
  table_id UUID REFERENCES restaurant_tables(id),
  table_number INTEGER,
  customer_name TEXT,
  customer_phone TEXT,
  delivery_address TEXT,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  discount_type TEXT DEFAULT 'AMOUNT',
  -- AMOUNT | PERCENT
  tax DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  -- CASH | JAZZCASH | EASYPAISA | SPLIT
  payment_status TEXT DEFAULT 'UNPAID',
  -- UNPAID | PAID | PARTIAL | REFUNDED
  order_status TEXT DEFAULT 'PENDING',
  -- PENDING | PREPARING | READY | SERVED | DELIVERED | COMPLETED | CANCELLED
  notes TEXT,
  kot_printed BOOLEAN DEFAULT false,
  receipt_printed BOOLEAN DEFAULT false,
  offline_order_id TEXT UNIQUE,
  sale_source TEXT DEFAULT 'ONLINE',
  -- ONLINE | OFFLINE
  shift_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  item_name TEXT NOT NULL,
  item_name_ur TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'PENDING'
  -- PENDING | PREPARING | READY | SERVED
);

-- SHIFTS TABLE
CREATE TABLE IF NOT EXISTS shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES branches(id),
  shift_number TEXT UNIQUE NOT NULL,
  operator_name TEXT DEFAULT 'Cashier',
  opening_cash DECIMAL(10,2) DEFAULT 0,
  closing_cash DECIMAL(10,2),
  expected_cash DECIMAL(10,2),
  cash_difference DECIMAL(10,2),
  total_sales DECIMAL(12,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  cash_sales DECIMAL(12,2) DEFAULT 0,
  digital_sales DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'OPEN',
  -- OPEN | CLOSED
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- SETTINGS TABLE
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES
  ('restaurant_name',        'Biryani House'),
  ('restaurant_name_ur',     'بریانی ہاؤس'),
  ('owner_name',             'Owner Name'),
  ('phone',                  '0300-0000000'),
  ('address',                'Main Address, City'),
  ('receipt_footer',         'Shukriya! شکریہ — Thank you for dining with us.'),
  ('tax_enabled',            'false'),
  ('tax_rate',               '0'),
  ('currency',               'Rs.'),
  ('jazzcash_number',        '0300-0000000'),
  ('easypaisa_number',       '0300-0000000'),
  ('kot_enabled',            'true'),
  ('table_count_per_branch', '10')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_branch  ON orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_date    ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_type    ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_tables_branch  ON restaurant_tables(branch_id);
CREATE INDEX IF NOT EXISTS idx_tables_status  ON restaurant_tables(status);
CREATE INDEX IF NOT EXISTS idx_shifts_branch  ON shifts(branch_id);

-- ============================================================
-- COMPLETE ORDER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION complete_order(p_order_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE orders
  SET order_status   = 'COMPLETED',
      payment_status = 'PAID',
      completed_at   = NOW(),
      updated_at     = NOW()
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Allow anon key to read/write — adjust per your security needs
-- ============================================================
ALTER TABLE branches           ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings           ENABLE ROW LEVEL SECURITY;

-- Allow all for anon (POS app uses anon key with JWT auth handled server-side)
CREATE POLICY "Allow all branches"    ON branches           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all categories"  ON categories         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all menu_items"  ON menu_items         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all tables"      ON restaurant_tables  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all orders"      ON orders             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all order_items" ON order_items        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all shifts"      ON shifts             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all settings"    ON settings           FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- REALTIME (enable for kitchen display live updates)
-- Run in Supabase Dashboard > Database > Replication
-- or uncomment below:
-- ============================================================
-- ALTER PUBLICATION supabase_realtime ADD TABLE orders;
-- ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
-- ALTER PUBLICATION supabase_realtime ADD TABLE restaurant_tables;
