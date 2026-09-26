"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Download,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  CreditCard,
  Utensils,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import toast from "react-hot-toast";

interface ReportsClientProps {
  branchId: string;
  branchName: string;
  role: "branch" | "admin";
}

interface ReportData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  cashSales: number;
  digitalSales: number;
  byType: { DINE_IN: number; TAKEAWAY: number; DELIVERY: number };
  hourlyData: { hour: number; revenue: number }[];
  topItems: { name: string; count: number; revenue: number }[];
  branchComparison?: { name: string; color: string; revenue: number; orders: number }[];
}

const PIE_COLORS = ["#F97316", "#3B82F6", "#8B5CF6"];

export default function ReportsClient({ branchId, branchName, role }: ReportsClientProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState(role === "admin" ? "all" : branchId);
  const [datePreset, setDatePreset] = useState<"today" | "yesterday" | "week" | "month">("today");

  const [report, setReport] = useState<ReportData>({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    cashSales: 0,
    digitalSales: 0,
    byType: { DINE_IN: 0, TAKEAWAY: 0, DELIVERY: 0 },
    hourlyData: [],
    topItems: [],
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch branches for admin
  useEffect(() => {
    if (role === "admin") {
      fetch("/api/branches")
        .then((r) => r.json())
        .then((d) => {
          if (d.branches) setBranches(d.branches);
        })
        .catch(() => {});
    }
  }, [role]);

  // Load report data
  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const from = new Date();
      const to = new Date();

      if (datePreset === "today") {
        from.setHours(0, 0, 0, 0);
      } else if (datePreset === "yesterday") {
        from.setDate(now.getDate() - 1);
        from.setHours(0, 0, 0, 0);
        to.setDate(now.getDate() - 1);
        to.setHours(23, 59, 59, 999);
      } else if (datePreset === "week") {
        from.setDate(now.getDate() - 7);
        from.setHours(0, 0, 0, 0);
      } else if (datePreset === "month") {
        from.setDate(1);
        from.setHours(0, 0, 0, 0);
      }

      const url = new URL("/api/reports", window.location.origin);
      url.searchParams.set("dateFrom", from.toISOString());
      url.searchParams.set("dateTo", to.toISOString());

      if (role === "admin" && selectedBranch === "all") {
        url.searchParams.set("allBranches", "true");
      } else {
        url.searchParams.set("branchId", selectedBranch);
      }

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch reports");
      const data = await res.json();
      const stats = data.stats || data;
      setReport({
        totalRevenue: stats.totalRevenue || 0,
        totalOrders: stats.totalOrders || 0,
        avgOrderValue: stats.avgOrderValue || 0,
        cashSales: stats.cashSales || 0,
        digitalSales: stats.digitalSales || 0,
        byType: stats.byType || { DINE_IN: 0, TAKEAWAY: 0, DELIVERY: 0 },
        hourlyData: data.hourlyData || [],
        topItems: data.topItems || [],
        branchComparison: data.branchStats || data.branchComparison || [],
      });
    } catch (err) {
      console.error(err);
      toast.error("Could not load report data");
    } finally {
      setLoading(false);
    }
  }, [datePreset, selectedBranch, role]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Export CSV
  const exportCSV = () => {
    try {
      const lines = [
        ["Metric", "Value"],
        ["Total Revenue", report.totalRevenue],
        ["Total Orders", report.totalOrders],
        ["Average Order Value", report.avgOrderValue.toFixed(2)],
        ["Cash Sales", report.cashSales],
        ["Digital Sales", report.digitalSales],
        ["Dine In Orders", report.byType.DINE_IN],
        ["Takeaway Orders", report.byType.TAKEAWAY],
        ["Delivery Orders", report.byType.DELIVERY],
        [],
        ["Top Selling Items", "Quantity", "Revenue"],
        ...report.topItems.map((item) => [item.name, item.count, item.revenue]),
      ];

      const csvContent = "data:text/csv;charset=utf-8," + lines.map((e) => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `biryani_pos_report_${datePreset}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Report downloaded as CSV!");
    } catch {
      toast.error("Failed to export report");
    }
  };

  const pieData = [
    { name: "Dine-In", value: report.byType.DINE_IN },
    { name: "Takeaway", value: report.byType.TAKEAWAY },
    { name: "Delivery", value: report.byType.DELIVERY },
  ].filter((d) => d.value > 0);

  // Formatted hourly data (e.g. 1 PM, 2 PM)
  const formattedHourly = report.hourlyData.map((d) => {
    const hour12 = d.hour === 0 ? "12 AM" : d.hour < 12 ? `${d.hour} AM` : d.hour === 12 ? "12 PM" : `${d.hour - 12} PM`;
    return {
      hourLabel: hour12,
      revenue: d.revenue,
    };
  });

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col font-sans pb-12">
      {/* Top Bar */}
      <header className="bg-white border-b border-orange-100 px-6 py-4 sticky top-0 z-20 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/pos"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-stone-700 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-orange-600" />
            <span>Back to POS</span>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900 flex items-center gap-2">
              📊 Sales & Analytics
            </h1>
            <p className="text-xs text-stone-500">
              {role === "admin" && selectedBranch === "all"
                ? "All Branches Combined"
                : role === "admin"
                ? branches.find((b) => b.id === selectedBranch)?.name || "Branch Report"
                : branchName}
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Branch filter if admin */}
          {role === "admin" && branches.length > 0 && (
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-white border border-stone-200 text-stone-800 text-sm rounded-xl px-3 py-2 outline-none focus:border-orange-500 shadow-sm"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          {/* Date Presets */}
          <div className="flex items-center bg-stone-100 rounded-xl p-1 border border-stone-200 text-xs font-semibold">
            {(["today", "yesterday", "week", "month"] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => setDatePreset(preset)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                  datePreset === preset
                    ? "bg-white text-orange-600 shadow-sm font-bold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                {preset === "week" ? "Last 7D" : preset === "month" ? "This Month" : preset}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            onClick={loadReports}
            className="p-2.5 rounded-xl bg-white border border-stone-200 text-stone-600 hover:bg-orange-50 hover:text-orange-600 transition-colors shadow-sm"
            title="Refresh Report"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-orange-500" : ""}`} />
          </button>

          {/* Export CSV button */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors shadow-md shadow-orange-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full px-6 pt-6 space-y-6">
        {/* Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Total Revenue */}
          <div className="bg-white rounded-2xl p-4 border border-orange-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-medium uppercase tracking-wider">Revenue</span>
              <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold font-mono text-stone-900">
                {formatCurrency(report.totalRevenue)}
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold">Net collected</span>
            </div>
          </div>

          {/* Total Orders */}
          <div className="bg-white rounded-2xl p-4 border border-orange-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-medium uppercase tracking-wider">Orders</span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold font-mono text-stone-900">
                {report.totalOrders}
              </div>
              <span className="text-[11px] text-stone-500 font-medium">Completed</span>
            </div>
          </div>

          {/* Average Order Value */}
          <div className="bg-white rounded-2xl p-4 border border-orange-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-medium uppercase tracking-wider">Avg Order</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold font-mono text-stone-900">
                {formatCurrency(Math.round(report.avgOrderValue))}
              </div>
              <span className="text-[11px] text-stone-500 font-medium">Per bill</span>
            </div>
          </div>

          {/* Cash Sales */}
          <div className="bg-white rounded-2xl p-4 border border-orange-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-medium uppercase tracking-wider">Cash</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                💵
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold font-mono text-stone-900">
                {formatCurrency(report.cashSales)}
              </div>
              <span className="text-[11px] text-stone-500 font-medium">In register</span>
            </div>
          </div>

          {/* Digital Sales */}
          <div className="bg-white rounded-2xl p-4 border border-orange-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-medium uppercase tracking-wider">Digital</span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold font-mono text-stone-900">
                {formatCurrency(report.digitalSales)}
              </div>
              <span className="text-[11px] text-purple-600 font-medium">Jazz/EasyPaisa</span>
            </div>
          </div>

          {/* Dine-In / Delivery ratio */}
          <div className="bg-white rounded-2xl p-4 border border-orange-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-medium uppercase tracking-wider">Breakdown</span>
              <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                <Utensils className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-base font-bold text-stone-900">
                {report.byType.DINE_IN} Dine / {report.byType.TAKEAWAY + report.byType.DELIVERY} Off
              </div>
              <span className="text-[11px] text-stone-500 font-medium">
                {report.byType.DELIVERY} delivery orders
              </span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hourly Revenue Bar Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-orange-100 shadow-sm">
            <h2 className="text-base font-bold text-stone-900 mb-1">
              Hourly Sales Trend
            </h2>
            <p className="text-xs text-stone-500 mb-4">Revenue distribution throughout the day</p>
            {mounted ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formattedHourly}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hourLabel" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip
                      formatter={(val: unknown) => [formatCurrency(Number(val) || 0), "Revenue"]}
                      contentStyle={{
                        background: "rgba(255, 255, 255, 0.95)",
                        borderRadius: "12px",
                        border: "1px solid #fed7aa",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                      }}
                    />
                    <Bar dataKey="revenue" fill="#F97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-stone-400">Loading chart...</div>
            )}
          </div>

          {/* Order Type Donut Chart */}
          <div className="bg-white rounded-2xl p-6 border border-orange-100 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-900 mb-1">
                Order Types
              </h2>
              <p className="text-xs text-stone-500 mb-4">Dine-in vs Takeaway vs Delivery</p>
              {mounted && pieData.length > 0 ? (
                <div className="h-52 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-52 flex items-center justify-center text-stone-400 text-sm">
                  No orders in this period
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-4 mt-2 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-orange-500 inline-block"></span>
                <span>Dine-In ({report.byType.DINE_IN})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
                <span>Takeaway ({report.byType.TAKEAWAY})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-purple-500 inline-block"></span>
                <span>Delivery ({report.byType.DELIVERY})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Selling Items & Branch Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Selling Items */}
          <div className="bg-white rounded-2xl p-6 border border-orange-100 shadow-sm">
            <h2 className="text-base font-bold text-stone-900 mb-1">
              Top Selling Dishes
            </h2>
            <p className="text-xs text-stone-500 mb-4">Ranked by total quantity sold</p>
            {report.topItems.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-6 text-center">No sales recorded yet</p>
            ) : (
              <div className="space-y-3">
                {report.topItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-orange-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-orange-600 bg-orange-100/60 w-6 h-6 rounded-full flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-stone-800">{item.name}</p>
                        <p className="text-xs text-stone-500">{item.count} portions sold</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold text-stone-900">
                        {formatCurrency(item.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Branch Comparison (Admin) */}
          <div className="bg-white rounded-2xl p-6 border border-orange-100 shadow-sm">
            <h2 className="text-base font-bold text-stone-900 mb-1">
              Branch Performance
            </h2>
            <p className="text-xs text-stone-500 mb-4">Revenue breakdown across branches</p>
            {report.branchComparison && report.branchComparison.length > 0 ? (
              <div className="space-y-4">
                {report.branchComparison.map((b, idx) => {
                  const percent = report.totalRevenue > 0 ? Math.round((b.revenue / report.totalRevenue) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-stone-800 flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }}></span>
                          {b.name}
                        </span>
                        <span className="font-mono font-bold text-stone-900">
                          {formatCurrency(b.revenue)} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: b.color || "#F97316",
                          }}
                        ></div>
                      </div>
                      <p className="text-[11px] text-stone-400 text-right">{b.orders} orders processed</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-stone-400">
                Single branch selected or no branch comparison available.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
