"use client";
import { create } from "zustand";
import type { MenuItem, Category } from "@/lib/supabase";
import { cacheMenuItems, cacheCategories, getCachedMenuItems, getCachedCategories } from "@/lib/pos-db-local";

interface MenuState {
  items: MenuItem[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  selectedCategoryId: string | null;
  searchQuery: string;

  // Actions
  fetchMenu: () => Promise<void>;
  setCategory: (categoryId: string | null) => void;
  setSearch: (query: string) => void;
  filteredItems: () => MenuItem[];
  updateItemAvailability: (itemId: string, available: boolean) => void;
}

export const useMenuStore = create<MenuState>((set, get) => ({
  items: [],
  categories: [],
  loading: false,
  error: null,
  selectedCategoryId: null,
  searchQuery: "",

  fetchMenu: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/menu");
      if (res.ok) {
        const data = await res.json();
        const categories = (data.categories || []) as Category[];
        const items = (data.items || []) as MenuItem[];
        set({ categories, items, loading: false });

        // Cache for offline use
        try {
          await cacheCategories(categories);
          await cacheMenuItems(items);
        } catch {
          // Ignore cache errors in private browsing
        }
        return;
      }
      throw new Error("Failed to load menu from server");
    } catch {
      // Fallback to local IndexedDB cached data
      try {
        const [categories, items] = await Promise.all([
          getCachedCategories(),
          getCachedMenuItems(),
        ]);
        if (categories.length > 0 && items.length > 0) {
          set({ categories, items, loading: false, error: "Using cached data (offline)" });
          return;
        }
      } catch {
        // Ignore
      }
      set({ loading: false, error: "Failed to load menu" });
    }
  },

  setCategory: (categoryId) => set({ selectedCategoryId: categoryId }),

  setSearch: (query) => set({ searchQuery: query }),

  filteredItems: () => {
    const { items, selectedCategoryId, searchQuery } = get();
    let filtered = items;

    if (selectedCategoryId) {
      filtered = filtered.filter((i) => i.category_id === selectedCategoryId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.name_en.toLowerCase().includes(q) ||
          (i.name_ur && i.name_ur.includes(q))
      );
    }

    return filtered;
  },

  updateItemAvailability: (itemId, available) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.id === itemId ? { ...i, is_available: available } : i
      ),
    }));
  },
}));
