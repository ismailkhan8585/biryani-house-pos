"use client";

import { useMenuStore } from "@/stores/pos-menu";

export default function CategoryTabs() {
  const { categories, selectedCategoryId, setCategory } = useMenuStore();

  return (
    <div style={{
      display: "flex",
      gap: 6,
      overflowX: "auto",
      paddingBottom: 10,
      scrollbarWidth: "none",
    }}>
      <button
        onClick={() => setCategory(null)}
        className={`cat-tab ${selectedCategoryId === null ? "active" : ""}`}
      >
        🍽️ All
      </button>

      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => setCategory(cat.id)}
          className={`cat-tab ${selectedCategoryId === cat.id ? "active" : ""}`}
        >
          {cat.icon}
          <span style={{ marginLeft: 2 }}>{cat.name_en}</span>
        </button>
      ))}
    </div>
  );
}
