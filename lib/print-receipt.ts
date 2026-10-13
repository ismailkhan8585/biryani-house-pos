import { generateReceiptHTML } from "./receipt";
import type { Order, OrderItem } from "./supabase";
export function printReceipt(
  order: Order,
  items: OrderItem[],
  settings: Record<string, string>,
  cash?: number,
) {
  const w = window.open("", "_blank", "width=380,height=700");
  if (!w) return false;
  w.document.write(generateReceiptHTML(order, items, settings, cash));
  w.document.close();
  let printed = false;
  const print = () => {
    if (printed || w.closed) return;
    printed = true;
    w.focus();
    w.print();
    w.close();
  };
  const logo = w.document.querySelector("img");
  if (logo && !logo.complete) {
    logo.onload = print;
    logo.onerror = print;
    setTimeout(print, 5000);
  } else print();
  return true;
}
