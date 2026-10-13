import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-pos.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

// Client-side Supabase client (singleton)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Server-side Supabase client (uses service role key)
export function createServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Database types
export interface Branch {
  id: string;
  name: string;
  name_ur: string | null;
  address: string | null;
  phone: string | null;
  receipt_footer?: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name_en: string;
  name_ur: string | null;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

export interface MenuItem {
  id: string;
  name_en: string;
  name_ur: string | null;
  category_id: string | null;
  price: number;
  description: string | null;
  image_url: string | null;
  emoji: string;
  is_available: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // joined
  categories?: Category;
}

export interface RestaurantTable {
  id: string;
  branch_id: string;
  table_number: number;
  table_name: string | null;
  capacity: number;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "CLEANING";
  current_order_id: string | null;
  created_at: string;
}

export interface Order {
  staff_id?: string;
  staff_name?: string;
  payment_staff_name?: string;
  cash_amount?: number | null;
  cancellation_reason?: string;
  receipt_branch?: Branch;
  id: string;
  order_number: string;
  branch_id: string;
  order_type: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  table_id: string | null;
  table_number: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  subtotal: number;
  discount: number;
  discount_type: "AMOUNT" | "PERCENT";
  tax: number;
  total_amount: number;
  payment_method: "CASH" | "JAZZCASH" | "EASYPAISA" | "SPLIT" | null;
  payment_status: "UNPAID" | "PAID" | "PARTIAL" | "REFUNDED";
  // Legacy preparation values remain readable for existing orders and offline sync.
  order_status:
    | "PENDING"
    | "PREPARING"
    | "READY"
    | "SERVED"
    | "DELIVERED"
    | "COMPLETED"
    | "CANCELLED";
  notes: string | null;
  receipt_printed: boolean;
  offline_order_id: string | null;
  sale_source: "ONLINE" | "OFFLINE";
  shift_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  // joined
  order_items?: OrderItem[];
  branches?: Branch;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  item_name: string;
  item_name_ur: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  // Retained for compatibility with stored line items.
  status: "PENDING" | "PREPARING" | "READY" | "SERVED";
}

export interface Shift {
  id: string;
  branch_id: string;
  shift_number: string;
  operator_name: string;
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  cash_difference: number | null;
  total_sales: number;
  total_orders: number;
  cash_sales: number;
  digital_sales: number;
  status: "OPEN" | "CLOSED";
  opened_at: string;
  closed_at: string | null;
}

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}
