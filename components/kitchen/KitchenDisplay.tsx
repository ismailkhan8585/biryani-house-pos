"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ArrowLeft, Volume2, VolumeX, RefreshCw, Clock, CheckCircle2, Flame } from "lucide-react";
import Link from "next/link";
import { supabase, type Order, type OrderItem } from "@/lib/supabase";
import { formatDateTime, getOrderTypeClasses } from "@/lib/utils";
import toast from "react-hot-toast";

interface KitchenDisplayProps {
  branchId: string;
  branchName: string;
  role: "branch" | "admin";
}

interface KDSOrder extends Order {
  order_items: OrderItem[];
  elapsedSeconds?: number;
}

export default function KitchenDisplay({ branchId, branchName, role }: KitchenDisplayProps) {
  const [orders, setOrders] = useState<KDSOrder[]>([]);
  const [selectedBranch, setSelectedBranch] = useState(branchId || "all");
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [filter, setFilter] = useState<"ACTIVE" | "READY" | "ALL">("ACTIVE");
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [now, setNow] = useState<number>(0);
  const prevOrderCount = useRef<number>(0);

  // Play audio chime using Web Audio API (no external file required)
  const playChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch {
      // Audio context might be restricted before user interaction
    }
  }, [soundEnabled]);

  // Fetch branches if admin
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

  // Load active kitchen orders
  const loadOrders = useCallback(async () => {
    try {
      const url = new URL("/api/orders", window.location.origin);
      url.searchParams.set("limit", "100");
      if (selectedBranch && selectedBranch !== "all") {
        url.searchParams.set("branchId", selectedBranch);
      }

      const res = await fetch(url.toString());
      if (!res.ok) return;
      const data = await res.json();
      const rawOrders: KDSOrder[] = data.orders || [];

      // Filter to relevant kitchen orders
      const kitchenOrders = rawOrders.filter(
        (o) => o.order_status !== "COMPLETED" && o.order_status !== "CANCELLED"
      );

      // Sort FIFO (oldest first)
      kitchenOrders.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      if (kitchenOrders.length > prevOrderCount.current && prevOrderCount.current > 0) {
        playChime();
        toast("New order received in kitchen!", { icon: "🔔" });
      }
      prevOrderCount.current = kitchenOrders.length;
      setOrders(kitchenOrders);
    } catch (err) {
      console.error("Failed to load kitchen orders", err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, playChime]);

  // Live timer tick every second
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initial load + interval polling backup
  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("kitchen-orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrders]);

  // Update order status
  const updateOrderStatus = async (
    orderId: string,
    newStatus: "PREPARING" | "READY" | "SERVED"
  ) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Order updated to ${newStatus}`);
      loadOrders();
    } catch {
      toast.error("Failed to update order status");
    }
  };

  // Helper to calculate minutes elapsed
  const getElapsedMinutes = (createdAt: string) => {
    const current = now > 0 ? now : new Date(createdAt).getTime();
    const diff = Math.max(0, Math.floor((current - new Date(createdAt).getTime()) / 1000));
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return { mins, secs, totalSeconds: diff };
  };

  // Filter orders
  const displayedOrders = orders.filter((order) => {
    if (filter === "ACTIVE") {
      return order.order_status === "PENDING" || order.order_status === "PREPARING";
    }
    if (filter === "READY") {
      return order.order_status === "READY";
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      {/* Top Bar */}
      <header className="bg-stone-900 border-b border-stone-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-4">
          <Link
            href="/pos"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to POS</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-2xl">👨‍🍳</span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Kitchen Display System (KDS)
              </h1>
              <p className="text-xs text-stone-400">
                {role === "admin" ? "All Branches (Admin)" : branchName} • Live Orders (FIFO)
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Branch filter if admin */}
          {role === "admin" && branches.length > 0 && (
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-stone-800 border border-stone-700 text-stone-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-orange-500"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          {/* Sound Toggle */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playChime();
            }}
            className={`p-2.5 rounded-xl border transition-colors ${
              soundEnabled
                ? "bg-stone-800 border-stone-700 text-orange-400 hover:bg-stone-700"
                : "bg-stone-800/50 border-stone-800 text-stone-500"
            }`}
            title={soundEnabled ? "Sound Enabled" : "Sound Muted"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Refresh */}
          <button
            onClick={loadOrders}
            className="p-2.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-300 hover:bg-stone-700 transition-colors"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* Filter Tabs & Order Count */}
      <div className="bg-stone-900/60 border-b border-stone-800/80 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("ACTIVE")}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              filter === "ACTIVE"
                ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            Cooking / Pending (
            {orders.filter((o) => o.order_status === "PENDING" || o.order_status === "PREPARING").length}
            )
          </button>
          <button
            onClick={() => setFilter("READY")}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              filter === "READY"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            Ready to Serve ({orders.filter((o) => o.order_status === "READY").length})
          </button>
          <button
            onClick={() => setFilter("ALL")}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              filter === "ALL"
                ? "bg-stone-700 text-white"
                : "bg-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            All Active ({orders.length})
          </button>
        </div>

        <div className="text-xs text-stone-400 flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live Realtime Sync</span>
        </div>
      </div>

      {/* Orders Grid */}
      <main className="flex-1 p-6 overflow-y-auto">
        {loading && orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-stone-500">
            <RefreshCw className="w-8 h-8 animate-spin mb-3 text-orange-500" />
            <p className="text-base font-medium">Loading kitchen tickets...</p>
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center text-3xl mb-4">
              🎉
            </div>
            <h2 className="text-xl font-bold text-stone-300">All caught up!</h2>
            <p className="text-stone-500 text-sm mt-1">No pending orders in this queue.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {displayedOrders.map((order) => {
              const { mins, secs, totalSeconds } = getElapsedMinutes(order.created_at);
              const isUrgent = totalSeconds >= 1200; // > 20 minutes
              const isWarning = totalSeconds >= 600 && totalSeconds < 1200; // 10-20 mins
              const typeClass = getOrderTypeClasses(order.order_type);

              let timerColor = "bg-emerald-950/80 text-emerald-300 border-emerald-800";
              if (isWarning) timerColor = "bg-amber-950/80 text-amber-300 border-amber-800";
              if (isUrgent) timerColor = "bg-red-950/90 text-red-300 border-red-600 animate-pulse";

              return (
                <div
                  key={order.id}
                  className={`rounded-2xl flex flex-col justify-between overflow-hidden transition-all shadow-xl bg-stone-900 border ${
                    isUrgent
                      ? "border-red-500 shadow-red-500/20 ring-1 ring-red-500"
                      : order.order_status === "READY"
                      ? "border-emerald-600 shadow-emerald-600/10"
                      : order.order_status === "PREPARING"
                      ? "border-orange-500 shadow-orange-500/10"
                      : "border-stone-800"
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-stone-800/80 bg-stone-900/90">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-extrabold font-mono text-orange-400">
                          #{order.order_number.split("-").slice(-1)[0] || order.order_number}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${typeClass}`}>
                          {order.order_type.replace("_", " ")}
                        </span>
                      </div>

                      {/* Elapsed Timer Badge */}
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold ${timerColor}`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {mins}m {secs < 10 ? `0${secs}` : secs}s
                        </span>
                      </div>
                    </div>

                    {/* Table / Customer Details */}
                    <div className="flex items-center justify-between mt-2 text-xs text-stone-400">
                      <div>
                        {order.order_type === "DINE_IN" && order.table_number && (
                          <span className="font-semibold text-orange-300 bg-orange-950/60 border border-orange-900 px-2 py-0.5 rounded">
                            🪑 Table {order.table_number}
                          </span>
                        )}
                        {order.customer_name && (
                          <span className="font-medium text-stone-300 ml-1">
                            👤 {order.customer_name}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-stone-500">
                        {formatDateTime(order.created_at).split(" ")[1]}
                      </span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-4 flex-1 divide-y divide-stone-800/60 overflow-y-auto max-h-72">
                    {order.order_items && order.order_items.length > 0 ? (
                      order.order_items.map((item, idx) => (
                        <div key={idx} className="py-2.5 first:pt-0 last:pb-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-baseline gap-2">
                              <span className="font-mono text-base font-extrabold text-orange-400 bg-stone-800 px-2 py-0.5 rounded-md min-w-[28px] text-center">
                                {item.quantity}×
                              </span>
                              <div>
                                <p className="text-sm font-bold text-stone-100 leading-snug">
                                  {item.item_name}
                                </p>
                                {item.item_name_ur && (
                                  <p className="text-xs text-stone-400 font-urdu mt-0.5">
                                    {item.item_name_ur}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Item Notes / Special Instructions */}
                          {item.notes && (
                            <div className="mt-1.5 ml-9 text-xs bg-amber-950/70 border border-amber-800/80 text-amber-200 px-2 py-1 rounded-md flex items-center gap-1.5">
                              <span>⚠️</span>
                              <span className="font-medium">{item.notes}</span>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-stone-500 italic py-2">No item details</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="p-3 bg-stone-900/90 border-t border-stone-800/80 flex gap-2">
                    {order.order_status === "PENDING" && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "PREPARING")}
                        className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-orange-600/20"
                      >
                        <Flame className="w-4 h-4" />
                        <span>START PREPARING</span>
                      </button>
                    )}

                    {order.order_status === "PREPARING" && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "READY")}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>MARK READY</span>
                      </button>
                    )}

                    {order.order_status === "READY" && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "SERVED")}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>SERVE / COMPLETE</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
