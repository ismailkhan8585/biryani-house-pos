import type { Order, OrderItem } from "./supabase";
import { formatDateTime, getOrderTypeLabel } from "./utils";

function escapeHTML(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

// 80mm thermal receipt — about 42 chars wide
export function generateReceiptHTML(
  order: Order,
  items: OrderItem[],
  settings: Record<string, string>,
  cashReceived?: number,
): string {
  settings = Object.fromEntries(
    Object.entries(settings).map(([k, v]) => [k, escapeHTML(v)]),
  );
  const branch = order.receipt_branch || order.branches;
  order = {
    ...order,
    order_number: escapeHTML(order.order_number),
    customer_name: order.customer_name ? escapeHTML(order.customer_name) : null,
  };
  items = items.map((i) => ({
    ...i,
    item_name: escapeHTML(i.item_name),
    notes: i.notes ? escapeHTML(i.notes) : null,
  }));
  const branchName = escapeHTML(branch?.name || "");
  const address = escapeHTML(branch?.address || "");
  const restaurantName = settings["restaurant_name"] || "Biryani House";
  const restaurantNameUr = settings["restaurant_name_ur"] || "بریانی ہاؤس";
  const phone = escapeHTML(branch?.phone || "");
  const footer =
    (branch?.receipt_footer
      ? escapeHTML(branch.receipt_footer)
      : settings["receipt_footer"]) ||
    "Shukriya! Thank you for dining with us.";

  const change = cashReceived ? cashReceived - order.total_amount : 0;

  const itemRows = items
    .map((item) => {
      const name = item.item_name.slice(0, 22);
      const qty = `×${item.quantity}`;
      const price = item.total_price.toLocaleString();
      return `
        <tr>
          <td style="padding:2px 0; font-size:11px;">${name}</td>
          <td style="padding:2px 4px; font-size:11px; text-align:center;">${qty}</td>
          <td style="padding:2px 0; font-size:11px; text-align:right;">${price}</td>
        </tr>
        ${item.notes ? `<tr><td colspan="3" style="font-size:10px;color:#666;padding-left:8px;">↳ ${item.notes}</td></tr>` : ""}
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', Courier, monospace;
          width: 80mm;
          padding: 8px;
          font-size: 12px;
          color: #000;
        }
        .center { text-align: center; }
        .divider { border-top: 1px dashed #000; margin: 4px 0; }
        .bold { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
        .total-row td { font-weight: bold; border-top: 1px solid #000; padding-top: 4px; font-size: 13px; }
        .urdu { font-family: 'Noto Nastaliq Urdu', serif; font-size: 14px; direction: rtl; }
        @media print {
          body { width: 80mm; }
        }
      </style>
    </head>
    <body>
      <div class="center"><img src="/ilyas-logo.png" alt="Ilyas 1 Chicken Biryani" width="96" height="96" style="object-fit:contain;display:block;margin:0 auto 6px;" /></div>
      <div class="center bold" style="font-size:16px; margin-bottom:2px;">🍛 ${restaurantName}</div>
      <div class="center urdu">${restaurantNameUr}</div>
      <div class="center" style="font-size:11px; margin-top:2px;">${branchName}</div>
      ${address ? `<div class="center" style="font-size:11px;">${address}</div>` : ""}
      ${phone ? `<div class="center" style="font-size:11px;">📞 ${phone}</div>` : ""}
      <div class="divider"></div>

      <div style="font-size:11px;">
        <div>Date: ${formatDateTime(order.created_at)}</div>
        <div>Order: <strong>#${order.order_number}</strong></div>
        <div>Cashier: ${escapeHTML(order.payment_staff_name || order.staff_name || "Not recorded (historical)")}</div>
        <div>Payment status: ${escapeHTML(order.payment_status)}</div>
        <div>Type: ${getOrderTypeLabel(order.order_type)}${order.table_number ? ` | Table ${order.table_number}` : ""}</div>
        ${order.customer_name ? `<div>Customer: ${order.customer_name}</div>` : ""}
      </div>
      <div class="divider"></div>

      <table>
        <thead>
          <tr>
            <th style="text-align:left;font-size:11px;">Item</th>
            <th style="text-align:center;font-size:11px;">Qty</th>
            <th style="text-align:right;font-size:11px;">Rs.</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
        <tfoot>
          <tr><td colspan="3"><div class="divider"></div></td></tr>
          <tr>
            <td colspan="2" style="font-size:11px;">Subtotal:</td>
            <td style="text-align:right;font-size:11px;">${order.subtotal.toLocaleString()}</td>
          </tr>
          ${
            order.discount > 0
              ? `
          <tr>
            <td colspan="2" style="font-size:11px;">Discount:</td>
            <td style="text-align:right;font-size:11px;">-${(order.discount_type === "PERCENT" ? Math.round((order.subtotal * order.discount) / 100) : order.discount).toLocaleString()}</td>
          </tr>
          `
              : ""
          }
          ${
            order.tax > 0
              ? `
          <tr>
            <td colspan="2" style="font-size:11px;">Tax:</td>
            <td style="text-align:right;font-size:11px;">${order.tax.toLocaleString()}</td>
          </tr>
          `
              : ""
          }
          <tr class="total-row">
            <td colspan="2">TOTAL:</td>
            <td style="text-align:right;">${order.total_amount.toLocaleString()}</td>
          </tr>
          <tr><td colspan="3"><div class="divider"></div></td></tr>
          <tr>
            <td colspan="2" style="font-size:11px;">Payment:</td>
            <td style="text-align:right;font-size:11px;">${order.payment_method || "—"}</td>
          </tr>
          ${
            cashReceived
              ? `
          <tr>
            <td colspan="2" style="font-size:11px;">Cash Recv:</td>
            <td style="text-align:right;font-size:11px;">${cashReceived.toLocaleString()}</td>
          </tr>
          <tr>
            <td colspan="2" style="font-size:11px;font-weight:bold;">Change:</td>
            <td style="text-align:right;font-size:11px;font-weight:bold;">${change.toLocaleString()}</td>
          </tr>
          `
              : ""
          }
        </tfoot>
      </table>
      <div class="divider"></div>
      <div class="center" style="font-size:11px; margin-top:4px;">${footer}</div>
      <div class="center urdu" style="margin-top:2px;">شکریہ</div>
      <div style="height:16px;"></div>
    </body>
    </html>
  `;
}
