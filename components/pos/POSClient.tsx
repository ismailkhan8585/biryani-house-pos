"use client";

import { useEffect, useState } from "react";
import POSHeader from "./POSHeader";
import OrderTypeSelector from "./OrderTypeSelector";
import CategoryTabs from "./CategoryTabs";
import MenuGrid from "./MenuGrid";
import OrderPanel from "./OrderPanel";
import TableSelector from "./TableSelector";
import PaymentModal from "./PaymentModal";
import ShiftModal from "./ShiftModal";
import ConnectionBanner from "./ConnectionBanner";
import OfflineReadiness from "./OfflineReadiness";
import PendingSales from "./PendingSales";
import { useMenuStore } from "@/stores/pos-menu";
import { useCartStore } from "@/stores/pos-cart";
import { useShiftStore } from "@/stores/pos-shift";
import { useBranchStore } from "@/stores/pos-branch";
import { useConnectionStore } from "@/stores/pos-connection";
import { startAutoSync } from "@/lib/pos-sync";
import { refreshBillingSettings } from "@/lib/billing-settings";
import toast from "react-hot-toast";
import type { Order } from "@/lib/supabase";

interface POSClientProps {
  branchId: string;
  branchName: string;
  role: "branch" | "admin";
  staffId: string;
  staffName: string;
  sessionExpires: number;
}

export default function POSClient({
  branchId,
  branchName,
  role,
  staffId,
  staffName,
  sessionExpires,
}: POSClientProps) {
  const fetchMenu = useMenuStore((s) => s.fetchMenu);
  const setBranch = useBranchStore((s) => s.setBranch);
  const currentShift = useShiftStore((s) => s.currentShift);
  const { setOnline } = useConnectionStore();

  const [shiftChecked, setShiftChecked] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  useEffect(() => {
    const check = () => setSessionExpired(Date.now() >= sessionExpires);
    check();
    const timer = window.setInterval(check, 10000);
    return () => window.clearInterval(timer);
  }, [sessionExpires]);
  const [showTableSelector, setShowTableSelector] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [completedOrder, setCompletedOrder] = useState<
    Order | Record<string, unknown> | null
  >(null);

  const orderType = useCartStore((s) => s.orderType);
  const setOrderType = useCartStore((s) => s.setOrderType);

  useEffect(() => {
    setBranch({ id: branchId, name: branchName, color: "#F97316", role });
    const context = staffId + ":" + branchId;
    if (localStorage.getItem("cart-context") !== context)
      useCartStore.getState().newOrder();
    localStorage.setItem("cart-context", context);
    fetchMenu();
    void refreshBillingSettings().catch(() => {
      if (navigator.onLine)
        toast.error(
          "Could not refresh billing settings. Reconnect and sync before payment.",
        );
    });

    // Read directly from store (bypasses React closure) so we get the
    // already-hydrated value from localStorage, not the SSR default (null).
    const saved = useShiftStore.getState().currentShift;
    if (saved && (saved.branchId !== branchId || saved.staffId !== staffId))
      useShiftStore.getState().clearShift();
    fetch("/api/shifts?branchId=" + branchId)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          useShiftStore.getState().clearShift();
          return;
        }
        setShiftChecked(true);
        const s = d.shift;
        if (!s) {
          useShiftStore.getState().clearShift();
          return;
        }
        useShiftStore.getState().setShift({
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
      })
      .catch(() => {
        if (saved?.branchId === branchId && saved.staffId === staffId)
          setShiftChecked(true);
      });

    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    const stopSync = startAutoSync(() => {});

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      stopSync();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOrderTypeChange = (type: "DINE_IN" | "TAKEAWAY" | "DELIVERY") => {
    setOrderType(type);
    if (type === "DINE_IN") setShowTableSelector(true);
  };

  const validShift =
    !sessionExpired &&
    shiftChecked &&
    !!currentShift &&
    currentShift.branchId === branchId &&
    currentShift.staffId === staffId;

  return (
    <div
      className="pos-shell"
      style={{
        display: "flex",
        height: "calc(100dvh - 56px)",
        overflow: "hidden",
        background: "var(--surface)",
      }}
    >
      {/* ── Sidebar ─────────────────────────── */}

      {/* ── Main Area ───────────────────────── */}
      <div
        className="pos-main"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Offline Banner */}
        <ConnectionBanner />
        <OfflineReadiness staffId={staffId} branchId={branchId} />
        <PendingSales staffId={staffId} branchId={branchId} />

        {/* Top Header */}
        <POSHeader
          branchName={branchName}
          role={role}
          staffName={staffName}
          onShift={() => setShowShiftModal(true)}
        />
        {!validShift && (
          <div className="p-3 bg-amber-50 text-amber-900 text-sm">
            {sessionExpired
              ? "Session expired. Reconnect and sign in again before accepting payments. Saved sales are retained."
              : "Open a shift to accept payments. You can browse or leave this screen without opening one."}
          </div>
        )}

        {/* Body */}
        <div
          className="pos-body"
          style={{ flex: 1, display: "flex", overflow: "hidden" }}
        >
          {/* LEFT — Menu (58%) */}
          <div
            style={{
              flex: "0 0 58%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderRight: "1px solid var(--border-muted)",
            }}
          >
            {/* Order type + search bar row */}
            <div
              style={{
                padding: "12px 16px 8px",
                borderBottom: "1px solid var(--border-muted)",
                background: "#fff",
              }}
            >
              <OrderTypeSelector
                value={orderType}
                onChange={handleOrderTypeChange}
              />
            </div>

            {/* Category Tabs */}
            <div
              style={{
                padding: "10px 16px 0",
                background: "#fff",
                borderBottom: "1px solid var(--border-muted)",
              }}
            >
              <CategoryTabs />
            </div>

            {/* Menu Grid */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "12px 16px 16px",
                background: "var(--surface)",
              }}
            >
              <MenuGrid />
            </div>
          </div>

          {/* RIGHT — Order Panel (42%) */}
          <div
            style={{
              flex: "0 0 42%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              background: "#fff",
            }}
          >
            <OrderPanel
              onPayNow={() => validShift && setShowPaymentModal(true)}
              canSell={validShift}
            />
          </div>
        </div>
      </div>

      {/* ── Modals ──────────────────────────── */}
      {showTableSelector && (
        <TableSelector
          branchId={branchId}
          onClose={() => setShowTableSelector(false)}
          onSelect={(tableId, tableNumber) => {
            useCartStore.getState().setTable(tableId, tableNumber);
            setShowTableSelector(false);
          }}
        />
      )}

      {showPaymentModal && validShift && (
        <PaymentModal
          onClose={() => setShowPaymentModal(false)}
          onComplete={(order) => {
            setCompletedOrder(order);
            setShowPaymentModal(false);
          }}
          shiftId={currentShift?.id}
          branchId={branchId}
          staffId={staffId}
          staffName={staffName}
          sessionExpires={sessionExpires}
        />
      )}

      {showShiftModal && (
        <ShiftModal
          branchId={branchId}
          staffName={staffName}
          onClose={() => setShowShiftModal(false)}
          onSaved={() => setShiftChecked(true)}
        />
      )}
    </div>
  );
}
