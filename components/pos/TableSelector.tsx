"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { RestaurantTable } from "@/lib/supabase";
import toast from "react-hot-toast";

interface TableSelectorProps {
  branchId: string;
  onClose: () => void;
  onSelect: (tableId: string, tableNumber: number) => void;
}

const STATUS_CONFIG = {
  AVAILABLE:  { bg: "rgb(240 253 244)", border: "rgb(187 247 208)", text: "rgb(21 128 61)",   label: "Available" },
  OCCUPIED:   { bg: "rgb(254 242 242)", border: "rgb(254 202 202)", text: "rgb(185 28 28)",   label: "Occupied" },
  RESERVED:   { bg: "rgb(255 251 235)", border: "rgb(253 230 138)", text: "rgb(180 83 9)",    label: "Reserved" },
  CLEANING:   { bg: "rgb(239 246 255)", border: "rgb(191 219 254)", text: "rgb(29 78 216)",   label: "Cleaning" },
};

export default function TableSelector({ branchId, onClose, onSelect }: TableSelectorProps) {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tables?branchId=${branchId}`)
      .then((r) => r.json())
      .then((d) => { setTables(d.tables || []); setLoading(false); })
      .catch(() => { toast.error("Failed to load tables"); setLoading(false); });
  }, [branchId]);

  const available = tables.filter((t) => t.status === "AVAILABLE").length;
  const occupied = tables.filter((t) => t.status === "OCCUPIED").length;

  const handleConfirm = () => {
    const table = tables.find((t) => t.id === selected);
    if (!table) return;
    onSelect(table.id, table.table_number);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgb(0 0 0 / 0.5)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-lg rounded-3xl shadow-2xl"
        style={{ background: "white", border: "1px solid rgb(254 215 170)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgb(254 215 170)" }}>
          <div>
            <h2 className="text-lg font-bold" style={{ fontFamily: "Plus Jakarta Sans, sans-serif", color: "rgb(28 25 23)" }}>
              🪑 Select Table
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "rgb(120 113 108)" }}>
              Available: <strong style={{ color: "rgb(21 128 61)" }}>{available}</strong> &nbsp;|&nbsp;
              Occupied: <strong style={{ color: "rgb(185 28 28)" }}>{occupied}</strong>
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-orange-50">
            <X className="w-5 h-5" style={{ color: "rgb(120 113 108)" }} />
          </button>
        </div>

        {/* Table Grid */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-3">
              {tables.map((table) => {
                const config = STATUS_CONFIG[table.status] || STATUS_CONFIG.AVAILABLE;
                const isSelected = selected === table.id;
                const isOccupied = table.status !== "AVAILABLE";

                return (
                  <button
                    key={table.id}
                    onClick={() => !isOccupied && setSelected(table.id)}
                    disabled={isOccupied}
                    className="flex flex-col items-center p-3 rounded-2xl border-2 transition-all duration-150"
                    style={{
                      background: isSelected ? "rgb(249 115 22)" : config.bg,
                      borderColor: isSelected ? "rgb(234 88 12)" : config.border,
                      cursor: isOccupied ? "not-allowed" : "pointer",
                      boxShadow: isSelected ? "0 0 0 3px rgb(249 115 22 / 0.3), 0 4px 12px rgb(249 115 22 / 0.3)" : "none",
                      transform: isSelected ? "scale(1.05)" : "scale(1)",
                    }}
                  >
                    <div
                      className="text-2xl font-bold mb-0.5"
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        color: isSelected ? "white" : config.text,
                      }}
                    >
                      {table.table_number}
                    </div>
                    <div
                      className="text-xs font-medium"
                      style={{ color: isSelected ? "rgb(255 237 213)" : config.text, opacity: isSelected ? 1 : 0.8 }}
                    >
                      {table.capacity}👤
                    </div>
                    <div
                      className="text-xs mt-0.5"
                      style={{ color: isSelected ? "white" : config.text, opacity: 0.8 }}
                    >
                      {isOccupied ? "●" : "○"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex gap-4 mt-4 justify-center">
            {Object.entries(STATUS_CONFIG).map(([status, conf]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full border-2" style={{ background: conf.bg, borderColor: conf.border }} />
                <span className="text-xs" style={{ color: "rgb(120 113 108)" }}>{conf.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border font-semibold text-sm transition-all"
            style={{ borderColor: "rgb(254 215 170)", color: "rgb(120 113 108)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected}
            className="flex-[2] py-3 rounded-xl text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
            style={{
              fontFamily: "Plus Jakarta Sans, sans-serif",
              background: selected ? "linear-gradient(135deg, rgb(249 115 22), rgb(234 88 12))" : "rgb(254 215 170)",
              boxShadow: selected ? "0 4px 12px rgb(249 115 22 / 0.4)" : "none",
            }}
          >
            {selected ? `Confirm Table ${tables.find((t) => t.id === selected)?.table_number}` : "Select a Table"}
          </button>
        </div>
      </div>
    </div>
  );
}
