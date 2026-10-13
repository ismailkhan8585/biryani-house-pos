import { NextRequest, NextResponse } from "next/server";
import { session, branchScope, apiError } from "@/lib/api";
import { createServerClient, type Order } from "@/lib/supabase";
import {
  dayBounds,
  businessDate,
  summarizeOrders,
  BUSINESS_ZONE,
} from "@/lib/operations";
import { ORDER_SELECT } from "@/lib/order-service";
export async function GET(req: NextRequest) {
  try {
    const auth = await session();
    const p = req.nextUrl.searchParams;
    const requested =
      p.get("allBranches") === "true" ? "all" : p.get("branchId");
    const branch = branchScope(auth, requested, true);
    const from = p.get("dateFrom") || businessDate(),
      to = p.get("dateTo") || businessDate();
    const bounds = [dayBounds(from)[0], dayBounds(to)[1]];
    const db = createServerClient();
    const all: Order[] = [];
    for (let offset = 0; ; offset += 1000) {
      let q = db
        .from("orders")
        .select(ORDER_SELECT)
        .gte("created_at", bounds[0])
        .lte("created_at", bounds[1])
        .order("id")
        .range(offset, offset + 999);
      if (branch) q = q.eq("branch_id", branch);
      const { data, error } = await q;
      if (error) throw error;
      all.push(...(data as unknown as Order[]));
      if (data.length < 1000) break;
    }
    const paid = all.filter(
      (o) => o.payment_status === "PAID" && o.order_status !== "CANCELLED",
    );
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      revenue: 0,
    }));
    const top = new Map<
      string,
      { name: string; count: number; revenue: number }
    >();
    for (const o of paid) {
      const h = Number(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: BUSINESS_ZONE,
          hour: "2-digit",
          hourCycle: "h23",
        }).format(new Date(o.created_at)),
      );
      hourlyData[h].revenue += Number(o.total_amount);
      for (const i of o.order_items || []) {
        const entry = top.get(i.item_name) || {
          name: i.item_name,
          count: 0,
          revenue: 0,
        };
        entry.count += i.quantity;
        entry.revenue += Number(i.total_price);
        top.set(i.item_name, entry);
      }
    }
    const branchStats = [...new Set(all.map((o) => o.branch_id))].map((id) => {
      const rows = all.filter((o) => o.branch_id === id);
      const s = summarizeOrders(rows);
      return {
        id,
        name: rows[0].branches?.name || id,
        color: rows[0].branches?.color || "#F97316",
        ...s,
        revenue: s.totalRevenue,
        orders: s.totalOrders,
      };
    });
    return NextResponse.json({
      stats: {
        ...summarizeOrders(all),
        byType: {
          DINE_IN: paid.filter((o) => o.order_type === "DINE_IN").length,
          TAKEAWAY: paid.filter((o) => o.order_type === "TAKEAWAY").length,
          DELIVERY: paid.filter((o) => o.order_type === "DELIVERY").length,
        },
      },
      hourlyData,
      topItems: [...top.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      branchStats,
    });
  } catch (e) {
    return apiError(e);
  }
}
