import { createServerClient } from "./supabase";
import { ApiError, branchScope } from "./api";
import type { AuthPayload } from "./auth";
import {
  generateOrderNumber,
  configuredTaxRate,
  calculateTotal,
} from "./utils";
export const ORDER_SELECT =
  "*,order_items(*),branches(id,name,address,phone,receipt_footer,color)";
export async function createOrder(
  auth: AuthPayload,
  b: Record<string, unknown>,
  offline = false,
) {
  const db = createServerClient();
  const branch = branchScope(auth, String(b.branchId || auth.branchId));
  if (!b.shiftId || !b.offlineOrderId)
    throw new ApiError("Open shift and order identifier required");
  if (b.orderNumber && !/^[A-Za-z0-9-]{1,50}$/.test(String(b.orderNumber)))
    throw new ApiError("Invalid order number");
  const { data: existing, error: existingError } = await db
    .from("orders")
    .select(ORDER_SELECT)
    .eq("offline_order_id", String(b.offlineOrderId))
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    if (existing.branch_id !== branch || existing.staff_id !== auth.staffId)
      throw new ApiError("Order access denied", 403);
    return existing;
  }
  const { data: shift, error: shiftError } = await db
    .from("shifts")
    .select("*")
    .eq("id", b.shiftId)
    .eq("branch_id", branch)
    .eq("staff_id", auth.staffId)
    .eq("status", "OPEN")
    .single();
  if (shiftError || !shift)
    throw new ApiError(
      "A valid open shift for this cashier and branch is required",
      409,
    );
  if (!["DINE_IN", "TAKEAWAY", "DELIVERY"].includes(String(b.orderType)))
    throw new ApiError("Invalid order type");
  if (!Array.isArray(b.items) || !b.items.length)
    throw new ApiError("Add items first");
  const items = b.items.map((i: Record<string, unknown>) => {
    const price = Number(i.unitPrice),
      qty = Number(i.quantity);
    if (
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(qty) ||
      qty < 1 ||
      qty > 10000
    )
      throw new ApiError("Invalid price or quantity");
    return {
      menu_item_id: i.menuItemId,
      item_name: i.name,
      item_name_ur: i.nameUr || null,
      unit_price: price,
      quantity: qty,
      total_price: Math.round(price * qty * 100) / 100,
      notes: i.notes || null,
    };
  });
  // Check catalog prices for live sales; offline sales retain their recorded price snapshot.
  if (!offline) {
    const { data: menu, error } = await db
      .from("menu_items")
      .select("id,price,is_available")
      .in(
        "id",
        items.map((i) => i.menu_item_id),
      );
    if (error) throw error;
    for (const item of items) {
      const found = menu?.find((m) => m.id === item.menu_item_id);
      if (!found?.is_available || Number(found.price) !== item.unit_price)
        throw new ApiError(
          "Menu price or availability changed. Sync the menu and review the order.",
          409,
        );
    }
  }
  const subtotal = items.reduce((s, i) => s + i.total_price, 0),
    discount = Number(b.discount || 0),
    tax = Number(b.tax || 0);
  if (
    !["AMOUNT", "PERCENT"].includes(String(b.discountType)) ||
    !Number.isFinite(discount) ||
    discount < 0 ||
    !Number.isFinite(tax) ||
    tax < 0
  )
    throw new ApiError("Invalid discount or tax");
  const reduction =
    b.discountType === "PERCENT"
      ? Math.round((subtotal * discount) / 100)
      : discount;
  if (!offline) {
    const { data: settingsRows, error: settingsError } = await db
      .from("settings")
      .select("key,value")
      .in("key", ["tax_enabled", "tax_rate"]);
    if (settingsError) throw settingsError;
    const settings = Object.fromEntries(
      (settingsRows || []).map((row) => [row.key, row.value]),
    );
    const expectedTax = calculateTotal(
      subtotal,
      discount,
      b.discountType as "AMOUNT" | "PERCENT",
      configuredTaxRate(settings),
    ).taxAmount;
    if (Math.abs(tax - expectedTax) > 0.01)
      throw new ApiError(
        "Tax settings changed. Sync billing settings and review the payment total.",
        409,
      );
  }
  const total = Math.round((subtotal - reduction + tax) * 100) / 100;
  if (
    !Number.isFinite(total) ||
    !Number.isFinite(Number(b.totalAmount)) ||
    total < 0 ||
    Math.abs(total - Number(b.totalAmount)) > 0.01
  )
    throw new ApiError("Order total does not match its items");
  const method = b.paymentMethod || null;
  if (
    method &&
    !["CASH", "JAZZCASH", "EASYPAISA", "SPLIT"].includes(String(method))
  )
    throw new ApiError("Invalid payment method");
  const cash =
    method === "CASH" ? total : method === "SPLIT" ? Number(b.cashAmount) : 0;
  if (!Number.isFinite(cash) || cash < 0 || cash > total)
    throw new ApiError("Invalid split cash amount");
  const { data: branchData, error: branchError } = await db
    .from("branches")
    .select("id,name,address,phone,receipt_footer")
    .eq("id", branch)
    .eq("is_active", true)
    .single();
  if (branchError) throw branchError;
  let tableNumber = null;
  const tableId = b.orderType === "DINE_IN" ? b.tableId : null;
  if (b.orderType === "DINE_IN" && !tableId)
    throw new ApiError("Select a table");
  if (tableId) {
    const { data: table, error } = await db
      .from("restaurant_tables")
      .select("table_number")
      .eq("id", tableId)
      .eq("branch_id", branch)
      .single();
    if (error || !table)
      throw new ApiError("Table belongs to another branch", 403);
    tableNumber = table.table_number;
  }
  if (b.orderType === "DELIVERY" && (!b.customerPhone || !b.deliveryAddress))
    throw new ApiError("Delivery phone and address required");
  const created = offline ? new Date(String(b.createdAt)) : new Date();
  if (
    Number.isNaN(created.getTime()) ||
    created < new Date(shift.opened_at) ||
    created.getTime() > Date.now() + 60000
  )
    throw new ApiError("Order time is outside this shift");
  const { data: id, error } = await db.rpc("pos_create_order", {
    p_staff: auth.staffId,
    p_items: items,
    p_order: {
      order_number: b.orderNumber || generateOrderNumber(),
      branch_id: branch,
      shift_id: b.shiftId,
      order_type: b.orderType,
      table_id: tableId || null,
      table_number: tableNumber,
      customer_name: b.customerName || null,
      customer_phone: b.customerPhone || null,
      delivery_address: b.deliveryAddress || null,
      subtotal,
      discount,
      discount_type: b.discountType,
      tax,
      total_amount: total,
      payment_method: method,
      payment_status: method ? "PAID" : "UNPAID",
      order_status: method ? "COMPLETED" : "PENDING",
      cash_amount: cash,
      offline_order_id: b.offlineOrderId,
      sale_source: offline ? "OFFLINE" : "ONLINE",
      created_at: created.toISOString(),
      receipt_branch: branchData,
    },
  });
  if (error) throw error;
  const { data: order, error: readError } = await db
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .single();
  if (readError) throw readError;
  return order;
}
