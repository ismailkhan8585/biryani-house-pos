"use client";

import { useCartStore } from "@/stores/pos-cart";
import { User, Phone, MapPin } from "lucide-react";

export default function CustomerInput() {
  const { customerName, customerPhone, deliveryAddress, setCustomer } = useCartStore();

  const update = (field: "name" | "phone" | "address", val: string) => {
    setCustomer(
      field === "name" ? val : customerName,
      field === "phone" ? val : customerPhone,
      field === "address" ? val : deliveryAddress
    );
  };

  const inputStyle = {
    background: "white",
    border: "1px solid rgb(254 215 170)",
    color: "rgb(28 25 23)",
    borderRadius: "0.625rem",
    padding: "0.5rem 0.75rem 0.5rem 2rem",
    fontSize: "0.8rem",
    width: "100%",
    outline: "none",
    fontFamily: "DM Sans, sans-serif",
  };

  return (
    <div className="space-y-2 pb-2">
      <div className="relative">
        <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "rgb(168 162 158)" }} />
        <input
          type="text"
          placeholder="Customer name *"
          value={customerName}
          onChange={(e) => update("name", e.target.value)}
          style={inputStyle}
        />
      </div>
      <div className="relative">
        <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "rgb(168 162 158)" }} />
        <input
          type="tel"
          placeholder="Phone number *"
          value={customerPhone}
          onChange={(e) => update("phone", e.target.value)}
          style={inputStyle}
        />
      </div>
      <div className="relative">
        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "rgb(168 162 158)" }} />
        <input
          type="text"
          placeholder="Delivery address *"
          value={deliveryAddress}
          onChange={(e) => update("address", e.target.value)}
          style={inputStyle}
        />
      </div>
    </div>
  );
}
