"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Order } from "@/lib/supabase";
import BrandLogo from "@/components/BrandLogo";
import { formatCurrency, formatDateTime, getOrderTypeLabel } from "@/lib/utils";
import { businessDate, orderState } from "@/lib/operations";
import { printReceipt } from "@/lib/print-receipt";
import toast from "react-hot-toast";
export default function OrdersClient({
  branchId,
  role,
}: {
  branchId: string;
  role: "admin" | "branch";
}) {
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<Order[]>([]),
    [count, setCount] = useState(0),
    [page, setPage] = useState(0),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [branch, setBranch] = useState(role === "admin" ? "all" : branchId),
    [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [from, setFrom] = useState(businessDate()),
    [to, setTo] = useState(businessDate()),
    [payment, setPayment] = useState(""),
    [status, setStatus] = useState(""),
    [type, setType] = useState("");
  const [selected, setSelected] = useState<Order | null>(null),
    [reason, setReason] = useState(""),
    [method, setMethod] = useState("CASH"),
    [cash, setCash] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const requestNumber = useRef(0);
  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then((d) => setBranches(d.branches || []))
      .catch(() => {});
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings || {}))
      .catch(() => {});
  }, []);
  const load = useCallback(async () => {
    const request = ++requestNumber.current;
    setLoading(true);
    setError("");
    try {
      const p = new URLSearchParams({ branchId: branch, page: String(page) });
      if (search) p.set("search", search);
      if (from) p.set("dateFrom", from);
      if (to) p.set("dateTo", to);
      if (payment) p.set("paymentStatus", payment);
      if (status) p.set("status", status);
      if (type) p.set("type", type);
      const r = await fetch("/api/orders?" + p);
      const d = await r.json();
      if (request !== requestNumber.current) return;
      if (!r.ok) throw Error(d.error);
      setOrders(d.orders);
      setCount(d.count);
    } catch (e) {
      if (request !== requestNumber.current) return;
      setOrders([]);
      setCount(0);
      setError(e instanceof Error ? e.message : "Orders unavailable");
    } finally {
      if (request === requestNumber.current) setLoading(false);
    }
  }, [branch, page, from, to, payment, status, type, search]);
  useEffect(() => {
    void load();
  }, [load]);
  async function cancel() {
    if (!selected || reason.trim().length < 3) return;
    setSaving(true);
    try {
      const r = await fetch("/api/orders/" + selected.id + "/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED", reason }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      toast.success("Order cancelled; history retained");
      setSelected(null);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cancellation failed");
    } finally {
      setSaving(false);
    }
  }
  async function settle() {
    if (!selected || !confirmed) return;
    setSaving(true);
    try {
      if (method === "CASH" && Number(cash) < selected.total_amount)
        throw Error("Cash received is insufficient");
      if (
        method === "SPLIT" &&
        (Number(cash) < 0 || Number(cash) > selected.total_amount)
      )
        throw Error("Invalid split cash amount");
      const sr = await fetch("/api/shifts?branchId=" + selected.branch_id);
      const sd = await sr.json();
      if (!sr.ok || !sd.shift)
        throw Error(sd.error || "Open your branch shift in POS first");
      const r = await fetch("/api/orders/" + selected.id + "/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId: sd.shift.id,
          method,
          cashAmount:
            method === "CASH"
              ? selected.total_amount
              : method === "SPLIT"
                ? Number(cash)
                : 0,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      toast.success("Payment recorded");
      setSelected(null);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      <header className="flex gap-4 items-center">
        <BrandLogo />
        <h1 className="text-2xl font-bold flex-1">Orders and bills</h1>
        <button className="btn-secondary" onClick={load}>
          Refresh
        </button>
      </header>
      <label className="block max-w-md">
        Search bill number or customer
        <input
          className="field"
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
      </label>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <label>
          From
          <input
            type="date"
            className="field"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <label>
          To
          <input
            type="date"
            className="field"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(0);
            }}
          />
        </label>
        {role === "admin" && (
          <label>
            Branch
            <select
              className="field"
              value={branch}
              onChange={(e) => {
                setBranch(e.target.value);
                setPage(0);
              }}
            >
              <option value="all">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Payment
          <select
            className="field"
            value={payment}
            onChange={(e) => {
              setPayment(e.target.value);
              setPage(0);
            }}
          >
            {["", "UNPAID", "PARTIAL", "PAID", "REFUNDED"].map((v) => (
              <option key={v} value={v}>
                {v || "All payments"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Order state
          <select
            className="field"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            {["", "PENDING", "COMPLETED", "CANCELLED"].map((v) => (
              <option key={v} value={v}>
                {v || "All states"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select
            className="field"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(0);
            }}
          >
            {["", "DINE_IN", "TAKEAWAY", "DELIVERY"].map((v) => (
              <option key={v} value={v}>
                {v ? getOrderTypeLabel(v) : "All types"}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        className="btn-secondary"
        onClick={() => {
          setFrom("");
          setTo("");
          setPage(0);
        }}
      >
        All dates
      </button>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <p>
        {loading
          ? "Loading..."
          : error
            ? "Orders unavailable"
            : count + " orders"}{" "}
        | Dates use Asia/Karachi
      </p>
      {!loading && !error && orders.length === 0 && (
        <p className="rounded-2xl border border-stone-200 bg-white p-6 text-stone-500">
          No orders match these filters. Try another date or payment status.
        </p>
      )}
      <div className="space-y-3">
        {!loading &&
          orders.map((o) => (
            <article
              key={o.id}
              className="bg-white border rounded-2xl p-4 flex flex-wrap gap-4 items-center"
            >
              <div className="flex-1 min-w-48">
                <strong>#{o.order_number}</strong>
                <p>
                  {o.branches?.name ||
                    branches.find((b) => b.id === o.branch_id)?.name ||
                    o.branch_id}
                </p>
                <p className="text-sm text-stone-500">
                  {formatDateTime(o.created_at)} |{" "}
                  {getOrderTypeLabel(o.order_type)}{" "}
                  {o.table_number ? " | Table " + o.table_number : ""}
                </p>
              </div>
              <div>
                <p>
                  {orderState(o)} | {o.payment_status}
                </p>
                <strong>{formatCurrency(o.total_amount)}</strong>
              </div>
              <button
                className="btn-secondary"
                onClick={() => {
                  setSelected(o);
                  setReason("");
                  setConfirmed(false);
                  setCash("");
                  setMethod("CASH");
                }}
              >
                Details / Reprint
              </button>
            </article>
          ))}
      </div>
      <div className="flex gap-4 items-center">
        <button
          className="btn-secondary"
          disabled={loading || !page}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <span>Page {page + 1}</span>
        <button
          className="btn-secondary"
          disabled={loading || (page + 1) * 50 >= count}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bill-title"
          className="responsive-dialog fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center"
        >
          <section className="max-w-xl w-full max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6 space-y-4">
            <div className="flex justify-between gap-3">
              <h2 id="bill-title" className="text-xl font-bold">
                Bill #{selected.order_number}
              </h2>
              <button
                className="btn-secondary"
                onClick={() => setSelected(null)}
              >
                Close
              </button>
            </div>
            <p>
              {selected.branches?.name} | {selected.payment_status} |{" "}
              {orderState(selected)}
            </p>
            <p>
              Cashier:{" "}
              {selected.payment_staff_name ||
                selected.staff_name ||
                "Not recorded (historical)"}
            </p>
            <p>
              {selected.customer_name} {selected.customer_phone}
            </p>
            {selected.delivery_address && (
              <p>Delivery: {selected.delivery_address}</p>
            )}
            <ul className="divide-y">
              {selected.order_items?.map((i) => (
                <li className="py-2" key={i.id}>
                  {i.quantity} x {i.item_name} - {formatCurrency(i.total_price)}
                  {i.notes && <p className="text-sm">{i.notes}</p>}
                </li>
              ))}
            </ul>
            <p>
              Subtotal: {formatCurrency(selected.subtotal)} | Discount:{" "}
              {selected.discount}
              {selected.discount_type === "PERCENT" ? "%" : " Rs."} | Tax:{" "}
              {formatCurrency(selected.tax)}
            </p>
            <p className="font-bold">
              Total: {formatCurrency(selected.total_amount)}
            </p>
            {selected.cancellation_reason && (
              <p>Cancellation reason: {selected.cancellation_reason}</p>
            )}
            <button
              className="btn-primary"
              onClick={() => {
                if (
                  !printReceipt(selected, selected.order_items || [], settings)
                )
                  toast.error("Allow popups to print this receipt");
              }}
            >
              Reprint receipt
            </button>
            <p className="text-xs text-stone-500">
              Uses the browser print dialog; printer readiness cannot be
              detected.
            </p>
            {selected.payment_status === "UNPAID" &&
              orderState(selected) !== "CANCELLED" && (
                <div className="border-t pt-4 space-y-3">
                  <h3 className="font-bold">Receive payment</h3>
                  <label>
                    Method
                    <select
                      className="field"
                      value={method}
                      onChange={(e) => {
                        setMethod(e.target.value);
                        setConfirmed(false);
                      }}
                    >
                      {["CASH", "JAZZCASH", "EASYPAISA", "SPLIT"].map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                  {["CASH", "SPLIT"].includes(method) && (
                    <label>
                      {method === "CASH"
                        ? "Cash received"
                        : "Cash portion (remaining amount is digital)"}
                      <input
                        className="field"
                        type="number"
                        min="0"
                        step="0.01"
                        value={cash}
                        onChange={(e) => setCash(e.target.value)}
                      />
                    </label>
                  )}
                  <label className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />{" "}
                    Payment received and verified
                  </label>
                  <button
                    className="btn-primary"
                    disabled={saving || !confirmed}
                    onClick={settle}
                  >
                    Record payment
                  </button>
                </div>
              )}
            {role === "admin" &&
              selected.payment_status === "UNPAID" &&
              orderState(selected) === "PENDING" && (
                <div className="border-t pt-4">
                  <label>
                    Cancellation reason
                    <textarea
                      className="field"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      minLength={3}
                    />
                  </label>
                  <button
                    className="btn-secondary mt-3"
                    disabled={saving || reason.trim().length < 3}
                    onClick={cancel}
                  >
                    Cancel unpaid order
                  </button>
                </div>
              )}
          </section>
        </div>
      )}
    </main>
  );
}
