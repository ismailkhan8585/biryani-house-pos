"use client";
import { create } from "zustand";

interface ConnectionState {
  isOnline: boolean;
  pendingSyncCount: number;
  lastSyncAt: string | null;
  isSyncing: boolean;

  setOnline: (online: boolean) => void;
  setPendingCount: (count: number) => void;
  setSyncing: (syncing: boolean) => void;
  setLastSync: (time: string) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  pendingSyncCount: 0,
  lastSyncAt: null,
  isSyncing: false,

  setOnline: (online) => set({ isOnline: online }),
  setPendingCount: (count) => set({ pendingSyncCount: count }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setLastSync: (time) => set({ lastSyncAt: time }),
}));
