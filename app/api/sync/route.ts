import { NextRequest, NextResponse } from "next/server";
import { session, apiError, ApiError } from "@/lib/api";
import { createOrder } from "@/lib/order-service";
export async function POST(req: NextRequest) {
  try {
    const auth = await session();
    const { orders } = await req.json();
    if (!Array.isArray(orders) || orders.length > 100)
      throw new ApiError("Invalid batch");
    const syncedIds: string[] = [];
    const failures: { id: string; error: string }[] = [];
    for (const o of orders) {
      try {
        if (o.staff_id !== auth.staffId)
          throw new ApiError(
            "Sign in as the original cashier to sync this sale",
            403,
          );
        await createOrder(
          auth,
          {
            branchId: o.branch_id,
            shiftId: o.shift_id,
            offlineOrderId: o.offline_order_id,
            orderNumber: o.order_number,
            orderType: o.order_type,
            tableId: o.table_id,
            customerName: o.customer_name,
            customerPhone: o.customer_phone,
            deliveryAddress: o.delivery_address,
            discount: o.discount,
            discountType: o.discount_type,
            tax: o.tax,
            totalAmount: o.total_amount,
            paymentMethod: o.payment_method,
            cashAmount: o.cash_amount,
            createdAt: o.created_at,
            items: (o._items || []).map((i: Record<string, unknown>) => ({
              menuItemId: i.menu_item_id,
              name: i.item_name,
              nameUr: i.item_name_ur,
              quantity: i.quantity,
              unitPrice: i.unit_price,
              notes: i.notes,
            })),
          },
          true,
        );
        syncedIds.push(o.id);
      } catch (e) {
        failures.push({
          id: o.id,
          error: e instanceof Error ? e.message : "Sync failed",
        });
      }
    }
    return NextResponse.json({ syncedIds, failures });
  } catch (e) {
    return apiError(e);
  }
}
