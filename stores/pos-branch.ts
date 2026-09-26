"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BranchInfo {
  id: string;
  name: string;
  color: string;
  role: "branch" | "admin";
}

interface BranchState {
  branch: BranchInfo | null;
  setBranch: (branch: BranchInfo) => void;
  clearBranch: () => void;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      branch: null,
      setBranch: (branch) => set({ branch }),
      clearBranch: () => set({ branch: null }),
    }),
    {
      name: "pos-branch",
    }
  )
);
