import { NextRequest, NextResponse } from "next/server";
import { session, branchScope, apiError, ApiError } from "@/lib/api";
import { createServerClient } from "@/lib/supabase";
import { createOrder, ORDER_SELECT } from "@/lib/order-service";
import { dayBounds } from "@/lib/operations";
export async function GET(req: NextRequest) {
  try {
    const auth = await session();
    const p = req.nextUrl.searchParams;
    const branch = branchScope(auth, p.get("branchId"), true);
    const page = Math.max(0, Number(p.get("page") || 0));
    if (!Number.isInteger(page)) throw new ApiError("Invalid page");
    let q = createServerClient()
      .from("orders")
      .select(ORDER_SELECT, { count: "exact" })
      .order("created_at", { ascending: false })
      .order("id")
      .range(page * 50, page * 50 + 49);
    if (branch) q = q.eq("branch_id", branch);
    const search = (p.get("search") || "")
      .replace(/[^\p{L}\p{N} -]/gu, "")
      .slice(0, 100)
      .trim();
    if (search)
      q = q.or(
        `order_number.ilike.%${search}%,customer_name.ilike.%${search}%`,
      );
    if (p.get("dateFrom"))
      q = q.gte("created_at", dayBounds(p.get("dateFrom")!)[0]);
    if (p.get("dateTo"))
      q = q.lte("created_at", dayBounds(p.get("dateTo")!)[1]);
    if (p.get("paymentStatus"))
      q = q.eq("payment_status", p.get("paymentStatus"));
    if (p.get("type")) q = q.eq("order_type", p.get("type"));
    if (p.get("status") === "PENDING")
      q = q.not("order_status", "in", "(COMPLETED,CANCELLED)");
    else if (p.get("status")) q = q.eq("order_status", p.get("status"));
    if (p.get("tableId")) q = q.eq("table_id", p.get("tableId"));
    const { data, error, count } = await q;
    if (error) throw error;
    return NextResponse.json({ orders: data, count });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    return NextResponse.json(
      { order: await createOrder(await session(), await req.json()) },
      { status: 201 },
    );
  } catch (e) {
    return apiError(e);
  }
}
