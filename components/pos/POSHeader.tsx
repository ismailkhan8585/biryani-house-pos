"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, LogOut } from "lucide-react";
import ConnectionBadge from "./ConnectionBadge";
import { useShiftStore } from "@/stores/pos-shift";
import { useCartStore } from "@/stores/pos-cart";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

interface POSHeaderProps {
  branchName: string;
  role: "branch" | "admin";
}

export default function POSHeader({ branchName, role }: POSHeaderProps) {
  const router       = useRouter();
  const currentShift = useShiftStore((s) => s.currentShift);
  const total        = useCartStore((s) => s.total);
  const itemCount    = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  const [time, setTime]     = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { useMenuStore } = await import("@/stores/pos-menu");
      await useMenuStore.getState().fetchMenu();
      toast.success("Menu synced!");
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header style={{
      height: 56,
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "0 16px",
      background: "#fff",
      borderBottom: "1px solid var(--border-muted)",
      flexShrink: 0,
    }}>

      {/* Branch name */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: "auto" }}>
        <span style={{
          padding: "4px 10px",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          background: "var(--brand-100)",
          color: "var(--brand-700)",
          letterSpacing: "0.01em",
        }}>
          {branchName}
        </span>
        {role === "admin" && (
          <span style={{
            padding: "3px 8px",
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 700,
            background: "#f3e8ff",
            color: "#6b21a8",
            letterSpacing: "0.03em",
            textTransform: "uppercase",
          }}>
            Admin
          </span>
        )}

        {/* Shift timer */}
        {currentShift && (
          <span suppressHydrationWarning style={{
            padding: "3px 8px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            background: "var(--stone-100)",
            color: "var(--stone-500)",
            fontFamily: "var(--font-mono)",
          }}>
            ⏱ {formatDistanceToNow(new Date(currentShift.openedAt))}
          </span>
        )}
      </div>

      {/* Cart summary (quick glance) */}
      {itemCount > 0 && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 12px",
          borderRadius: 10,
          background: "var(--brand-50)",
          border: "1px solid var(--brand-200)",
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--stone-500)" }}>
            {itemCount} item{itemCount > 1 ? "s" : ""}
          </span>
          <span style={{ width: 1, height: 12, background: "var(--brand-200)" }} />
          <span style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--brand-600)",
            fontFamily: "var(--font-mono)",
          }}>
            Rs.{total.toLocaleString()}
          </span>
        </div>
      )}

      {/* Connection status */}
      <ConnectionBadge />

      {/* Clock */}
      {time !== null && (
        <span suppressHydrationWarning style={{
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "var(--font-mono)",
          color: "var(--stone-700)",
          letterSpacing: "0.05em",
          minWidth: 52,
          textAlign: "center",
        }}>
          {time}
        </span>
      )}

      {/* Divider */}
      <span style={{ width: 1, height: 22, background: "var(--border-muted)", margin: "0 2px" }} />

      {/* Sync */}
      <button onClick={handleSync} disabled={syncing} title="Sync menu"
        style={{
          width: 34, height: 34, borderRadius: 9,
          border: "1px solid var(--border-soft)",
          background: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--brand-50)"; e.currentTarget.style.borderColor = "var(--brand-300)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "var(--border-soft)"; }}
      >
        <RefreshCw size={14} color="var(--stone-500)" className={syncing ? "spin" : ""} />
      </button>

      {/* Logout */}
      <button onClick={handleLogout} title="Logout"
        style={{
          width: 34, height: 34, borderRadius: 9,
          border: "1px solid var(--border-soft)",
          background: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#fff1f2"; e.currentTarget.style.borderColor = "#fecdd3"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "var(--border-soft)"; }}
      >
        <LogOut size={14} color="#dc2626" />
      </button>
    </header>
  );
}
