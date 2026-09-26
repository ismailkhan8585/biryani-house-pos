"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle } from "lucide-react";
import { useCartStore } from "@/stores/pos-cart";
import { useConnectionStore } from "@/stores/pos-connection";
import { useShiftStore } from "@/stores/pos-shift";
import { formatCurrency, generateOrderNumber } from "@/lib/utils";
import { saveOfflineOrder } from "@/lib/pos-db-local";
import toast from "react-hot-toast";
import { generateReceiptHTML } from "@/lib/receipt";
import type { Order, OrderItem } from "@/lib/supabase";

interface PaymentModalProps {
  onClose: () => void;
  onComplete: (order: Order | Record<string, unknown>) => void;
  shiftId?: string;
  branchId: string;
}

type PaymentMethod = "CASH" | "JAZZCASH" | "EASYPAISA" | "SPLIT";

export default function PaymentModal({ onClose, onComplete, shiftId, branchId }: PaymentModalProps) {
  const cart = useCartStore();
  const isOnline = useConnectionStore((s) => s.isOnline);
  const addSale = useShiftStore((s) => s.addSale);

  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [cashReceived, setCashReceived] = useState("");
  const [digitalConfirmed, setDigitalConfirmed] = useState(false);
  const [splitCash, setSplitCash] = useState("");
  const [splitDigital, setSplitDigital] = useState("");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({ jazzcash_number: "0300-0000000", easypaisa_number: "0300-0000000" });

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d.settings) setSettings(d.settings);
    }).catch(() => {});
  }, []);

  const change = method === "CASH" ? Math.max(0, parseFloat(cashReceived || "0") - cart.total) : 0;
  const canComplete =
    method === "CASH"
      ? parseFloat(cashReceived || "0") >= cart.total
      : method === "SPLIT"
      ? parseFloat(splitCash || "0") + parseFloat(splitDigital || "0") >= cart.total
      : digitalConfirmed;

  const handleComplete = async () => {
    if (!canComplete) {
      toast.error("Please complete payment details");
      return;
    }
    if (cart.items.length === 0) {
      toast.error("No items in order");
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        order_number: generateOrderNumber(),
        branch_id: branchId,
        order_type: cart.orderType,
        table_id: cart.tableId,
        table_number: cart.tableNumber,
        customer_name: cart.customerName || null,
        customer_phone: cart.customerPhone || null,
        delivery_address: cart.deliveryAddress || null,
        subtotal: cart.subtotal,
        discount: cart.discount,
        discount_type: cart.discountType,
        tax: cart.taxAmount,
        total_amount: cart.total,
        payment_method: method,
        payment_status: "PAID",
        order_status: "COMPLETED",
        offline_order_id: cart.offlineOrderId,
        shift_id: shiftId || null,
        sale_source: isOnline ? "ONLINE" : "OFFLINE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      };

      const orderItems = cart.items.map((i) => ({
        id: crypto.randomUUID(),
        order_id: "",
        menu_item_id: i.menuItemId,
        item_name: i.name,
        item_name_ur: i.nameUr,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        total_price: i.unitPrice * i.quantity,
        notes: i.notes || null,
        status: "SERVED" as const,
      }));

      if (isOnline) {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cart.items.map((i) => ({
              menuItemId: i.menuItemId,
              name: i.name,
              nameUr: i.nameUr,
              unitPrice: i.unitPrice,
              quantity: i.quantity,
              notes: i.notes,
            })),
            orderType: cart.orderType,
            tableId: cart.tableId,
            tableNumber: cart.tableNumber,
            customerName: cart.customerName,
            customerPhone: cart.customerPhone,
            deliveryAddress: cart.deliveryAddress,
            subtotal: cart.subtotal,
            discount: cart.discount,
            discountType: cart.discountType,
            tax: cart.taxAmount,
            totalAmount: cart.total,
            paymentMethod: method,
            shiftId,
            offlineOrderId: cart.offlineOrderId,
          }),
        });

        if (!res.ok) throw new Error("Failed to create order");
        const { order } = await res.json();

        // Update status to COMPLETED
        await fetch(`/api/orders/${order.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "COMPLETED",
            paymentMethod: method,
            paymentStatus: "PAID",
          }),
        });

        // Print receipt
        printReceipt({ ...order, branches: { name: "" } } as Order, orderItems, method === "CASH" ? parseFloat(cashReceived) : undefined);
        addSale(cart.total);
        cart.newOrder();
        toast.success("Order completed! 🎉");
        onComplete(order);
      } else {
        // Save offline
        const offlineOrder = { ...orderData, id: crypto.randomUUID(), kot_printed: false, receipt_printed: false, notes: null } as Order;
        await saveOfflineOrder(offlineOrder, orderItems.map(i => ({ ...i, order_id: offlineOrder.id })));
        printReceipt(offlineOrder, orderItems, method === "CASH" ? parseFloat(cashReceived) : undefined);
        addSale(cart.total);
        cart.newOrder();
        toast.success("Order saved (offline) — will sync when online");
        onComplete(offlineOrder);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to complete order");
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = (order: Order, items: OrderItem[], cashRec?: number) => {
    const html = generateReceiptHTML(order, items, settings as Record<string, string>, cashRec);
    const w = window.open("", "_blank", "width=350,height=700");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
      w.close();
    }
  };

  const paymentCards: { method: PaymentMethod; label: string; emoji: string; sub?: string }[] = [
    { method: "CASH", label: "Cash", emoji: "💵" },
    { method: "JAZZCASH", label: "JazzCash", emoji: "📱", sub: settings.jazzcash_number },
    { method: "EASYPAISA", label: "EasyPaisa", emoji: "📱", sub: settings.easypaisa_number },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgb(0 0 0 / 0.5)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        style={{ background: "white", border: "1px solid rgb(254 215 170)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgb(254 215 170)" }}>
          <h2 className="text-lg font-bold" style={{ fontFamily: "Plus Jakarta Sans, sans-serif", color: "rgb(28 25 23)" }}>
            💳 Payment
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-orange-50">
            <X className="w-5 h-5" style={{ color: "rgb(120 113 108)" }} />
          </button>
        </div>

        {/* Order Summary */}
        <div className="px-6 py-4 border-b" style={{ borderColor: "rgb(254 215 170)", background: "rgb(255 253 248)" }}>
          <div className="space-y-1">
            {cart.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span style={{ color: "rgb(120 113 108)" }}>{item.name} ×{item.quantity}</span>
                <span className="font-mono" style={{ fontFamily: "JetBrains Mono, monospace", color: "rgb(28 25 23)" }}>
                  {formatCurrency(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
            {cart.discountAmount > 0 && (
              <div className="flex justify-between text-sm" style={{ color: "rgb(21 128 61)" }}>
                <span>Discount</span>
                <span className="font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>-{formatCurrency(cart.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: "rgb(254 215 170)" }}>
              <span className="font-bold" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>TOTAL</span>
              <span className="text-2xl font-bold font-mono" style={{ fontFamily: "JetBrains Mono, monospace", color: "rgb(249 115 22)" }}>
                {formatCurrency(cart.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Method Cards */}
        <div className="px-6 py-4">
          <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "rgb(168 162 158)" }}>
            Payment Method
          </p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {paymentCards.map((card) => {
              const active = method === card.method;
              return (
                <button
                  key={card.method}
                  onClick={() => setMethod(card.method)}
                  className="flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center"
                  style={{
                    borderColor: active ? "rgb(249 115 22)" : "rgb(254 215 170)",
                    background: active ? "rgb(255 237 213)" : "white",
                    boxShadow: active ? "0 0 0 3px rgb(249 115 22 / 0.15)" : "none",
                  }}
                >
                  <span className="text-xl mb-1">{card.emoji}</span>
                  <span className="text-xs font-bold" style={{ fontFamily: "Plus Jakarta Sans, sans-serif", color: active ? "rgb(234 88 12)" : "rgb(28 25 23)" }}>
                    {card.label}
                  </span>
                  {card.sub && <span className="text-xs mt-0.5" style={{ color: "rgb(168 162 158)" }}>{card.sub}</span>}
                </button>
              );
            })}
          </div>

          {/* Split option */}
          <button
            onClick={() => setMethod("SPLIT")}
            className="w-full py-2 rounded-xl text-xs font-semibold border-2 transition-all mb-4"
            style={{
              borderColor: method === "SPLIT" ? "rgb(249 115 22)" : "rgb(254 215 170)",
              background: method === "SPLIT" ? "rgb(255 237 213)" : "transparent",
              color: method === "SPLIT" ? "rgb(234 88 12)" : "rgb(120 113 108)",
            }}
          >
            🔀 Split Payment (Cash + Digital)
          </button>

          {/* Cash amount input */}
          {method === "CASH" && (
            <div className="space-y-2">
              <div>
                <label className="text-xs font-semibold" style={{ color: "rgb(120 113 108)" }}>Cash Received</label>
                <input
                  type="number"
                  placeholder={`Min: ${formatCurrency(cart.total)}`}
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border-2 text-lg font-bold outline-none font-mono"
                  style={{
                    borderColor: "rgb(254 215 170)",
                    fontFamily: "JetBrains Mono, monospace",
                    color: "rgb(28 25 23)",
                  }}
                  autoFocus
                />
              </div>
              {parseFloat(cashReceived) >= cart.total && change >= 0 && (
                <div
                  className="flex justify-between items-center px-3 py-2 rounded-xl"
                  style={{ background: "rgb(255 251 235)", border: "1px solid rgb(253 230 138)" }}
                >
                  <span className="text-sm font-bold" style={{ color: "rgb(120 53 15)" }}>Change</span>
                  <span className="text-xl font-bold font-mono" style={{ fontFamily: "JetBrains Mono, monospace", color: "rgb(180 83 9)" }}>
                    {formatCurrency(change)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Digital confirm */}
          {(method === "JAZZCASH" || method === "EASYPAISA") && (
            <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer" style={{ borderColor: "rgb(254 215 170)", background: "rgb(255 253 248)" }}>
              <input
                type="checkbox"
                checked={digitalConfirmed}
                onChange={(e) => setDigitalConfirmed(e.target.checked)}
                className="w-5 h-5 accent-orange-500"
              />
              <span className="text-sm" style={{ color: "rgb(28 25 23)" }}>
                ☑ Payment received — Rs.{cart.total.toLocaleString()} via {method === "JAZZCASH" ? "JazzCash" : "EasyPaisa"}
              </span>
            </label>
          )}

          {/* Split inputs */}
          {method === "SPLIT" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-stone-500">Cash</label>
                <input type="number" value={splitCash} onChange={(e) => setSplitCash(e.target.value)}
                  placeholder="Rs. 0" className="w-full mt-1 px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ borderColor: "rgb(254 215 170)" }} />
              </div>
              <div>
                <label className="text-xs text-stone-500">Digital</label>
                <input type="number" value={splitDigital} onChange={(e) => setSplitDigital(e.target.value)}
                  placeholder="Rs. 0" className="w-full mt-1 px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ borderColor: "rgb(254 215 170)" }} />
              </div>
            </div>
          )}
        </div>

        {/* Complete Button */}
        <div className="px-6 pb-6">
          <button
            onClick={handleComplete}
            disabled={!canComplete || loading}
            className="w-full py-4 rounded-2xl text-white text-base font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            style={{
              fontFamily: "Plus Jakarta Sans, sans-serif",
              background: canComplete ? "linear-gradient(135deg, rgb(249 115 22), rgb(234 88 12))" : "rgb(254 215 170)",
              boxShadow: canComplete ? "0 4px 16px rgb(249 115 22 / 0.4)" : "none",
            }}
          >
            {loading ? (
              <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
            ) : (
              <><CheckCircle className="w-5 h-5" /> Complete Order — {formatCurrency(cart.total)}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
