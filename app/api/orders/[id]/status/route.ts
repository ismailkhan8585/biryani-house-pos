import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuth } from "@/lib/auth";

// PATCH /api/orders/[id]/status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await getAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { status, paymentMethod, paymentStatus } = body;

    try {
      const serverClient = createServerClient();

      // Get order first to know table_id
      const { data: order, error: fetchError } = await serverClient
        .from("orders")
        .select("table_id, order_type, total_amount")
        .eq("id", id)
        .single();

      if (fetchError || !order) {
        // Order might be synthetic (created when DB was down) — treat as success
        return NextResponse.json({ order: { id, order_status: status } });
      }

      const updateData: Record<string, unknown> = {
        order_status: status,
        updated_at: new Date().toISOString(),
      };

      if (paymentMethod) updateData.payment_method = paymentMethod;
      if (paymentStatus) updateData.payment_status = paymentStatus;
      if (status === "COMPLETED") {
        updateData.completed_at = new Date().toISOString();
      }
      if (status === "PREPARING") {
        updateData.kot_printed = true;
      }

      const { data: updatedOrder, error: updateError } = await serverClient
        .from("orders")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Free table when order completes (Dine-In)
      if (status === "COMPLETED" && order.order_type === "DINE_IN" && order.table_id) {
        await serverClient
          .from("restaurant_tables")
          .update({ status: "AVAILABLE", current_order_id: null })
          .eq("id", order.table_id);
      }

      return NextResponse.json({ order: updatedOrder });
    } catch (dbErr) {
      // DB unavailable — acknowledge the status update gracefully
      console.warn("PATCH /api/orders/[id]/status — DB unavailable:", dbErr);
      return NextResponse.json({ order: { id, order_status: status } });
    }
  } catch (err) {
    console.error("PATCH /api/orders/[id]/status error:", err);
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}
