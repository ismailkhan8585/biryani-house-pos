"use client";

import type { MenuItem } from "@/lib/supabase";

interface MenuItemTileProps {
  item: MenuItem;
  isAdded: boolean;
  onAdd: (item: MenuItem) => void;
}

export default function MenuItemTile({ item, isAdded, onAdd }: MenuItemTileProps) {
  const unavailable = !item.is_available;

  return (
    <button
      onClick={() => !unavailable && onAdd(item)}
      disabled={unavailable}
      className={`menu-tile ${isAdded ? "added" : ""}`}
      style={{
        width: "100%",
        padding: "14px 12px 12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        minHeight: 136,
        cursor: unavailable ? "not-allowed" : "pointer",
        opacity: unavailable ? 0.5 : 1,
        background: isAdded ? "var(--brand-50)" : "#fff",
      }}
    >
      {/* Featured star */}
      {item.is_featured && (
        <span style={{
          position: "absolute",
          top: 8, right: 8,
          fontSize: 10,
          lineHeight: 1,
          padding: "2px 5px",
          borderRadius: 5,
          background: "var(--brand-100)",
          color: "var(--brand-600)",
          fontWeight: 700,
        }}>★</span>
      )}

      {/* Unavailable overlay */}
      {unavailable && (
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: 13,
          background: "rgba(254 226 226 / 0.75)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700,
          color: "#b91c1c",
        }}>
          Unavailable
        </div>
      )}

      {/* Emoji / image */}
      <div style={{ fontSize: 32, marginBottom: 8, lineHeight: 1, userSelect: "none" }}>
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt={item.name_en}
            style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 10 }} />
        ) : (
          item.emoji
        )}
      </div>

      {/* English name */}
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1.35,
        color: "var(--stone-800)",
        marginBottom: 2,
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}>
        {item.name_en}
      </div>

      {/* Urdu name */}
      {item.name_ur && (
        <div className="font-urdu" style={{
          fontSize: 10,
          color: "var(--stone-400)",
          lineHeight: 1.4,
          marginBottom: 4,
          maxWidth: "90%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {item.name_ur}
        </div>
      )}

      {/* Price */}
      <div style={{
        marginTop: "auto",
        fontSize: 13,
        fontWeight: 700,
        fontFamily: "var(--font-mono)",
        color: "var(--brand-500)",
      }}>
        Rs.{item.price.toLocaleString()}
      </div>
    </button>
  );
}
