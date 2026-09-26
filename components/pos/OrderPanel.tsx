"use client";

import { useCartStore } from "@/stores/pos-cart";
import OrderItem from "./OrderItem";
import DiscountInput from "./DiscountInput";
import CustomerInput from "./CustomerInput";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart, CreditCard, Trash2, Printer } from "lucide-react";
import toast from "react-hot-toast";
import { generateKOTHTML } from "@/lib/receipt";

interface OrderPanelProps {
  onPayNow: () => void;
  shiftId?: string;
}

export default function OrderPanel({ onPayNow, shiftId }: OrderPanelProps) {
  const {
    items, orderType, tableNumber,
    subtotal, discountAmount, taxAmount, total,
    orderNumber, clearCart,
  } = useCartStore();

  const isEmpty = items.length === 0;

  const handleKOT = async () => {
    if (isEmpty) { toast.error("Add items first"); return; }
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            menuItemId: i.menuItemId, name: i.name, nameUr: i.nameUr,
            unitPrice: i.unitPrice, quantity: i.quantity, notes: i.notes,
          })),
          orderType, tableNumber,
          customerName: useCartStore.getState().customerName,
          subtotal,
          discount: useCartStore.getState().discount,
          discountType: useCartStore.getState().discountType,
          totalAmount: total,
          shiftId,
        }),
      });
      if (res.ok) {
        const { order } = await res.json();
        const kotHtml = generateKOTHTML(order, order.order_items || []);
        const w = window.open("", "_blank", "width=350,height=600");
        if (w) { w.document.write(kotHtml); w.document.close(); w.focus(); w.print(); w.close(); }
        toast.success("KOT sent!");
      }
    } catch { toast.error("KOT failed"); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ── Order Header ─────────────────── */}
      <div style={{
        padding: "12px 16px 10px",
        borderBottom: "1px solid var(--border-muted)",
        background: "#fff",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span suppressHydrationWarning style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--brand-500)",
            }}>
              #{orderNumber.split("-").slice(-1)[0]}
            </span>

            {/* Order type badge */}
            {orderType === "DINE_IN" && tableNumber && (
              <span className="badge badge-green">🪑 Table {tableNumber}</span>
            )}
            {orderType === "TAKEAWAY" && (
              <span className="badge badge-blue">🥡 Takeaway</span>
            )}
            {orderType === "DELIVERY" && (
              <span className="badge badge-purple">🛵 Delivery</span>
            )}
          </div>

          <button
            onClick={clearCart}
            title="Clear order"
            style={{
              width: 30, height: 30, borderRadius: 8,
              border: "1px solid var(--border-soft)",
              background: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#fff1f2"; e.currentTarget.style.borderColor = "#fecdd3"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "var(--border-soft)"; }}
          >
            <Trash2 size={13} color="#dc2626" />
          </button>
        </div>
      </div>

      {/* Delivery customer info */}
      {orderType === "DELIVERY" && (
        <div style={{ padding: "10px 16px 0", flexShrink: 0 }}>
          <CustomerInput />
        </div>
      )}

      {/* ── Items List ───────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
        {isEmpty ? (
          <div style={{
            flex: 1,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            textAlign: "center", padding: "40px 20px",
            color: "var(--stone-400)",
          }}>
            <ShoppingCart size={40} strokeWidth={1.2} style={{ marginBottom: 12, opacity: 0.5 }} />
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Order is empty</div>
            <div style={{ fontSize: 11, color: "var(--stone-400)" }}>Tap menu items to add</div>
          </div>
        ) : (
          items.map((item) => (
            <OrderItem key={item.id} cartItem={item} />
          ))
        )}
      </div>

      {/* ── Discount (only if items) ─────── */}
      {!isEmpty && (
        <div style={{ padding: "4px 12px", flexShrink: 0 }}>
          <DiscountInput />
        </div>
      )}

      {/* ── Totals ──────────────────────── */}
      <div style={{
        padding: "12px 16px",
        borderTop: "1px solid var(--border-muted)",
        background: "#fffdf9",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--stone-500)" }}>
            <span>Subtotal</span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--success)" }}>
              <span>Discount</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>−{formatCurrency(discountAmount)}</span>
            </div>
          )}
          {taxAmount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--stone-500)" }}>
              <span>Tax</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{formatCurrency(taxAmount)}</span>
            </div>
          )}

          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            paddingTop: 10, borderTop: "1px solid var(--border-muted)",
          }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "var(--stone-800)" }}>TOTAL</span>
            <span style={{
              fontSize: 22, fontWeight: 800,
              fontFamily: "var(--font-mono)",
              color: "var(--brand-500)",
              letterSpacing: "-0.02em",
            }}>
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Action Buttons ───────────────── */}
      <div style={{ padding: "10px 12px 14px", display: "flex", gap: 8, flexShrink: 0 }}>
        {/* KOT */}
        <button
          onClick={handleKOT}
          disabled={isEmpty}
          style={{
            flex: "0 0 auto",
            width: 52,
            height: 48,
            borderRadius: 12,
            border: "1.5px solid var(--border-soft)",
            background: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: isEmpty ? "not-allowed" : "pointer",
            opacity: isEmpty ? 0.4 : 1,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => !isEmpty && (e.currentTarget.style.background = "var(--brand-50)", e.currentTarget.style.borderColor = "var(--brand-300)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff", e.currentTarget.style.borderColor = "var(--border-soft)")}
          title="Print KOT"
        >
          <Printer size={16} color={isEmpty ? "var(--stone-400)" : "var(--brand-500)"} />
        </button>

        {/* Pay Now */}
        <button
          onClick={onPayNow}
          disabled={isEmpty}
          className="btn-primary"
          style={{
            flex: 1,
            height: 48,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            fontSize: 14,
          }}
        >
          <CreditCard size={16} />
          <span>Pay {!isEmpty ? formatCurrency(total) : "Now"}</span>
        </button>
      </div>
    </div>
  );
}
