import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuth } from "@/lib/auth";

const FALLBACK_TABLES = Array.from({ length: 10 }, (_, i) => ({
  id: `table-${i + 1}`,
  branch_id: "11111111-1111-1111-1111-111111111111",
  table_number: i + 1,
  table_name: `Table ${i + 1}`,
  capacity: i < 2 ? 2 : i < 8 ? 4 : 6,
  status: "AVAILABLE" as const,
  current_order_id: null,
}));

// GET /api/tables
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId") || auth.branchId;

    const serverClient = createServerClient();
    const { data, error } = await serverClient
      .from("restaurant_tables")
      .select("*, orders(order_number, total_amount, created_at, order_status)")
      .eq("branch_id", branchId)
      .order("table_number");

    if (!error && data && data.length > 0) {
      return NextResponse.json({ tables: data });
    }
    return NextResponse.json({ tables: FALLBACK_TABLES });
  } catch {
    return NextResponse.json({ tables: FALLBACK_TABLES });
  }
}

// PATCH /api/tables — update table status
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { tableId, status, currentOrderId } = body;

    const serverClient = createServerClient();
    const { data, error } = await serverClient
      .from("restaurant_tables")
      .update({
        status,
        current_order_id: currentOrderId || null,
      })
      .eq("id", tableId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ table: data });
  } catch {
    return NextResponse.json({ error: "Failed to update table" }, { status: 500 });
  }
}
