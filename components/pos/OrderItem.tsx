"use client";

import { useState } from "react";
import { Minus, Plus, X, MessageSquare } from "lucide-react";
import { useCartStore, type CartItem } from "@/stores/pos-cart";
import { formatCurrency } from "@/lib/utils";

interface OrderItemProps {
  cartItem: CartItem;
}

export default function OrderItem({ cartItem }: OrderItemProps) {
  const { updateQuantity, removeItem, updateItemNotes } = useCartStore();
  const [showNotes, setShowNotes] = useState(!!cartItem.notes);
  const [noteValue, setNoteValue] = useState(cartItem.notes);

  const handleNoteChange = (val: string) => {
    setNoteValue(val);
    updateItemNotes(cartItem.id, val);
  };

  return (
    <div
      className="order-item-row fade-up"
      style={{ flexDirection: "column", alignItems: "stretch" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Emoji */}
        <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>
          {cartItem.emoji}
        </span>

        {/* Name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--stone-800)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {cartItem.name}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--stone-400)",
              fontFamily: "var(--font-mono)",
            }}
          >
            Rs.{cartItem.unitPrice.toLocaleString()} each
          </div>
        </div>

        {/* Qty controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            flexShrink: 0,
          }}
        >
          <button
            className="qty-btn"
            aria-label={"Decrease quantity of " + cartItem.name}
            onClick={() => updateQuantity(cartItem.id, cartItem.quantity - 1)}
          >
            <Minus size={11} />
          </button>
          <span
            style={{
              width: 26,
              textAlign: "center",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: "var(--stone-800)",
            }}
          >
            {cartItem.quantity}
          </span>
          <button
            className="qty-btn"
            aria-label={"Increase quantity of " + cartItem.name}
            onClick={() => updateQuantity(cartItem.id, cartItem.quantity + 1)}
          >
            <Plus size={11} />
          </button>
        </div>

        {/* Line total */}
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--brand-500)",
            minWidth: 58,
            textAlign: "right",
            flexShrink: 0,
          }}
        >
          {formatCurrency(cartItem.unitPrice * cartItem.quantity)}
        </span>

        {/* Actions */}
        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          <button
            onClick={() => setShowNotes(!showNotes)}
            aria-label="Add note"
            title="Add note"
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: showNotes ? "var(--brand-500)" : "var(--stone-400)",
              transition: "color 0.15s",
            }}
          >
            <MessageSquare size={12} />
          </button>
          <button
            aria-label={"Remove " + cartItem.name}
            onClick={() => removeItem(cartItem.id)}
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--stone-400)",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--danger)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--stone-400)")
            }
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Notes */}
      {showNotes && (
        <div
          style={{
            marginTop: 6,
            paddingTop: 6,
            borderTop: "1px solid var(--border-muted)",
          }}
        >
          <input
            type="text"
            placeholder="e.g. Extra spicy, no oil…"
            value={noteValue}
            onChange={(e) => handleNoteChange(e.target.value)}
            className="pos-input"
            style={{ fontSize: 11, padding: "6px 10px" }}
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
