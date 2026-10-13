import { NextRequest, NextResponse } from "next/server";
import { session, branchScope, apiError, ApiError } from "@/lib/api";
import { createServerClient } from "@/lib/supabase";
import { activeTableOrders } from "@/lib/operations";
export async function GET(req: NextRequest) {
  try {
    const auth = await session();
    const branch = branchScope(auth, req.nextUrl.searchParams.get("branchId"));
    const db = createServerClient();
    const { data: tables, error } = await db
      .from("restaurant_tables")
      .select("*")
      .eq("branch_id", branch)
      .order("table_number");
    if (error) throw error;
    const ids = tables.map((t) => t.current_order_id).filter(Boolean);
    const result = ids.length
      ? await db
          .from("orders")
          .select("id,order_number,total_amount,created_at,order_status")
          .eq("branch_id", branch)
          .in("id", ids)
      : { data: [], error: null };
    if (result.error) throw result.error;
    return NextResponse.json({
      tables: tables.map((t) => {
        const orders = activeTableOrders(t, result.data || []);
        return {
          ...t,
          status:
            t.status === "OCCUPIED" && t.current_order_id && !orders.length
              ? "AVAILABLE"
              : t.status,
          orders,
        };
      }),
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(req: NextRequest) {
  try {
    const auth = await session();
    const b = await req.json();
    if (!["AVAILABLE", "CLEANING", "RESERVED"].includes(b.status))
      throw new ApiError("Invalid table status");
    const branch = branchScope(auth, b.branchId);
    const db = createServerClient();
    const { data: table, error } = await db
      .from("restaurant_tables")
      .select("*")
      .eq("id", b.tableId)
      .eq("branch_id", branch)
      .single();
    if (error || !table) throw new ApiError("Table not found", 404);
    if (table.current_order_id) {
      const { data: order, error: e } = await db
        .from("orders")
        .select("order_status")
        .eq("id", table.current_order_id)
        .single();
      if (e) throw e;
      if (!["COMPLETED", "CANCELLED"].includes(order.order_status))
        throw new ApiError("Settle or cancel the active bill first", 409);
    }
    let q = db
      .from("restaurant_tables")
      .update({ status: b.status, current_order_id: null })
      .eq("id", b.tableId)
      .eq("branch_id", branch);
    q = table.current_order_id
      ? q.eq("current_order_id", table.current_order_id)
      : q.is("current_order_id", null);
    const result = await q.select().single();
    if (result.error) throw result.error;
    return NextResponse.json({ table: result.data });
  } catch (e) {
    return apiError(e);
  }
}
