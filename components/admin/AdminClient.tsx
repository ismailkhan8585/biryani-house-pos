"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { businessDate, summarizeOrders } from "@/lib/operations";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/stores/pos-cart";
import { useShiftStore } from "@/stores/pos-shift";
type Stats = ReturnType<typeof summarizeOrders>;
export default function AdminClient() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [branches, setBranches] = useState<
    { id: string; name: string; address: string; color: string }[]
  >([]);
  const [rows, setRows] = useState<(Stats & { id: string })[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const day = businessDate();
      const responses = await Promise.all([
        fetch("/api/branches"),
        fetch(
          "/api/reports?allBranches=true&dateFrom=" + day + "&dateTo=" + day,
        ),
      ]);
      const [b, r] = await Promise.all(responses.map((r) => r.json()));
      if (responses.some((r) => !r.ok)) throw Error(r.error || b.error);
      setBranches(b.branches);
      setStats(r.stats);
      setRows(r.branchStats);
    } catch (e) {
      setStats(null);
      setRows([]);
      setError(e instanceof Error ? e.message : "Dashboard unavailable");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function open(id: string) {
    if (opening) return;
    setOpening(id);
    setError("");
    try {
      const r = await fetch("/api/auth/branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: id }),
      });
      if (r.ok) {
        useCartStore.getState().newOrder();
        useShiftStore.getState().clearShift();
        router.push("/pos");
        router.refresh();
      } else throw Error((await r.json()).error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot open branch");
      setOpening(null);
    }
  }
  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      <header className="flex flex-wrap gap-4 items-center">
        <BrandLogo size={64} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Branch operations</h1>
          <p className="text-stone-500">Today | Asia/Karachi | All branches</p>
        </div>
        <button className="btn-secondary" onClick={load} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
        <button
          className="btn-secondary"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            useShiftStore.getState().clearShift();
            useCartStore.getState().newOrder();
            router.push("/login");
            router.refresh();
          }}
        >
          Sign out
        </button>
      </header>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {loading && <p role="status">Loading branch activity...</p>}
      {stats && !loading && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              ["Paid sales", formatCurrency(stats.totalRevenue)],
              ["Total orders", stats.totalOrders],
              ["Unpaid / partial", stats.unpaidOrders],
              ["Completed", stats.completedOrders],
              ["Cancelled", stats.cancelledOrders],
            ].map(([label, value]) => (
              <div
                key={label}
                className="p-5 bg-white border border-orange-100 rounded-2xl"
              >
                <p className="text-sm text-stone-500">{label}</p>
                <strong className="text-2xl">{value}</strong>
              </div>
            ))}
          </div>
          <p className="text-sm text-stone-500">
            Total includes every bill. Unpaid excludes cancelled bills;
            completed is an order state. Paid sales excludes cancelled and
            refunded payments. These counts can overlap.
          </p>
        </>
      )}
      <div className="grid md:grid-cols-3 gap-5">
        {branches.map((b) => {
          const r = rows.find((r) => r.id === b.id);
          return (
            <section
              key={b.id}
              className="bg-white rounded-2xl border border-orange-100 p-6 space-y-3"
            >
              <h2 className="font-bold text-lg">{b.name}</h2>
              <p className="text-sm text-stone-500">{b.address}</p>
              {!stats || loading ? (
                <p className="text-stone-500">
                  {loading ? "Loading activity..." : "Activity unavailable"}
                </p>
              ) : (
                <>
                  <p>Paid sales: {formatCurrency(r?.totalRevenue || 0)}</p>
                  <p>
                    Total: {r?.totalOrders || 0} | Unpaid:{" "}
                    {r?.unpaidOrders || 0}
                  </p>
                  <p>
                    Completed: {r?.completedOrders || 0} | Cancelled:{" "}
                    {r?.cancelledOrders || 0}
                  </p>
                </>
              )}
              <button
                className="btn-primary w-full"
                onClick={() => open(b.id)}
                disabled={!!opening}
              >
                {opening === b.id ? "Opening branch..." : "Open branch POS"}
              </button>
            </section>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4">
        {[
          ["/orders", "Order history"],
          ["/reports", "Reports"],
          ["/menu", "Menu and pricing"],
          ["/settings", "Staff and settings"],
        ].map(([url, label]) => (
          <Link className="btn-secondary" key={url} href={url}>
            {label}
          </Link>
        ))}
      </div>
    </main>
  );
}
