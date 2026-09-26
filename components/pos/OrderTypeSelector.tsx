"use client";

import { Armchair, ShoppingBag, Bike } from "lucide-react";
import type { OrderType } from "@/stores/pos-cart";

const TYPES: { value: OrderType; label: string; icon: typeof Armchair; color: string }[] = [
  { value: "DINE_IN",  label: "Dine-In",  icon: Armchair,    color: "#16a34a" },
  { value: "TAKEAWAY", label: "Takeaway", icon: ShoppingBag, color: "#2563eb" },
  { value: "DELIVERY", label: "Delivery", icon: Bike,        color: "#7c3aed" },
];

interface OrderTypeSelectorProps {
  value: OrderType;
  onChange: (type: OrderType) => void;
}

export default function OrderTypeSelector({ value, onChange }: OrderTypeSelectorProps) {
  return (
    <div style={{
      display: "flex",
      gap: 6,
      padding: 4,
      borderRadius: 12,
      background: "var(--stone-100)",
    }}>
      {TYPES.map((type) => {
        const Icon = type.icon;
        const active = value === type.value;
        return (
          <button
            key={type.value}
            onClick={() => onChange(type.value)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "8px 4px",
              borderRadius: 9,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 12,
              transition: "all 0.15s ease",
              background: active ? "#fff" : "transparent",
              color: active ? type.color : "var(--stone-500)",
              boxShadow: active ? "var(--shadow-sm)" : "none",
              transform: active ? "scale(1.01)" : "scale(1)",
            }}
          >
            <Icon size={14} />
            {type.label}
          </button>
        );
      })}
    </div>
  );
}
