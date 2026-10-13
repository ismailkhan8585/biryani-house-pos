"use client";

import { useState } from "react";
import { useMenuStore } from "@/stores/pos-menu";
import { useCartStore } from "@/stores/pos-cart";
import MenuItemTile from "./MenuItemTile";
import { Search, X } from "lucide-react";
import type { MenuItem } from "@/lib/supabase";

export default function MenuGrid() {
  const { searchQuery, setSearch, loading, filteredItems, error, fetchMenu } =
    useMenuStore();
  const addItem = useCartStore((s) => s.addItem);
  const [addedId, setAddedId] = useState<string | null>(null);

  const items = filteredItems();

  const handleAdd = (item: MenuItem) => {
    if (!item.is_available) return;
    addItem(item);
    setAddedId(item.id);
    setTimeout(() => setAddedId(null), 280);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {error && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 text-sm"
        >
          {error}{" "}
          <button
            className="btn-secondary"
            onClick={fetchMenu}
            disabled={loading}
          >
            Retry
          </button>
        </div>
      )}

      {/* Search bar */}
      <div style={{ position: "relative" }}>
        <Search
          size={14}
          color="var(--stone-400)"
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        />
        <input
          aria-label="Search dishes"
          type="text"
          placeholder="Search dishes…"
          value={searchQuery}
          onChange={(e) => setSearch(e.target.value)}
          className="pos-input"
          style={{ paddingLeft: 36, paddingRight: searchQuery ? 36 : 12 }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearch("")}
            aria-label="Clear dish search"
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--stone-400)",
              display: "flex",
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Loading spinner */}
      {loading && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "48px 0",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "3px solid var(--brand-100)",
              borderTopColor: "var(--brand-500)",
              animation: "spin 0.7s linear infinite",
            }}
          />
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "56px 20px",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: 44, marginBottom: 12, opacity: 0.5 }}>
            🍽️
          </span>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--stone-600)",
              marginBottom: 4,
            }}
          >
            {searchQuery ? "No results found" : "No items available"}
          </div>
          <div style={{ fontSize: 12, color: "var(--stone-400)" }}>
            {searchQuery
              ? `No dishes match "${searchQuery}"`
              : "Menu items will appear here"}
          </div>
        </div>
      )}

      {/* Item grid — auto-fill so it adapts to panel width */}
      {!loading && items.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))",
            gap: 10,
          }}
        >
          {items.map((item) => (
            <MenuItemTile
              key={item.id}
              item={item}
              isAdded={addedId === item.id}
              onAdd={handleAdd}
            />
          ))}
        </div>
      )}
    </div>
  );
}
