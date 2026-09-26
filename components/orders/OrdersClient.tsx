"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, RefreshCw, Search } from "lucide-react";
import type { Order } from "@/lib/supabase";
import { formatCurrency, formatDateTime, getOrderStatusClasses, getOrderTypeClasses, getOrderTypeLabel, getPaymentMethodLabel } from "@/lib/utils";
import toast from "react-hot-toast";

interface OrdersClientProps {
  branchId: string;
  role: "branch" | "admin";
}

const FILTER_TABS = ["All", "Dine-In", "Takeaway", "Delivery", "Pending", "Completed", "Cancelled"];

export default function OrdersClient({ branchId, role }: OrdersClientProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (role !== "admin" && branchId) {
        params.set("branchId", branchId);
      }
      const r = await fetch(`/api/orders?${params}`);
      const d = await r.json();
      setOrders(d.orders || []);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [branchId, role]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filtered = orders.filter((o) => {
    if (activeFilter === "Dine-In")   return o.order_type === "DINE_IN";
    if (activeFilter === "Takeaway")  return o.order_type === "TAKEAWAY";
    if (activeFilter === "Delivery")  return o.order_type === "DELIVERY";
    if (activeFilter === "Pending")   return ["PENDING", "PREPARING", "READY"].includes(o.order_status);
    if (activeFilter === "Completed") return o.order_status === "COMPLETED";
    if (activeFilter === "Cancelled") return o.order_status === "CANCELLED";
    return true;
  }).filter((o) =>
    !search || o.order_number.toLowerCase().includes(search.toLowerCase()) ||
    (o.customer_name && o.customer_name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCancel = async (orderId: string) => {
    if (!confirm("Cancel this order?")) return;
    try {
      await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      toast.success("Order cancelled");
      fetchOrders();
    } catch {
      toast.error("Failed to cancel");
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "rgb(255 247 237)" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-6 py-4" style={{ borderColor: "rgb(254 215 170)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <a href="/pos" className="p-2 rounded-xl hover:bg-orange-50">
              <ArrowLeft className="w-5 h-5" style={{ color: "rgb(120 113 108)" }} />
            </a>
            <h1 className="font-bold text-xl" style={{ fontFamily: "Plus Jakarta Sans, sans-serif", color: "rgb(28 25 23)" }}>
              📋 Orders
            </h1>
            <span className="text-sm px-3 py-0.5 rounded-full" style={{ background: "rgb(255 237 213)", color: "rgb(234 88 12)" }}>
              {filtered.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgb(168 162 158)" }} />
              <input
                type="text"
                placeholder="Search orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
                style={{ border: "1px solid rgb(254 215 170)", width: "200px" }}
              />
            </div>
            <button onClick={fetchOrders} className="p-2 rounded-xl hover:bg-orange-50">
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} style={{ color: "rgb(120 113 108)" }} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: activeFilter === tab ? "rgb(249 115 22)" : "rgb(255 247 237)",
                color: activeFilter === tab ? "white" : "rgb(120 113 108)",
                fontFamily: "Plus Jakarta Sans, sans-serif",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📋</p>
            <p style={{ color: "rgb(120 113 108)" }}>No orders found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl p-4 border flex items-center justify-between gap-4"
                style={{ borderColor: "rgb(254 215 170)" }}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="font-mono text-sm font-bold" style={{ fontFamily: "JetBrains Mono, monospace", color: "rgb(249 115 22)", minWidth: "100px" }}>
                    #{order.order_number.split("-").slice(-1)[0]}
                  </div>

                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${getOrderTypeClasses(order.order_type)}`}>
                    {getOrderTypeLabel(order.order_type)}
                    {order.table_number ? ` T${order.table_number}` : ""}
                    {order.customer_name ? ` · ${order.customer_name}` : ""}
                  </span>

                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${getOrderStatusClasses(order.order_status)}`}>
                    {order.order_status}
                  </span>

                  <div className="text-xs flex-shrink-0" style={{ color: "rgb(168 162 158)" }}>
                    {formatDateTime(order.created_at)}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold font-mono text-base" style={{ fontFamily: "JetBrains Mono, monospace", color: "rgb(28 25 23)" }}>
                      {formatCurrency(order.total_amount)}
                    </div>
                    <div className="text-xs" style={{ color: "rgb(168 162 158)" }}>
                      {getPaymentMethodLabel(order.payment_method)}
                    </div>
                  </div>

                  {order.order_status !== "CANCELLED" && order.order_status !== "COMPLETED" && (
                    <button
                      onClick={() => handleCancel(order.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: "rgb(254 242 242)", color: "rgb(185 28 28)" }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
