"use client";

import { useState } from "react";
import { DollarSign } from "lucide-react";
import { useShiftStore } from "@/stores/pos-shift";
import toast from "react-hot-toast";

interface ShiftModalProps {
  branchId: string;
  onClose: () => void;
}

export default function ShiftModal({ branchId, onClose }: ShiftModalProps) {
  const setShift = useShiftStore((s) => s.setShift);
  const [operatorName, setOperatorName] = useState("");
  const [openingCash, setOpeningCash] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOpenShift = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorName: operatorName || "Cashier",
          openingCash: parseFloat(openingCash) || 0,
        }),
      });

      if (!res.ok) throw new Error("Failed");
      const { shift } = await res.json();

      setShift({
        id: shift.id,
        shiftNumber: shift.shift_number,
        branchId: shift.branch_id,
        operatorName: shift.operator_name,
        openingCash: shift.opening_cash,
        openedAt: shift.opened_at,
        totalSales: 0,
        totalOrders: 0,
      });

      toast.success(`Shift opened! Opening cash: Rs. ${parseFloat(openingCash || "0").toLocaleString()}`);
      onClose();
    } catch {
      // Allow offline shift start
      setShift({
        id: crypto.randomUUID(),
        shiftNumber: `SHF-OFFLINE-${Date.now()}`,
        branchId,
        operatorName: operatorName || "Cashier",
        openingCash: parseFloat(openingCash) || 0,
        openedAt: new Date().toISOString(),
        totalSales: 0,
        totalOrders: 0,
      });
      toast.success("Shift started (offline mode)");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgb(0 0 0 / 0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-sm rounded-3xl shadow-2xl"
        style={{ background: "white", border: "1px solid rgb(254 215 170)" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgb(254 215 170)" }}>
          <h2 className="text-lg font-bold" style={{ fontFamily: "Plus Jakarta Sans, sans-serif", color: "rgb(28 25 23)" }}>
            ⏰ Open Shift
          </h2>
        </div>

        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgb(120 113 108)" }}>
              Cashier Name
            </label>
            <input
              type="text"
              placeholder="Enter name (optional)"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border outline-none text-sm"
              style={{ borderColor: "rgb(254 215 170)", color: "rgb(28 25 23)" }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgb(120 113 108)" }}>
              Opening Cash (Rs.)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgb(168 162 158)" }} />
              <input
                type="number"
                placeholder="0"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border outline-none text-sm font-mono"
                style={{ borderColor: "rgb(254 215 170)", color: "rgb(28 25 23)", fontFamily: "JetBrains Mono, monospace" }}
              />
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={handleOpenShift}
            disabled={loading}
            className="w-full py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            style={{
              fontFamily: "Plus Jakarta Sans, sans-serif",
              background: "linear-gradient(135deg, rgb(249 115 22), rgb(234 88 12))",
              boxShadow: "0 4px 16px rgb(249 115 22 / 0.4)",
            }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : "🚀 Open Shift & Start Selling"}
          </button>
        </div>
      </div>
    </div>
  );
}
