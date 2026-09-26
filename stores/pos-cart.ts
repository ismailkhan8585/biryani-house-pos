"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MenuItem } from "@/lib/supabase";
import { calculateTotal, generateOrderNumber, generateOfflineId } from "@/lib/utils";

export interface CartItem {
  id: string; // unique cart item id
  menuItemId: string;
  name: string;
  nameUr: string | null;
  emoji: string;
  unitPrice: number;
  quantity: number;
  notes: string;
}

export type OrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
export type DiscountType = "AMOUNT" | "PERCENT";

interface CartState {
  // Cart
  items: CartItem[];
  orderType: OrderType;
  tableId: string | null;
  tableNumber: number | null;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  discount: number;
  discountType: DiscountType;
  orderNumber: string;
  offlineOrderId: string;
  notes: string;

  // Computed
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;

  // Actions
  addItem: (item: MenuItem) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, qty: number) => void;
  updateItemNotes: (cartItemId: string, notes: string) => void;
  setOrderType: (type: OrderType) => void;
  setTable: (tableId: string, tableNumber: number) => void;
  clearTable: () => void;
  setCustomer: (name: string, phone: string, address: string) => void;
  setDiscount: (discount: number, type: DiscountType) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;
  newOrder: () => void;
}

function computeTotals(
  items: CartItem[],
  discount: number,
  discountType: DiscountType,
  taxRate: number = 0
) {
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const { discountAmount, taxAmount, total } = calculateTotal(
    subtotal,
    discount,
    discountType,
    taxRate
  );
  return { subtotal, discountAmount, taxAmount, total };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      orderType: "DINE_IN",
      tableId: null,
      tableNumber: null,
      customerName: "",
      customerPhone: "",
      deliveryAddress: "",
      discount: 0,
      discountType: "AMOUNT",
      orderNumber: generateOrderNumber(),
      offlineOrderId: generateOfflineId(),
      notes: "",
      subtotal: 0,
      discountAmount: 0,
      taxAmount: 0,
      total: 0,

      addItem: (menuItem) => {
        const { items } = get();
        const existing = items.find((i) => i.menuItemId === menuItem.id && !i.notes);
        if (existing) {
          set((state) => {
            const newItems = state.items.map((i) =>
              i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i
            );
            return { items: newItems, ...computeTotals(newItems, state.discount, state.discountType) };
          });
        } else {
          const newItem: CartItem = {
            id: `cart-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            menuItemId: menuItem.id,
            name: menuItem.name_en,
            nameUr: menuItem.name_ur,
            emoji: menuItem.emoji,
            unitPrice: menuItem.price,
            quantity: 1,
            notes: "",
          };
          set((state) => {
            const newItems = [...state.items, newItem];
            return { items: newItems, ...computeTotals(newItems, state.discount, state.discountType) };
          });
        }
      },

      removeItem: (cartItemId) => {
        set((state) => {
          const newItems = state.items.filter((i) => i.id !== cartItemId);
          return { items: newItems, ...computeTotals(newItems, state.discount, state.discountType) };
        });
      },

      updateQuantity: (cartItemId, qty) => {
        if (qty < 1) {
          get().removeItem(cartItemId);
          return;
        }
        set((state) => {
          const newItems = state.items.map((i) =>
            i.id === cartItemId ? { ...i, quantity: qty } : i
          );
          return { items: newItems, ...computeTotals(newItems, state.discount, state.discountType) };
        });
      },

      updateItemNotes: (cartItemId, notes) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.id === cartItemId ? { ...i, notes } : i
          ),
        }));
      },

      setOrderType: (type) => set({ orderType: type, tableId: null, tableNumber: null }),

      setTable: (tableId, tableNumber) => set({ tableId, tableNumber }),

      clearTable: () => set({ tableId: null, tableNumber: null }),

      setCustomer: (name, phone, address) =>
        set({ customerName: name, customerPhone: phone, deliveryAddress: address }),

      setDiscount: (discount, type) => {
        set((state) => ({
          discount,
          discountType: type,
          ...computeTotals(state.items, discount, type),
        }));
      },

      setNotes: (notes) => set({ notes }),

      clearCart: () => {
        set({
          items: [],
          tableId: null,
          tableNumber: null,
          customerName: "",
          customerPhone: "",
          deliveryAddress: "",
          discount: 0,
          discountType: "AMOUNT",
          notes: "",
          subtotal: 0,
          discountAmount: 0,
          taxAmount: 0,
          total: 0,
        });
      },

      newOrder: () => {
        set({
          items: [],
          orderType: "DINE_IN",
          tableId: null,
          tableNumber: null,
          customerName: "",
          customerPhone: "",
          deliveryAddress: "",
          discount: 0,
          discountType: "AMOUNT",
          notes: "",
          orderNumber: generateOrderNumber(),
          offlineOrderId: generateOfflineId(),
          subtotal: 0,
          discountAmount: 0,
          taxAmount: 0,
          total: 0,
        });
      },
    }),
    {
      name: "pos-cart",
      partialize: (state) => ({
        items: state.items,
        orderType: state.orderType,
        tableId: state.tableId,
        tableNumber: state.tableNumber,
        customerName: state.customerName,
        customerPhone: state.customerPhone,
        deliveryAddress: state.deliveryAddress,
        discount: state.discount,
        discountType: state.discountType,
        orderNumber: state.orderNumber,
        offlineOrderId: state.offlineOrderId,
        notes: state.notes,
        subtotal: state.subtotal,
        discountAmount: state.discountAmount,
        taxAmount: state.taxAmount,
        total: state.total,
      }),
    }
  )
);
