import { supabase } from "./supabase";
import { getPendingOrders, markOrderSynced, markOrderFailed } from "./pos-db-local";

let syncInProgress = false;

// Sync all pending offline orders to Supabase
export async function syncPendingOrders(): Promise<{
  synced: number;
  failed: number;
}> {
  if (syncInProgress) return { synced: 0, failed: 0 };
  syncInProgress = true;

  let synced = 0;
  let failed = 0;

  try {
    const pending = await getPendingOrders();

    for (const order of pending) {
      try {
        // Check if already exists in Supabase (by offline_order_id)
        const { data: existing } = await supabase
          .from("orders")
          .select("id")
          .eq("offline_order_id", order.offline_order_id)
          .maybeSingle();

        if (existing) {
          // Already synced (duplicate prevention)
          await markOrderSynced(order.id);
          synced++;
          continue;
        }

        // Insert order
        const { data: newOrder, error: orderError } = await supabase
          .from("orders")
          .insert({
            id: order.id,
            order_number: order.order_number,
            branch_id: order.branch_id,
            order_type: order.order_type,
            table_id: order.table_id,
            table_number: order.table_number,
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            delivery_address: order.delivery_address,
            subtotal: order.subtotal,
            discount: order.discount,
            discount_type: order.discount_type,
            tax: order.tax,
            total_amount: order.total_amount,
            payment_method: order.payment_method,
            payment_status: order.payment_status,
            order_status: order.order_status,
            notes: order.notes,
            offline_order_id: order.offline_order_id,
            sale_source: "OFFLINE",
            shift_id: order.shift_id,
            created_at: order.created_at,
            updated_at: order.updated_at,
            completed_at: order.completed_at,
          })
          .select()
          .single();

        if (orderError || !newOrder) {
          throw new Error(orderError?.message || "Failed to insert order");
        }

        // Insert order items
        if (order._items && order._items.length > 0) {
          const { error: itemsError } = await supabase
            .from("order_items")
            .insert(
              order._items.map((item) => ({
                order_id: newOrder.id,
                menu_item_id: item.menu_item_id,
                item_name: item.item_name,
                item_name_ur: item.item_name_ur,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
                notes: item.notes,
                status: item.status,
              }))
            );

          if (itemsError) {
            throw new Error(itemsError.message);
          }
        }

        await markOrderSynced(order.id);
        synced++;
      } catch (err) {
        console.error("Failed to sync order", order.id, err);
        await markOrderFailed(order.id);
        failed++;
      }
    }
  } finally {
    syncInProgress = false;
  }

  return { synced, failed };
}

// Start auto-sync when online
export function startAutoSync(onSync?: (result: { synced: number; failed: number }) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleOnline = async () => {
    const result = await syncPendingOrders();
    if (result.synced > 0 || result.failed > 0) {
      onSync?.(result);
    }
  };

  window.addEventListener("online", handleOnline);

  // Also sync immediately if already online
  if (navigator.onLine) {
    handleOnline();
  }

  return () => {
    window.removeEventListener("online", handleOnline);
  };
}
