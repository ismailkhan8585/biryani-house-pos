import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuth } from "@/lib/auth";
import { generateOrderNumber } from "@/lib/utils";

// GET /api/orders — list orders for branch
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const date = searchParams.get("date");
    const limit = parseInt(searchParams.get("limit") || "50");
    const branchId = searchParams.get("branchId") || auth.branchId;

    const serverClient = createServerClient();
    let query = serverClient
      .from("orders")
      .select("*, order_items(*), branches(name, color)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (auth.role !== "admin") {
      query = query.eq("branch_id", auth.branchId);
    } else if (branchId && branchId !== "all") {
      query = query.eq("branch_id", branchId);
    }

    if (status) query = query.eq("order_status", status);
    if (type) query = query.eq("order_type", type);
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query = query.gte("created_at", start.toISOString()).lte("created_at", end.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ orders: data });
  } catch (err) {
    console.error("GET /api/orders error:", err);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

// POST /api/orders — create a new order
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { items, orderType, tableId, tableNumber, customerName, customerPhone,
      deliveryAddress, subtotal, discount, discountType, tax, totalAmount,
      paymentMethod, notes, offlineOrderId, shiftId } = body;

    const orderNumber = generateOrderNumber();
    const now = new Date().toISOString();

    // Synthetic order used both for fallback and as the base shape
    const syntheticOrder = {
      id: crypto.randomUUID(),
      order_number: orderNumber,
      branch_id: auth.branchId,
      order_type: orderType,
      table_id: tableId || null,
      table_number: tableNumber || null,
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      delivery_address: deliveryAddress || null,
      subtotal,
      discount: discount || 0,
      discount_type: discountType || "AMOUNT",
      tax: tax || 0,
      total_amount: totalAmount,
      payment_method: paymentMethod || null,
      payment_status: paymentMethod ? "PAID" : "UNPAID",
      order_status: "PENDING",
      notes: notes || null,
      offline_order_id: offlineOrderId || null,
      shift_id: shiftId || null,
      sale_source: "ONLINE",
      created_at: now,
      updated_at: now,
      completed_at: null,
      kot_printed: false,
      receipt_printed: false,
      order_items: (items || []).map((item: { menuItemId: string; name: string; nameUr: string | null; unitPrice: number; quantity: number; notes: string }) => ({
        id: crypto.randomUUID(),
        order_id: "",
        menu_item_id: item.menuItemId,
        item_name: item.name,
        item_name_ur: item.nameUr,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.unitPrice * item.quantity,
        notes: item.notes || null,
        status: "PENDING",
      })),
    };

    try {
      const serverClient = createServerClient();

      const { data: order, error: orderError } = await serverClient
        .from("orders")
        .insert({
          order_number: orderNumber,
          branch_id: auth.branchId,
          order_type: orderType,
          table_id: tableId || null,
          table_number: tableNumber || null,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          delivery_address: deliveryAddress || null,
          subtotal,
          discount: discount || 0,
          discount_type: discountType || "AMOUNT",
          tax: tax || 0,
          total_amount: totalAmount,
          payment_method: paymentMethod || null,
          payment_status: paymentMethod ? "PAID" : "UNPAID",
          order_status: "PENDING",
          notes: notes || null,
          offline_order_id: offlineOrderId || null,
          shift_id: shiftId || null,
          sale_source: "ONLINE",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items
      if (items && items.length > 0) {
        const { error: itemsError } = await serverClient.from("order_items").insert(
          items.map((item: { menuItemId: string; name: string; nameUr: string | null; unitPrice: number; quantity: number; notes: string }) => ({
            order_id: order.id,
            menu_item_id: item.menuItemId,
            item_name: item.name,
            item_name_ur: item.nameUr,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.unitPrice * item.quantity,
            notes: item.notes || null,
            status: "PENDING",
          }))
        );
        if (itemsError) throw itemsError;
      }

      // Mark table as OCCUPIED if Dine-In
      if (orderType === "DINE_IN" && tableId) {
        await serverClient
          .from("restaurant_tables")
          .update({ status: "OCCUPIED", current_order_id: order.id })
          .eq("id", tableId);
      }

      return NextResponse.json({ order }, { status: 201 });
    } catch (dbErr) {
      // DB unavailable — return a synthetic order so the client can proceed
      console.warn("POST /api/orders — DB unavailable, returning synthetic order:", dbErr);
      return NextResponse.json({ order: syntheticOrder, offline: true }, { status: 201 });
    }
  } catch (err) {
    console.error("POST /api/orders error:", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
