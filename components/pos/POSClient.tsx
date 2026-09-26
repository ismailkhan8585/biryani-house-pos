"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import POSHeader from "./POSHeader";
import OrderTypeSelector from "./OrderTypeSelector";
import CategoryTabs from "./CategoryTabs";
import MenuGrid from "./MenuGrid";
import OrderPanel from "./OrderPanel";
import TableSelector from "./TableSelector";
import PaymentModal from "./PaymentModal";
import ShiftModal from "./ShiftModal";
import ConnectionBanner from "./ConnectionBanner";
import { useMenuStore } from "@/stores/pos-menu";
import { useCartStore } from "@/stores/pos-cart";
import { useShiftStore } from "@/stores/pos-shift";
import { useBranchStore } from "@/stores/pos-branch";
import { useConnectionStore } from "@/stores/pos-connection";
import { startAutoSync } from "@/lib/pos-sync";
import type { Order } from "@/lib/supabase";
import {
  LayoutGrid, FileText, ChefHat, BarChart2, Settings,
  UtensilsCrossed,
} from "lucide-react";

interface POSClientProps {
  branchId: string;
  branchName: string;
  role: "branch" | "admin";
}

const NAV = [
  { href: "/pos",     icon: LayoutGrid, label: "POS" },
  { href: "/tables",  icon: LayoutGrid, label: "Tables", icon2: true },
  { href: "/orders",  icon: FileText,   label: "Orders" },
  { href: "/kitchen", icon: ChefHat,    label: "Kitchen" },
  { href: "/reports", icon: BarChart2,  label: "Reports" },
];

export default function POSClient({ branchId, branchName, role }: POSClientProps) {
  const fetchMenu   = useMenuStore((s) => s.fetchMenu);
  const setBranch   = useBranchStore((s) => s.setBranch);
  const currentShift = useShiftStore((s) => s.currentShift);
  const { setOnline } = useConnectionStore();
  const pathname = usePathname();

  const [showTableSelector, setShowTableSelector] = useState(false);
  const [showPaymentModal,  setShowPaymentModal]  = useState(false);
  const [showShiftModal,    setShowShiftModal]    = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [completedOrder, setCompletedOrder] = useState<Order | Record<string, unknown> | null>(null);

  const orderType    = useCartStore((s) => s.orderType);
  const setOrderType = useCartStore((s) => s.setOrderType);
  const cartCount    = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  useEffect(() => {
    setBranch({ id: branchId, name: branchName, color: "#F97316", role });
    fetchMenu();

    if (!currentShift) setShowShiftModal(true);

    const handleOnline  = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    const stopSync = startAutoSync(() => {});

    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
      stopSync();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOrderTypeChange = (type: "DINE_IN" | "TAKEAWAY" | "DELIVERY") => {
    setOrderType(type);
    if (type === "DINE_IN") setShowTableSelector(true);
  };

  const navItems = [
    ...NAV.filter((n) => n.href !== "/tables" || true),
    ...(role === "admin" ? [{ href: "/admin", icon: Settings, label: "Admin" }] : []),
  ];

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--surface)" }}>

      {/* ── Sidebar ─────────────────────────── */}
      <nav className="pos-sidebar no-print">
        {/* Logo */}
        <div style={{
          width: 44, height: 44,
          borderRadius: 12,
          background: "linear-gradient(135deg, var(--brand-500), var(--brand-700))",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 12,
          boxShadow: "var(--shadow-brand)",
          flexShrink: 0,
        }}>
          <UtensilsCrossed size={20} color="#fff" />
        </div>

        {/* Nav Links */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href === "/pos" && pathname?.startsWith("/pos"));
            const isPOS = href === "/pos";
            return (
              <Link key={href} href={href} className={`sidebar-icon-btn ${active ? "active" : ""}`}
                style={{ position: "relative" }}>
                <Icon size={18} />
                <span style={{ fontSize: 9, letterSpacing: "0.02em" }}>{label}</span>
                {/* Cart badge on POS icon */}
                {isPOS && cartCount > 0 && (
                  <span style={{
                    position: "absolute", top: 6, right: 6,
                    background: "var(--brand-500)",
                    color: "#fff",
                    fontSize: 9, fontWeight: 700,
                    width: 16, height: 16,
                    borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 0 0 2px var(--sidebar-bg)",
                  }}>
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Main Area ───────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Offline Banner */}
        <ConnectionBanner />

        {/* Top Header */}
        <POSHeader branchName={branchName} role={role} />

        {/* Body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* LEFT — Menu (58%) */}
          <div style={{ flex: "0 0 58%", display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid var(--border-muted)" }}>

            {/* Order type + search bar row */}
            <div style={{ padding: "12px 16px 8px", borderBottom: "1px solid var(--border-muted)", background: "#fff" }}>
              <OrderTypeSelector value={orderType} onChange={handleOrderTypeChange} />
            </div>

            {/* Category Tabs */}
            <div style={{ padding: "10px 16px 0", background: "#fff", borderBottom: "1px solid var(--border-muted)" }}>
              <CategoryTabs />
            </div>

            {/* Menu Grid */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 16px", background: "var(--surface)" }}>
              <MenuGrid />
            </div>
          </div>

          {/* RIGHT — Order Panel (42%) */}
          <div style={{ flex: "0 0 42%", display: "flex", flexDirection: "column", overflow: "hidden", background: "#fff" }}>
            <OrderPanel
              onPayNow={() => setShowPaymentModal(true)}
              shiftId={currentShift?.id}
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

      {showPaymentModal && (
        <PaymentModal
          onClose={() => setShowPaymentModal(false)}
          onComplete={(order) => {
            setCompletedOrder(order);
            setShowPaymentModal(false);
          }}
          shiftId={currentShift?.id}
          branchId={branchId}
        />
      )}

      {showShiftModal && (
        <ShiftModal
          branchId={branchId}
          onClose={() => setShowShiftModal(false)}
        />
      )}
    </div>
  );
}
