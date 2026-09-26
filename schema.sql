-- ==============================================================================
-- BIRYANI HOUSE RESTAURANT POS SYSTEM — SUPABASE POSTGRESQL SCHEMA
-- ==============================================================================
-- 3 Branches · Master Admin · Realtime KDS · Multi-Channel POS · Offline Sync
-- Run this complete SQL script in your Supabase SQL Editor (supabase.com)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. BRANCHES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  name_ur VARCHAR(100),
  address TEXT,
  phone VARCHAR(50),
  pin VARCHAR(10) NOT NULL DEFAULT '1111',
  color VARCHAR(20) NOT NULL DEFAULT '#F97316',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 2. CATEGORIES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en VARCHAR(100) NOT NULL,
  name_ur VARCHAR(100),
  icon VARCHAR(50) NOT NULL DEFAULT '🍛',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 3. MENU ITEMS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en VARCHAR(150) NOT NULL,
  name_ur VARCHAR(150),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  description TEXT,
  image_url TEXT,
  emoji VARCHAR(20) NOT NULL DEFAULT '🍛',
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 4. RESTAURANT TABLES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  table_number INT NOT NULL,
  table_name VARCHAR(50),
  capacity INT NOT NULL DEFAULT 4,
  status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING'
  current_order_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_branch_table UNIQUE (branch_id, table_number)
);

-- ==============================================================================
-- 5. SHIFTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  shift_number VARCHAR(50) NOT NULL,
  operator_name VARCHAR(100) NOT NULL,
  opening_cash NUMERIC(10, 2) NOT NULL DEFAULT 0,
  closing_cash NUMERIC(10, 2),
  expected_cash NUMERIC(10, 2),
  cash_difference NUMERIC(10, 2),
  total_sales NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_orders INT NOT NULL DEFAULT 0,
  cash_sales NUMERIC(10, 2) NOT NULL DEFAULT 0,
  digital_sales NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'CLOSED'
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- ==============================================================================
-- 6. ORDERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) NOT NULL,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  order_type VARCHAR(20) NOT NULL DEFAULT 'DINE_IN', -- 'DINE_IN', 'TAKEAWAY', 'DELIVERY'
  table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  table_number INT,
  customer_name VARCHAR(100),
  customer_phone VARCHAR(50),
  delivery_address TEXT,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount_type VARCHAR(20) NOT NULL DEFAULT 'AMOUNT', -- 'AMOUNT', 'PERCENT'
  tax NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(20), -- 'CASH', 'JAZZCASH', 'EASYPAISA', 'SPLIT'
  payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID', -- 'UNPAID', 'PAID', 'PARTIAL', 'REFUNDED'
  order_status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PREPARING', 'READY', 'SERVED', 'DELIVERED', 'COMPLETED', 'CANCELLED'
  notes TEXT,
  kot_printed BOOLEAN NOT NULL DEFAULT false,
  receipt_printed BOOLEAN NOT NULL DEFAULT false,
  offline_order_id VARCHAR(100),
  sale_source VARCHAR(20) NOT NULL DEFAULT 'ONLINE', -- 'ONLINE', 'OFFLINE'
  shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ==============================================================================
-- 7. ORDER ITEMS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name VARCHAR(150) NOT NULL,
  item_name_ur VARCHAR(150),
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' -- 'PENDING', 'PREPARING', 'READY', 'SERVED'
);

-- ==============================================================================
-- 8. SETTINGS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 9. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_orders_branch_created ON orders (branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (order_status);
CREATE INDEX IF NOT EXISTS idx_orders_offline ON orders (offline_order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_tables_branch ON restaurant_tables (branch_id, table_number);
CREATE INDEX IF NOT EXISTS idx_menu_items_cat ON menu_items (category_id, is_available);
CREATE INDEX IF NOT EXISTS idx_shifts_branch ON shifts (branch_id, status);

-- ==============================================================================
-- 10. REALTIME CONFIGURATION
-- ==============================================================================
-- Add tables to supabase_realtime publication for live KDS & table updates
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE restaurant_tables;

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow public read/write via anon and authenticated keys for POS operation
CREATE POLICY "Public full access on branches" ON branches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access on categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access on menu_items" ON menu_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access on restaurant_tables" ON restaurant_tables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access on shifts" ON shifts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access on orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access on order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access on settings" ON settings FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 12. SEED INITIAL DATA
-- ==============================================================================

-- 3 Branches
INSERT INTO branches (id, name, name_ur, address, phone, pin, color) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Branch 1 — Main', 'برانچ ۱ — مین', 'Shop #1-3, Food Street', '0300-1111111', '1111', '#F97316'),
  ('22222222-2222-2222-2222-222222222222', 'Branch 2 — City', 'برانچ ۲ — سٹی', 'Commercial Market, Block B', '0300-2222222', '2222', '#EF4444'),
  ('33333333-3333-3333-3333-333333333333', 'Branch 3 — North', 'برانچ ۳ — نارتھ', 'Sector F-7, North Avenue', '0300-3333333', '3333', '#8B5CF6')
ON CONFLICT (id) DO NOTHING;

-- 10 Tables per Branch (30 Tables total)
DO $$
DECLARE
  b_id UUID;
  t_num INT;
BEGIN
  FOR b_id IN SELECT id FROM branches LOOP
    FOR t_num IN 1..10 LOOP
      INSERT INTO restaurant_tables (branch_id, table_number, table_name, capacity, status)
      VALUES (b_id, t_num, 'Table ' || t_num, CASE WHEN t_num <= 2 THEN 2 WHEN t_num <= 8 THEN 4 ELSE 6 END, 'AVAILABLE')
      ON CONFLICT (branch_id, table_number) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Categories
INSERT INTO categories (id, name_en, name_ur, icon, sort_order) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Biryani & Pulao', 'بریانی اور پلاؤ', '🍛', 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Karahi & Handi', 'کڑاہی اور ہانڈی', '🍗', 2),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'BBQ & Kebabs', 'بار بی کیو اور کباب', '🍢', 3),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Naan & Roti', 'نان اور روٹی', '🥖', 4),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Sides & Raita', 'رائتہ اور سلاد', '🥗', 5),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Beverages & Desserts', 'مشروبات اور میٹھا', '🥤', 6)
ON CONFLICT (id) DO NOTHING;

-- Authentic Pakistani Menu Items
INSERT INTO menu_items (name_en, name_ur, category_id, price, emoji, is_available, is_featured, sort_order, description) VALUES
  ('Chicken Biryani Single', 'چکن بریانی سنگل', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 380.00, '🍗', true, true, 1, 'Fragrant basmati rice cooked with succulent chicken piece, potato and secret spices'),
  ('Chicken Biryani Double', 'چکن بریانی ڈبل', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 650.00, '🍗', true, true, 2, 'Double chicken piece with extra spiced aromatic basmati rice'),
  ('Beef Biryani Single', 'بیف بریانی سنگل', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 480.00, '🥩', true, true, 3, 'Tender slow-cooked beef with spiced rice and potatoes'),
  ('Beef Biryani Double', 'بیف بریانی ڈبل', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 850.00, '🥩', true, false, 4, 'Large portion of Karachi-style beef biryani'),
  ('Special Mutton Biryani', 'اسپیشل مٹن بریانی', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1150.00, '🍖', true, true, 5, 'Prime cut mutton simmered in saffron-infused long grain basmati rice'),
  ('Chicken Degi Pulao', 'چکن دیگی پلاؤ', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 420.00, '🍚', true, false, 6, 'Mildly spiced traditional yakhni pulao with tender chicken'),
  ('Chicken Karahi (Half)', 'چکن کڑاہی (نصف)', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 950.00, '🥘', true, true, 7, 'Freshly wok-fried chicken in fresh tomatoes, ginger and green chilies'),
  ('Chicken Karahi (Full)', 'چکن کڑاہی (مکمل)', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1750.00, '🥘', true, false, 8, 'Full 1kg chicken karahi with rich butter and ginger garnishing'),
  ('Chicken Tikka Boti', 'چکن تکہ بوٹی', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 320.00, '🍢', true, true, 9, 'Boneless chicken cubes grilled over hot charcoal coals'),
  ('Beef Seekh Kebab (4 Pcs)', 'بیف سیخ کباب (۴ عدد)', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 450.00, '🍢', true, true, 10, 'Minced spiced beef skewered and char-grilled to perfection'),
  ('Roghani Naan', 'روغنی نان', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 70.00, '🥖', true, false, 11, 'Soft tandoori bread topped with sesame seeds and butter'),
  ('Garlic Butter Naan', 'گارلک بٹر نان', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 90.00, '🥖', true, false, 12, 'Tandoori naan brushed with garlic butter and fresh coriander'),
  ('Zeera Raita', 'زیرہ رائتہ', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 60.00, '🥣', true, false, 13, 'Chilled fresh yogurt blended with roasted cumin seeds'),
  ('Fresh Kachumber Salad', 'کچومر سلاد', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 70.00, '🥗', true, false, 14, 'Diced cucumber, onion, tomato with lemon dressing'),
  ('Soft Drink (500ml)', 'کولڈ ڈرنک (۵۰۰ ملی لیٹر)', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 120.00, '🥤', true, false, 15, 'Chilled Pepsi, 7Up, or Mirinda'),
  ('Shahi Kheer Cup', 'شاہی کھیر کپ', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 150.00, '🍮', true, true, 16, 'Slow-simmered rice pudding with saffron, almonds, and pistachios')
ON CONFLICT DO NOTHING;

-- Initial Settings
INSERT INTO settings (key, value) VALUES
  ('restaurant_name', 'Biryani House'),
  ('restaurant_phone', '0300-1234567'),
  ('restaurant_address', 'Main Food Street, Karachi / Lahore'),
  ('receipt_footer', 'Thank you for dining at Biryani House! For catering call 0300-1234567'),
  ('jazzcash_number', '0300-1234567'),
  ('jazzcash_title', 'Biryani House Official'),
  ('easypaisa_number', '0300-7654321'),
  ('easypaisa_title', 'Biryani House Official'),
  ('tax_enabled', 'false'),
  ('tax_rate', '0')
ON CONFLICT (key) DO NOTHING;
