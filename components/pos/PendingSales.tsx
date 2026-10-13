"use client";
import { useEffect, useState } from "react";
import { getPendingOrders } from "@/lib/pos-db-local";
import { useConnectionStore } from "@/stores/pos-connection";
import { printReceipt } from "@/lib/print-receipt";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

export default function PendingSales({
  staffId,
  branchId,
}: {
  staffId: string;
  branchId: string;
}) {
  const count = useConnectionStore((s) => s.pendingSyncCount);
  const [orders, setOrders] = useState<
    Awaited<ReturnType<typeof getPendingOrders>>
  >([]);
  useEffect(() => {
    let active = true;
    void getPendingOrders()
      .then((rows) => {
        if (active)
          setOrders(
            rows.filter(
              (o) => o.staff_id === staffId && o.branch_id === branchId,
            ),
          );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [count, staffId, branchId]);
  if (!orders.length) return null;
  return (
    <details className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm">
      <summary className="cursor-pointer font-semibold">
        {orders.length} saved sales awaiting sync — view / reprint
      </summary>
      <div className="max-h-48 overflow-auto py-2 space-y-2">
        {orders.map((order) => (
          <div key={order.id} className="flex flex-wrap items-center gap-3">
            <span>
              {order.order_number} · {formatCurrency(order.total_amount)} ·{" "}
              {order._syncStatus === "FAILED"
                ? "Retry needed"
                : "Saved on this device"}
            </span>
            <button
              type="button"
              className="underline"
              onClick={() => {
                let settings = {};
                try {
                  settings = JSON.parse(
                    localStorage.getItem("receipt-settings") || "{}",
                  );
                } catch {}
                if (!printReceipt(order, order._items, settings))
                  toast.error("Allow receipt popups, then retry.");
              }}
            >
              Reprint receipt
            </button>
          </div>
        ))}
      </div>
    </details>
  );
}
