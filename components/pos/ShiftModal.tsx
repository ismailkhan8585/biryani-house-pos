"use client";
import { useState } from "react";
import { useShiftStore } from "@/stores/pos-shift";
import { getPendingOrders } from "@/lib/pos-db-local";
import toast from "react-hot-toast";
export default function ShiftModal({
  branchId,
  staffName,
  onClose,
  onSaved,
}: {
  branchId: string;
  staffName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { currentShift, setShift, clearShift } = useShiftStore();
  const [cash, setCash] = useState("");
  const [loading, setLoading] = useState(false);
  const closing = !!currentShift;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (
        closing &&
        (await getPendingOrders()).some((o) => o.shift_id === currentShift.id)
      )
        throw Error("Sync this shift's pending sales before closing.");
      const r = await fetch("/api/shifts", {
        method: closing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          closing
            ? { shiftId: currentShift.id, closingCash: Number(cash) }
            : { branchId, openingCash: Number(cash) },
        ),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      if (closing) {
        clearShift();
        toast.success(
          "Shift closed. Cash difference: Rs. " + d.shift.cash_difference,
        );
      } else {
        const s = d.shift;
        setShift({
          id: s.id,
          staffId: s.staff_id,
          branchId: s.branch_id,
          shiftNumber: s.shift_number,
          operatorName: s.operator_name,
          openingCash: s.opening_cash,
          openedAt: s.opened_at,
          totalSales: s.total_sales,
          totalOrders: s.total_orders,
        });
        toast.success("Shift opened");
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Shift could not be saved");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shift-title"
      className="responsive-dialog fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
    >
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4"
      >
        <h2 id="shift-title" className="text-xl font-bold">
          {closing ? "Close shift" : "Open shift"}
        </h2>
        <p>
          Cashier: <strong>{staffName}</strong>
        </p>
        {closing && (
          <p className="text-sm">
            Sync all sales first, then count the cash in the drawer.
          </p>
        )}
        <label className="block">
          {closing ? "Counted closing cash (Rs.)" : "Opening cash (Rs.)"}
          <input
            autoFocus
            className="field"
            type="number"
            min="0"
            step="0.01"
            required
            value={cash}
            onChange={(e) => setCash(e.target.value)}
          />
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button className="btn-primary flex-1" disabled={loading}>
            {loading ? "Saving..." : closing ? "Close shift" : "Open shift"}
          </button>
        </div>
        <a className="text-sm underline block" href="/orders">
          Back to orders
        </a>
      </form>
    </div>
  );
}
