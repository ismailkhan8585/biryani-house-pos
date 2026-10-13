"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ShiftInfo {
  id: string;
  shiftNumber: string;
  branchId: string;
  staffId: string;
  operatorName: string;
  openingCash: number;
  openedAt: string;
  totalSales: number;
  totalOrders: number;
}

interface ShiftState {
  currentShift: ShiftInfo | null;
  setShift: (shift: ShiftInfo) => void;
  clearShift: () => void;
  addSale: (amount: number) => void;
}

export const useShiftStore = create<ShiftState>()(
  persist(
    (set) => ({
      currentShift: null,

      setShift: (shift) => set({ currentShift: shift }),

      clearShift: () => set({ currentShift: null }),

      addSale: (amount) =>
        set((state) => ({
          currentShift: state.currentShift
            ? {
                ...state.currentShift,
                totalSales: state.currentShift.totalSales + amount,
                totalOrders: state.currentShift.totalOrders + 1,
              }
            : null,
        })),
    }),
    {
      name: "pos-shift",
    },
  ),
);
