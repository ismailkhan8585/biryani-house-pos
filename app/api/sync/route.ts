import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuth } from "@/lib/auth";

// POST /api/sync — sync offline orders
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { orders } = body;

    if (!orders || !Array.isArray(orders)) {
      return NextResponse.json({ error: "Orders array required" }, { status: 400 });
    }

    const serverClient = createServerClient();
    const results = { synced: 0, failed: 0, skipped: 0 };

    for (const order of orders) {
      try {
        // Check if already synced
        const { data: existing } = await serverClient
          .from("orders")
          .select("id")
          .eq("offline_order_id", order.offline_order_id)
          .maybeSingle();

        if (existing) {
          results.skipped++;
          continue;
        }

        const { data: newOrder, error: orderError } = await serverClient
          .from("orders")
          .insert({ ...order, sale_source: "OFFLINE" })
          .select()
          .single();

        if (orderError) throw orderError;

        if (order._items && order._items.length > 0) {
          await serverClient.from("order_items").insert(
            order._items.map((item: Record<string, unknown>) => ({
              ...item,
              order_id: newOrder.id,
            }))
          );
        }

        results.synced++;
      } catch {
        results.failed++;
      }
    }

    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
