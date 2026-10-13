export const BUSINESS_ZONE = "Asia/Karachi";
export function businessDate(value: Date | string = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
export function dayBounds(date: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    throw new Error("Invalid date");
  return [date + "T00:00:00.000+05:00", date + "T23:59:59.999+05:00"];
}
export function orderState(order: { order_status: string }) {
  return order.order_status === "CANCELLED"
    ? "CANCELLED"
    : order.order_status === "COMPLETED"
      ? "COMPLETED"
      : "PENDING";
}
export function summarizeOrders(
  orders: {
    order_status: string;
    payment_status: string;
    total_amount: number;
    payment_method?: string | null;
    cash_amount?: number | null;
  }[],
) {
  const paid = orders.filter(
    (o) => o.payment_status === "PAID" && o.order_status !== "CANCELLED",
  );
  const totalRevenue = paid.reduce((s, o) => s + Number(o.total_amount), 0);
  const cashSales = paid.reduce(
    (s, o) =>
      s +
      Number(
        o.cash_amount ?? (o.payment_method === "CASH" ? o.total_amount : 0),
      ),
    0,
  );
  const unallocatedSplitSales = paid
    .filter((o) => o.payment_method === "SPLIT" && o.cash_amount == null)
    .reduce((s, o) => s + Number(o.total_amount), 0);
  return {
    totalOrders: orders.length,
    unpaidOrders: orders.filter(
      (o) =>
        ["UNPAID", "PARTIAL"].includes(o.payment_status) &&
        o.order_status !== "CANCELLED",
    ).length,
    completedOrders: orders.filter((o) => o.order_status === "COMPLETED")
      .length,
    cancelledOrders: orders.filter((o) => o.order_status === "CANCELLED")
      .length,
    paidOrders: paid.length,
    totalRevenue,
    cashSales,
    digitalSales: totalRevenue - cashSales - unallocatedSplitSales,
    unallocatedSplitSales,
    avgOrderValue: paid.length ? totalRevenue / paid.length : 0,
  };
}
export function activeTableOrders<
  T extends { id: string; order_status: string },
>(table: { status: string; current_order_id: string | null }, orders: T[]) {
  return table.status === "OCCUPIED"
    ? orders.filter(
        (o) => o.id === table.current_order_id && orderState(o) === "PENDING",
      )
    : [];
}

export function reportDateRange(
  preset: "today" | "yesterday" | "week" | "month",
  now: Date = new Date(),
) {
  const today = businessDate(now);
  const date = new Date(today + "T12:00:00Z");
  let to = today;
  if (preset === "yesterday") {
    date.setUTCDate(date.getUTCDate() - 1);
    to = date.toISOString().slice(0, 10);
  }
  if (preset === "week") date.setUTCDate(date.getUTCDate() - 6);
  if (preset === "month") date.setUTCDate(1);
  return { from: date.toISOString().slice(0, 10), to };
}
