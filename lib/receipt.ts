import type { Order, OrderItem } from "./supabase";
import { formatDateTime, getOrderTypeLabel } from "./utils";

// 80mm thermal receipt — about 42 chars wide
export function generateReceiptHTML(
  order: Order,
  items: OrderItem[],
  settings: Record<string, string>,
  cashReceived?: number
): string {
  const restaurantName = settings["restaurant_name"] || "Biryani House";
  const restaurantNameUr = settings["restaurant_name_ur"] || "بریانی ہاؤس";
  const phone = settings["phone"] || "";
  const footer = settings["receipt_footer"] || "Shukriya! Thank you for dining with us.";

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
      <div class="center bold" style="font-size:16px; margin-bottom:2px;">🍛 ${restaurantName}</div>
      <div class="center urdu">${restaurantNameUr}</div>
      <div class="center" style="font-size:11px; margin-top:2px;">${order.branches?.name || ""}</div>
      ${phone ? `<div class="center" style="font-size:11px;">📞 ${phone}</div>` : ""}
      <div class="divider"></div>

      <div style="font-size:11px;">
        <div>Date: ${formatDateTime(order.created_at)}</div>
        <div>Order: <strong>#${order.order_number}</strong></div>
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
          ${order.discount > 0 ? `
          <tr>
            <td colspan="2" style="font-size:11px;">Discount:</td>
            <td style="text-align:right;font-size:11px;">-${order.discount.toLocaleString()}</td>
          </tr>
          ` : ""}
          ${order.tax > 0 ? `
          <tr>
            <td colspan="2" style="font-size:11px;">Tax:</td>
            <td style="text-align:right;font-size:11px;">${order.tax.toLocaleString()}</td>
          </tr>
          ` : ""}
          <tr class="total-row">
            <td colspan="2">TOTAL:</td>
            <td style="text-align:right;">${order.total_amount.toLocaleString()}</td>
          </tr>
          <tr><td colspan="3"><div class="divider"></div></td></tr>
          <tr>
            <td colspan="2" style="font-size:11px;">Payment:</td>
            <td style="text-align:right;font-size:11px;">${order.payment_method || "—"}</td>
          </tr>
          ${cashReceived ? `
          <tr>
            <td colspan="2" style="font-size:11px;">Cash Recv:</td>
            <td style="text-align:right;font-size:11px;">${cashReceived.toLocaleString()}</td>
          </tr>
          <tr>
            <td colspan="2" style="font-size:11px;font-weight:bold;">Change:</td>
            <td style="text-align:right;font-size:11px;font-weight:bold;">${change.toLocaleString()}</td>
          </tr>
          ` : ""}
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

// Kitchen Order Ticket (KOT)
export function generateKOTHTML(order: Order, items: OrderItem[]): string {
  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="font-size:18px;font-weight:bold;padding:4px 0;">× ${item.quantity}</td>
        <td style="font-size:16px;font-weight:bold;padding:4px 8px;">${item.item_name}</td>
      </tr>
      ${item.notes ? `<tr><td></td><td style="font-size:13px;color:#555;">📝 ${item.notes}</td></tr>` : ""}
    `
    )
    .join("");

  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

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
          color: #000;
        }
        .center { text-align: center; }
        .divider { border-top: 2px solid #000; margin: 6px 0; }
        table { width: 100%; }
        @media print { body { width: 80mm; } }
      </style>
    </head>
    <body>
      <div class="center" style="font-size:16px;font-weight:bold;margin-bottom:4px;">⚡ KITCHEN ORDER TICKET</div>
      <div class="divider"></div>
      <div style="font-size:13px;">
        <div>Order: <strong>#${order.order_number}</strong></div>
        <div>Type: <strong>${getOrderTypeLabel(order.order_type)}${order.table_number ? ` | TABLE ${order.table_number}` : ""}</strong></div>
        <div>Time: ${new Date(order.created_at).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</div>
        ${order.customer_name ? `<div>Customer: ${order.customer_name}</div>` : ""}
      </div>
      <div class="divider"></div>
      <table>
        <tbody>${itemRows}</tbody>
      </table>
      <div class="divider"></div>
      <div style="font-size:13px;text-align:right;">TOTAL ITEMS: ${items.length} (${totalQty} qty)</div>
      <div style="height:16px;"></div>
    </body>
    </html>
  `;
}
