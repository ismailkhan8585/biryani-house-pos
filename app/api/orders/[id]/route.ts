import { NextRequest, NextResponse } from "next/server";
import { session, apiError, ApiError } from "@/lib/api";
import { createServerClient } from "@/lib/supabase";
import { ORDER_SELECT } from "@/lib/order-service";
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await session();
    const { id } = await params;
    let q = createServerClient()
      .from("orders")
      .select(ORDER_SELECT)
      .eq("id", id);
    if (auth.role !== "admin") q = q.eq("branch_id", auth.branchId);
    const { data, error } = await q.single();
    if (error || !data) throw new ApiError("Order not found", 404);
    return NextResponse.json({ order: data });
  } catch (e) {
    return apiError(e);
  }
}
// Arbitrary order/payment updates are deliberately not exposed. Use audited actions.
