"use client";

import { useConnectionStore } from "@/stores/pos-connection";
import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

export default function ConnectionBadge() {
  const { isOnline, isSyncing, pendingSyncCount, setOnline } = useConnectionStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnline]);

  // Render a stable placeholder on the server / first paint
  if (!mounted) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
        style={{ background: "rgb(240 253 244)", color: "rgb(21 128 61)" }}>
        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Online
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
        style={{ background: "rgb(239 246 255)", color: "rgb(59 130 246)" }}>
        <RefreshCw className="w-3 h-3 animate-spin" />
        Syncing...
      </div>
    );
  }

  if (isOnline) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
        style={{ background: "rgb(240 253 244)", color: "rgb(21 128 61)" }}>
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 pulse-green" />
        Online
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: "rgb(255 251 235)", color: "rgb(180 83 9)" }}>
      <WifiOff className="w-3 h-3" />
      Offline {pendingSyncCount > 0 ? `(${pendingSyncCount})` : ""}
    </div>
  );
}
