"use client";
import { useEffect, useState } from "react";
import { useConnectionStore } from "@/stores/pos-connection";
import { useMenuStore } from "@/stores/pos-menu";
import { refreshBillingSettings } from "@/lib/billing-settings";
import { getCachedMenuItems } from "@/lib/pos-db-local";

function message(
  worker: ServiceWorker,
  data: object,
): Promise<{ ready: boolean; error?: string }> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => {
      channel.port1.close();
      reject(Error("Preparation timed out. Retry while online."));
    }, 30000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      channel.port1.close();
      resolve(event.data);
    };
    worker.postMessage(data, [channel.port2]);
  });
}
export default function OfflineReadiness({
  staffId,
  branchId,
}: {
  staffId: string;
  branchId: string;
}) {
  const online = useConnectionStore((s) => s.isOnline);
  const [status, setStatus] = useState("Checking offline readiness...");
  const [busy, setBusy] = useState(false);
  async function prepare() {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) {
      setStatus("Offline reopening requires HTTPS or localhost.");
      return;
    }
    if (process.env.NODE_ENV !== "production") {
      setStatus(
        "Offline reopening is available in the production build. Keep this POS tab open during development.",
      );
      return;
    }
    setBusy(true);
    try {
      const existing = await navigator.serviceWorker.getRegistration("/");
      if (navigator.onLine)
        await navigator.serviceWorker.register("/pos-sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
      else if (!existing)
        throw Error("Reconnect to prepare offline reopening.");
      const registration = existing?.active
        ? existing
        : await navigator.serviceWorker.ready;
      const worker = registration.active;
      if (!worker) throw Error("Offline support is starting. Retry shortly.");
      const context = staffId + ":" + branchId;
      if (!navigator.onLine) {
        const result = await message(worker, { type: "STATUS", context });
        setStatus(
          result.ready
            ? "POS saved for offline reopening during this session."
            : "Reconnect to prepare offline reopening.",
        );
        return;
      }
      await refreshBillingSettings();
      await useMenuStore.getState().fetchMenu();
      if (useMenuStore.getState().error)
        throw Error("Connect and refresh the menu before going offline.");
      const cachedMenu = await getCachedMenuItems();
      if (
        useMenuStore
          .getState()
          .items.some(
            (item) =>
              !cachedMenu.some(
                (cached) =>
                  cached.id === item.id && cached.price === item.price,
              ),
          )
      )
        throw Error(
          "Menu could not be stored on this device. Check browser storage and retry.",
        );
      for (const [path, key] of [
        ["/api/branches", "receipt-branch-" + branchId],
        ["/api/tables?branchId=" + branchId, "branch-tables-" + branchId],
      ]) {
        const response = await fetch(path);
        const data = await response.json();
        if (!response.ok) throw Error(data.error || "Branch data unavailable.");
        const value = data.branches
          ? data.branches.find(
              (branch: { id: string }) => branch.id === branchId,
            )
          : data.tables;
        if (!value) throw Error("Branch data unavailable.");
        localStorage.setItem(key, JSON.stringify(value));
      }
      const assets = performance
        .getEntriesByType("resource")
        .map((entry) => entry.name);
      const result = await message(worker, {
        type: "PREPARE",
        context,
        assets,
      });
      if (!result.ready)
        throw Error(result.error || "Offline preparation failed.");
      setStatus("POS saved for offline reopening during this session.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Offline preparation unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void prepare(); /* Context changes remount POS. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 bg-stone-50 px-4 py-2 text-xs text-stone-600">
      <span role="status">{busy ? "Preparing offline POS..." : status}</span>
      {online && (
        <button
          type="button"
          className="underline"
          onClick={prepare}
          disabled={busy}
        >
          Prepare offline
        </button>
      )}
    </div>
  );
}
