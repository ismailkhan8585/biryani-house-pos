"use client";

import { useState } from "react";
import { useCartStore } from "@/stores/pos-cart";
import { Percent } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function DiscountInput() {
  const { discount, discountType, setDiscount, subtotal } = useCartStore();
  const [value, setValue] = useState(discount > 0 ? String(discount) : "");

  const handleChange = (val: string) => {
    setValue(val);
    const num = parseFloat(val) || 0;
    setDiscount(num, discountType);
  };

  const toggleType = () => {
    const newType = discountType === "AMOUNT" ? "PERCENT" : "AMOUNT";
    setDiscount(parseFloat(value) || 0, newType);
  };

  const discountAmount =
    discountType === "PERCENT"
      ? Math.round((subtotal * (parseFloat(value) || 0)) / 100)
      : parseFloat(value) || 0;

  return (
    <div
      className="flex items-center gap-2 p-2 rounded-xl border"
      style={{ background: "rgb(240 253 244)", borderColor: "rgb(187 247 208)" }}
    >
      <button
        onClick={toggleType}
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
        style={{ background: "rgb(22 163 74)", color: "white" }}
        title="Toggle discount type"
      >
        {discountType === "PERCENT" ? <Percent className="w-3.5 h-3.5" /> : <span className="text-xs font-bold">Rs</span>}
      </button>

      <input
        type="number"
        min="0"
        max={discountType === "PERCENT" ? "100" : undefined}
        placeholder={discountType === "PERCENT" ? "% off" : "Amount off"}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="flex-1 text-sm outline-none bg-transparent min-w-0"
        style={{ color: "rgb(21 128 61)", fontFamily: "JetBrains Mono, monospace" }}
      />

      {discountAmount > 0 && (
        <span className="text-xs font-semibold flex-shrink-0" style={{ color: "rgb(21 128 61)" }}>
          -{formatCurrency(discountAmount)}
        </span>
      )}
    </div>
  );
}
