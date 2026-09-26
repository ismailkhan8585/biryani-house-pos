"use client";

import { useEffect, useState, useCallback } from "react";
import { LayoutGrid, RefreshCw, ArrowLeft } from "lucide-react";
import type { RestaurantTable } from "@/lib/supabase";
import { timeElapsed, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

interface TablesClientProps {
  branchId: string;
}

const STATUS_CONFIG = {
  AVAILABLE: { bg: "rgb(240 253 244)", border: "rgb(187 247 208)", text: "rgb(21 128 61)", badge: "bg-green-100 text-green-700" },
  OCCUPIED:  { bg: "rgb(254 242 242)", border: "rgb(254 202 202)", text: "rgb(185 28 28)", badge: "bg-red-100 text-red-700" },
  RESERVED:  { bg: "rgb(255 251 235)", border: "rgb(253 230 138)", text: "rgb(180 83 9)",  badge: "bg-amber-100 text-amber-700" },
  CLEANING:  { bg: "rgb(239 246 255)", border: "rgb(191 219 254)", text: "rgb(29 78 216)", badge: "bg-blue-100 text-blue-700" },
};

export default function TablesClient({ branchId }: TablesClientProps) {
  const [tables, setTables] = useState<(RestaurantTable & { orders?: { order_number: string; total_amount: number; created_at: string; order_status: string }[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<typeof tables[0] | null>(null);

  const fetchTables = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/tables?branchId=${branchId}`);
      const d = await r.json();
      setTables(d.tables || []);
    } catch {
      toast.error("Failed to load tables");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const available = tables.filter((t) => t.status === "AVAILABLE").length;
  const occupied  = tables.filter((t) => t.status === "OCCUPIED").length;
  const reserved  = tables.filter((t) => t.status === "RESERVED").length;

  const handleClearTable = async (tableId: string) => {
    try {
      await fetch("/api/tables", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, status: "AVAILABLE", currentOrderId: null }),
      });
      toast.success("Table cleared!");
      setSelectedTable(null);
      fetchTables();
    } catch {
      toast.error("Failed to clear table");
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "rgb(255 247 237)" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: "rgb(254 215 170)" }}>
        <div className="flex items-center gap-3">
          <a href="/pos" className="p-2 rounded-xl hover:bg-orange-50 transition-colors">
            <ArrowLeft className="w-5 h-5" style={{ color: "rgb(120 113 108)" }} />
          </a>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgb(255 237 213)" }}>
              <LayoutGrid className="w-5 h-5" style={{ color: "rgb(249 115 22)" }} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight" style={{ fontFamily: "Plus Jakarta Sans, sans-serif", color: "rgb(28 25 23)" }}>
                Table Management
              </h1>
              <p className="text-xs" style={{ color: "rgb(120 113 108)" }}>
                <span style={{ color: "rgb(21 128 61)" }}>●</span> {available} Available &nbsp;
                <span style={{ color: "rgb(185 28 28)" }}>●</span> {occupied} Occupied &nbsp;
                <span style={{ color: "rgb(180 83 9)" }}>●</span> {reserved} Reserved
              </p>
            </div>
          </div>
        </div>
        <button onClick={fetchTables} className="p-2 rounded-xl hover:bg-orange-50">
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} style={{ color: "rgb(120 113 108)" }} />
        </button>
      </div>

      {/* Table Grid */}
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
            {tables.map((table) => {
              const conf = STATUS_CONFIG[table.status] || STATUS_CONFIG.AVAILABLE;
              const order = table.orders?.[0];

              return (
                <button
                  key={table.id}
                  onClick={() => setSelectedTable(selectedTable?.id === table.id ? null : table)}
                  className="p-4 rounded-2xl border-2 text-left transition-all duration-150 hover:scale-[1.02] hover:shadow-md"
                  style={{ background: conf.bg, borderColor: conf.border }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl font-bold font-mono" style={{ fontFamily: "JetBrains Mono, monospace", color: conf.text }}>
                      {table.table_number}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${conf.badge}`}>
                      {table.status === "AVAILABLE" ? "Free" : table.status === "OCCUPIED" ? "Busy" : table.status === "RESERVED" ? "Res." : "Clean"}
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: conf.text, opacity: 0.8 }}>{table.capacity} seats</div>
                  {order && (
                    <div className="mt-2 pt-2 border-t" style={{ borderColor: conf.border }}>
                      <div className="text-xs font-semibold" style={{ color: conf.text }}>#{order.order_number?.split("-").slice(-1)[0]}</div>
                      <div className="text-xs font-mono" style={{ fontFamily: "JetBrains Mono, monospace", color: conf.text }}>
                        {formatCurrency(order.total_amount)}
                      </div>
                      <div className="text-xs" style={{ color: conf.text, opacity: 0.7 }}>{timeElapsed(order.created_at)}</div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Selected Table Detail */}
        {selectedTable && (
          <div
            className="mt-6 p-5 rounded-2xl border-2"
            style={{
              background: "white",
              borderColor: "rgb(254 215 170)",
            }}
          >
            <h3 className="font-bold text-lg mb-3" style={{ fontFamily: "Plus Jakarta Sans, sans-serif", color: "rgb(28 25 23)" }}>
              Table {selectedTable.table_number} — {selectedTable.status}
            </h3>
            <div className="flex gap-3">
              <a
                href="/pos"
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "rgb(249 115 22)", color: "white" }}
              >
                ➕ Add Order
              </a>
              {selectedTable.status === "OCCUPIED" && (
                <button
                  onClick={() => handleClearTable(selectedTable.id)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all"
                  style={{ borderColor: "rgb(254 202 202)", color: "rgb(185 28 28)", background: "rgb(254 242 242)" }}
                >
                  🧹 Clear Table
                </button>
              )}
              {selectedTable.orders?.[0] && (
                <a
                  href={`/orders?id=${selectedTable.current_order_id}`}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all"
                  style={{ borderColor: "rgb(191 219 254)", color: "rgb(29 78 216)", background: "rgb(239 246 255)" }}
                >
                  📄 View Order
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
