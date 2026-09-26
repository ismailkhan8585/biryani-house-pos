import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuth } from "@/lib/auth";

const EMPTY_REPORT = {
  stats: {
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    cashSales: 0,
    digitalSales: 0,
    byType: { DINE_IN: 0, TAKEAWAY: 0, DELIVERY: 0 },
  },
  hourlyData: [] as { hour: number; revenue: number }[],
  topItems: [] as { name: string; count: number; revenue: number }[],
  branchStats: [] as { name: string; color: string; revenue: number; orders: number }[],
};

// GET /api/reports
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId") || auth.branchId;
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const allBranches = searchParams.get("allBranches") === "true" && auth.role === "admin";

    // ── Inner DB fetch — returns empty data if Supabase is unavailable ──
    type OrderRow = {
      id: string;
      branch_id: string;
      order_type: string;
      payment_method: string;
      total_amount: number;
      created_at: string;
      order_items: { item_name: string; quantity: number; total_price: number }[];
      branches: { name?: string; color?: string } | null;
    };

    let orders: OrderRow[] = [];

    try {
      const serverClient = createServerClient();

      let query = serverClient
        .from("orders")
        .select(
          "id, branch_id, order_type, payment_method, total_amount, order_status, payment_status, created_at, order_items(id, item_name, quantity, unit_price, total_price), branches(name, color)"
        )
        .eq("payment_status", "PAID")
        .neq("order_status", "CANCELLED");

      if (!allBranches) {
        query = query.eq("branch_id", branchId);
      }

      if (dateFrom) {
        const start = new Date(dateFrom);
        start.setHours(0, 0, 0, 0);
        query = query.gte("created_at", start.toISOString());
      }

      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query = query.lte("created_at", end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orders = (data as any[]) || [];
    } catch (dbErr) {
      console.warn("GET /api/reports — DB unavailable, returning empty data:", dbErr);
      return NextResponse.json(EMPTY_REPORT);
    }

    // ── Compute stats ──
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const cashSales = orders
      .filter((o) => o.payment_method === "CASH")
      .reduce((sum, o) => sum + o.total_amount, 0);
    const digitalSales = orders
      .filter((o) => o.payment_method !== "CASH")
      .reduce((sum, o) => sum + o.total_amount, 0);

    const byType = {
      DINE_IN: orders.filter((o) => o.order_type === "DINE_IN").length,
      TAKEAWAY: orders.filter((o) => o.order_type === "TAKEAWAY").length,
      DELIVERY: orders.filter((o) => o.order_type === "DELIVERY").length,
    };

    // Hourly revenue
    const hourlyRevenue: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourlyRevenue[h] = 0;
    orders.forEach((o) => {
      const hour = new Date(o.created_at).getHours();
      hourlyRevenue[hour] = (hourlyRevenue[hour] || 0) + o.total_amount;
    });
    const hourlyData = Object.entries(hourlyRevenue).map(([hour, revenue]) => ({
      hour: parseInt(hour),
      revenue: Math.round(revenue),
    }));

    // Top menu items
    const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {};
    orders.forEach((o) => {
      (o.order_items || []).forEach((item) => {
        if (!itemCounts[item.item_name]) {
          itemCounts[item.item_name] = { name: item.item_name, count: 0, revenue: 0 };
        }
        itemCounts[item.item_name].count += item.quantity;
        itemCounts[item.item_name].revenue += item.total_price;
      });
    });
    const topItems = Object.values(itemCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Branch comparison (admin only)
    const branchStats: Record<string, { name: string; color: string; revenue: number; orders: number }> = {};
    if (allBranches) {
      orders.forEach((o) => {
        const bid = o.branch_id;
        if (!branchStats[bid]) {
          branchStats[bid] = {
            name: o.branches?.name || bid,
            color: o.branches?.color || "#F97316",
            revenue: 0,
            orders: 0,
          };
        }
        branchStats[bid].revenue += o.total_amount;
        branchStats[bid].orders++;
      });
    }

    return NextResponse.json({
      stats: {
        totalRevenue: Math.round(totalRevenue),
        totalOrders,
        avgOrderValue: Math.round(avgOrderValue),
        cashSales: Math.round(cashSales),
        digitalSales: Math.round(digitalSales),
        byType,
      },
      hourlyData,
      topItems,
      branchStats: Object.values(branchStats),
    });
  } catch (err) {
    console.error("GET /api/reports error:", err);
    return NextResponse.json(EMPTY_REPORT);
  }
}
