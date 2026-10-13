import {
  getPendingOrders,
  markOrderSynced,
  markOrderFailed,
} from "./pos-db-local";
import { useConnectionStore } from "@/stores/pos-connection";
let busy = false;
export async function syncPendingOrders() {
  if (busy) return { synced: 0, failed: 0 };
  busy = true;
  let synced = 0,
    failed = 0;
  useConnectionStore.setState({ isSyncing: true });
  try {
    const pending = await getPendingOrders();
    for (const order of pending) {
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orders: [order] }),
        });
        const data = await res.json();
        if (!res.ok || !data.syncedIds?.includes(order.id))
          throw new Error(
            data.failures?.[0]?.error || data.error || "Sync failed",
          );
        await markOrderSynced(order.id);
        synced++;
      } catch {
        await markOrderFailed(order.id);
        failed++;
      }
    }
  } finally {
    busy = false;
    useConnectionStore.setState({ isSyncing: false });
    useConnectionStore.setState({
      pendingSyncCount: (await getPendingOrders()).length,
    });
  }
  return { synced, failed };
}
export function startAutoSync(
  onSync?: (r: { synced: number; failed: number }) => void,
) {
  const run = () => {
    if (navigator.onLine)
      void syncPendingOrders()
        .then(onSync)
        .catch(() => {
          useConnectionStore.setState({ isSyncing: false });
        });
  };
  window.addEventListener("online", run);
  window.addEventListener("focus", run);
  const timer = window.setInterval(run, 30000);
  run();
  return () => {
    window.removeEventListener("online", run);
    window.removeEventListener("focus", run);
    window.clearInterval(timer);
  };
}
