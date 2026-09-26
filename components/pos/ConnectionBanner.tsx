"use client";

import { useConnectionStore } from "@/stores/pos-connection";
import { WifiOff, X } from "lucide-react";
import { useState, useEffect } from "react";

export default function ConnectionBanner() {
  const isOnline = useConnectionStore((s) => s.isOnline);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Always render null on the server / first paint to avoid hydration mismatch
  if (!mounted || isOnline || dismissed) return null;

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium flex-shrink-0"
      style={{ background: "rgb(245 158 11)", color: "white" }}
    >
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 flex-shrink-0" />
        <span>
          <strong>Offline Mode</strong> — Orders will be saved locally and synced when connection returns.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-0.5 rounded hover:bg-amber-600 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
