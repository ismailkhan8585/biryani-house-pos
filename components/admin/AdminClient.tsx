"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Building2,
  TrendingUp,
  ShoppingBag,
  Clock,
  UtensilsCrossed,
  Settings,
  BarChart3,
  LogOut,
  RefreshCw,
  ExternalLink,
  ChefHat,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

interface BranchOverview {
  id: string;
  name: string;
  name_ur: string | null;
  address: string | null;
  phone: string | null;
  pin: string;
  color: string;
  is_active: boolean;
  todayRevenue: number;
  todayOrders: number;
  activeOrders: number;
}

export default function AdminClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<BranchOverview[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalActive, setTotalActive] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch branches
      const bRes = await fetch("/api/branches");
      const bData = await bRes.json();
      const rawBranches = bData.branches || [];

      // 2. Fetch today's orders for stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const oRes = await fetch(`/api/orders?limit=200&date=${today.toISOString()}`);
      const oData = await oRes.json();
      const orders = oData.orders || [];

      let sumRev = 0;
      let sumOrders = 0;
      let sumActive = 0;

      const branchList: BranchOverview[] = rawBranches.map((b: { id: string; name: string; name_ur: string | null; address: string | null; phone: string | null; pin: string; color: string; is_active: boolean }) => {
        const bOrders = orders.filter((o: { branch_id: string }) => o.branch_id === b.id);
        const bPaid = bOrders.filter((o: { payment_status: string }) => o.payment_status === "PAID");
        const bRevenue = bPaid.reduce((acc: number, o: { total_amount: number }) => acc + (o.total_amount || 0), 0);
        const bActive = bOrders.filter(
          (o: { order_status: string }) =>
            o.order_status === "PENDING" || o.order_status === "PREPARING" || o.order_status === "READY"
        ).length;

        sumRev += bRevenue;
        sumOrders += bOrders.length;
        sumActive += bActive;

        return {
          ...b,
          todayRevenue: bRevenue,
          todayOrders: bOrders.length,
          activeOrders: bActive,
        };
      });

      setBranches(branchList);
      setTotalRevenue(sumRev);
      setTotalOrders(sumOrders);
      setTotalActive(sumActive);
    } catch (err) {
      console.error("Failed to load admin data", err);
      toast.error("Could not load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      toast.error("Logout failed");
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col font-sans pb-16">
      {/* Top Navbar */}
      <header className="bg-white border-b border-orange-100 px-6 py-4 sticky top-0 z-20 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center text-xl shadow-md shadow-orange-500/20">
            👑
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              Biryani House — Master Admin
            </h1>
            <p className="text-xs text-stone-500">
              Multi-Branch Operations & Central Control
            </p>
          </div>
        </div>

        {/* Action Links */}
        <div className="flex items-center gap-2">
          <Link
            href="/pos"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition-colors shadow-sm"
          >
            <span>Open POS</span>
          </Link>
          <Link
            href="/kitchen"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200 transition-colors"
          >
            <ChefHat className="w-4 h-4 text-orange-600" />
            <span>Kitchen</span>
          </Link>
          <Link
            href="/reports"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200 transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>Reports</span>
          </Link>
          <Link
            href="/menu"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200 transition-colors"
          >
            <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
            <span>Menu</span>
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200 transition-colors"
          >
            <Settings className="w-4 h-4 text-stone-600" />
            <span>Settings</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors ml-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full px-6 pt-6 space-y-8">
        {/* Total Aggregates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl p-6 border border-orange-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Combined Sales (Today)
              </p>
              <h3 className="text-2xl font-bold font-mono text-stone-900 mt-1">
                {formatCurrency(totalRevenue)}
              </h3>
              <p className="text-xs text-emerald-600 font-medium mt-1">All 3 branches active</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-orange-50 text-orange-600">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-orange-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Total Orders (Today)
              </p>
              <h3 className="text-2xl font-bold font-mono text-stone-900 mt-1">
                {totalOrders}
              </h3>
              <p className="text-xs text-stone-500 font-medium mt-1">Bills printed</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-600">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-orange-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Active Orders Right Now
              </p>
              <h3 className="text-2xl font-bold font-mono text-stone-900 mt-1">
                {totalActive}
              </h3>
              <p className="text-xs text-orange-600 font-medium mt-1">In kitchen / tables</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* 3 Branches Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-orange-500" />
                <span>Branch Operations Overview</span>
              </h2>
              <p className="text-xs text-stone-500">
                Live performance and quick management for each location
              </p>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {branches.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-3xl p-6 border shadow-sm flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden"
                style={{ borderColor: `${b.color || "#F97316"}33` }}
              >
                {/* Branch Accent Bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-2"
                  style={{ backgroundColor: b.color || "#F97316" }}
                />

                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-stone-900">{b.name}</h3>
                      {b.name_ur && (
                        <p className="text-xs text-stone-400 font-urdu">{b.name_ur}</p>
                      )}
                      <p className="text-xs text-stone-500 mt-1">{b.address || "Main Market"}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Online
                    </span>
                  </div>

                  {/* Branch Metrics */}
                  <div className="mt-5 space-y-3 bg-stone-50 p-4 rounded-2xl">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-500">Today&apos;s Sales</span>
                      <span className="font-mono font-bold text-sm text-stone-900">
                        {formatCurrency(b.todayRevenue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-500">Orders Today</span>
                      <span className="font-mono font-bold text-stone-800">{b.todayOrders}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-500">Active (Queue)</span>
                      <span className="font-bold text-orange-600 bg-orange-100/60 px-2 py-0.5 rounded-md">
                        {b.activeOrders} orders
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-t border-stone-200/60 pt-2 text-stone-400">
                      <span>Branch PIN</span>
                      <span className="font-mono font-semibold tracking-widest text-stone-600">
                        {b.pin}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Branch Actions */}
                <div className="mt-6 flex items-center gap-2">
                  <Link
                    href={`/pos`}
                    className="flex-1 py-2.5 rounded-xl text-center text-xs font-bold text-white transition-opacity hover:opacity-90 shadow-sm flex items-center justify-center gap-1.5"
                    style={{ backgroundColor: b.color || "#F97316" }}
                  >
                    <span>Open POS</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href={`/tables`}
                    className="px-3 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors flex items-center gap-1"
                    title="View Tables"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Tables</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Central Quick Controls */}
        <div className="bg-white rounded-3xl p-6 border border-orange-100 shadow-sm">
          <h2 className="text-base font-bold text-stone-900 mb-4">
            Master Management Tools
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/menu"
              className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200/60 hover:border-orange-300 transition-all flex items-center gap-3 group"
            >
              <div className="p-3 rounded-xl bg-orange-500 text-white group-hover:scale-105 transition-transform">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-800">Menu & Pricing</h4>
                <p className="text-xs text-stone-500">Edit dishes, prices & stock</p>
              </div>
            </Link>

            <Link
              href="/reports"
              className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/60 hover:border-blue-300 transition-all flex items-center gap-3 group"
            >
              <div className="p-3 rounded-xl bg-blue-500 text-white group-hover:scale-105 transition-transform">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-800">Sales Reports</h4>
                <p className="text-xs text-stone-500">Analytics & CSV downloads</p>
              </div>
            </Link>

            <Link
              href="/kitchen"
              className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 hover:border-amber-300 transition-all flex items-center gap-3 group"
            >
              <div className="p-3 rounded-xl bg-amber-500 text-white group-hover:scale-105 transition-transform">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-800">Kitchen KDS</h4>
                <p className="text-xs text-stone-500">All branch cooking queues</p>
              </div>
            </Link>

            <Link
              href="/settings"
              className="p-4 rounded-2xl bg-stone-100/60 border border-stone-200 hover:border-stone-300 transition-all flex items-center gap-3 group"
            >
              <div className="p-3 rounded-xl bg-stone-700 text-white group-hover:scale-105 transition-transform">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-800">Store Settings</h4>
                <p className="text-xs text-stone-500">PINs, tax & accounts</p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
