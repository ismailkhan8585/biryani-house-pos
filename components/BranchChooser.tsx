"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useShiftStore } from "@/stores/pos-shift";
import { useCartStore } from "@/stores/pos-cart";
export default function BranchChooser() {
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then((d) => {
        setBranches(d.branches || []);
        if (d.error) setError(d.error);
      })
      .catch(() => setError("Cannot load branches. Refresh to try again."))
      .finally(() => setLoading(false));
  }, []);
  async function choose(id: string) {
    if (selecting) return;
    setSelecting(id);
    setError("");
    try {
      const r = await fetch("/api/auth/branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: id }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      useShiftStore.getState().clearShift();
      useCartStore.getState().newOrder();
      router.replace(pathname);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot select branch");
      setSelecting(null);
    }
  }
  return (
    <section className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold">Select a branch</h1>
      <p className="my-4">
        Choose the shop where you are working before opening a shift or selling.
      </p>
      {error && <p role="alert">{error}</p>}
      {loading && <p role="status">Loading branches...</p>}
      {!loading && !error && branches.length === 0 && (
        <p>No active branches are available. Contact your administrator.</p>
      )}
      <div className="grid gap-3">
        {branches.map((b) => (
          <button
            className="btn-primary"
            key={b.id}
            disabled={!!selecting}
            onClick={() => choose(b.id)}
          >
            {selecting === b.id ? "Opening branch..." : b.name}
          </button>
        ))}
      </div>
      <a href="/admin" className="inline-block mt-6">
        Back to dashboard
      </a>
    </section>
  );
}
