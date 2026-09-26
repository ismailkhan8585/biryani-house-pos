import { format, formatDistanceToNow } from "date-fns";

// Format PKR currency
export function formatCurrency(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

// Generate order number based on date + sequence
export function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const time = String(now.getTime()).slice(-5);
  return `ORD-${year}${month}${day}-${time}`;
}

// Generate shift number
export function generateShiftNumber(branchName: string): string {
  const now = new Date();
  const dateStr = format(now, "yyyyMMdd-HHmm");
  const prefix = branchName.slice(0, 2).toUpperCase();
  return `SHF-${prefix}-${dateStr}`;
}

// Format time elapsed since a timestamp
export function timeElapsed(timestamp: string): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: false });
}

// Format datetime for display
export function formatDateTime(timestamp: string): string {
  return format(new Date(timestamp), "dd MMM yyyy, hh:mm a");
}

// Format time only
export function formatTime(timestamp: string): string {
  return format(new Date(timestamp), "hh:mm a");
}

// Format date only
export function formatDate(timestamp: string): string {
  return format(new Date(timestamp), "EEE dd MMM yyyy");
}

// Calculate discount amount
export function calculateDiscount(
  subtotal: number,
  discount: number,
  discountType: "AMOUNT" | "PERCENT"
): number {
  if (discountType === "PERCENT") {
    return Math.round((subtotal * discount) / 100);
  }
  return discount;
}

// Calculate total with discount and tax
export function calculateTotal(
  subtotal: number,
  discount: number,
  discountType: "AMOUNT" | "PERCENT",
  taxRate: number = 0
): { discountAmount: number; taxAmount: number; total: number } {
  const discountAmount = calculateDiscount(subtotal, discount, discountType);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = Math.round((afterDiscount * taxRate) / 100);
  const total = afterDiscount + taxAmount;
  return { discountAmount, taxAmount, total };
}

// Generate a unique offline ID
export function generateOfflineId(): string {
  return `OFFLINE-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// Classify a minute-of-day into shift (for reports)
export function getHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

// Status color classes (static for Tailwind safelist)
export function getOrderStatusClasses(status: string): string {
  const map: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700",
    PREPARING: "bg-blue-100 text-blue-700",
    READY: "bg-green-100 text-green-700",
    SERVED: "bg-purple-100 text-purple-700",
    DELIVERED: "bg-purple-100 text-purple-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  };
  return map[status] || "bg-gray-100 text-gray-700";
}

export function getOrderTypeClasses(type: string): string {
  const map: Record<string, string> = {
    DINE_IN: "bg-orange-100 text-orange-700",
    TAKEAWAY: "bg-blue-100 text-blue-700",
    DELIVERY: "bg-purple-100 text-purple-700",
  };
  return map[type] || "bg-gray-100 text-gray-700";
}

export function getOrderTypeLabel(type: string): string {
  const map: Record<string, string> = {
    DINE_IN: "Dine-In",
    TAKEAWAY: "Takeaway",
    DELIVERY: "Delivery",
  };
  return map[type] || type;
}

export function getPaymentMethodLabel(method: string | null): string {
  if (!method) return "—";
  const map: Record<string, string> = {
    CASH: "Cash",
    JAZZCASH: "JazzCash",
    EASYPAISA: "EasyPaisa",
    SPLIT: "Split",
  };
  return map[method] || method;
}

// Clamp a number between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// cn utility for class merging
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
