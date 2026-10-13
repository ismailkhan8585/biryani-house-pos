import { useCartStore } from "@/stores/pos-cart";
import { configuredTaxRate } from "@/lib/utils";

export function applyBillingSettings(settings: Record<string, string>) {
  useCartStore.getState().setTaxRate(configuredTaxRate(settings));
}

export async function refreshBillingSettings() {
  const cached = localStorage.getItem("receipt-settings");
  if (cached) {
    try {
      applyBillingSettings(JSON.parse(cached));
    } catch {}
  }
  const response = await fetch("/api/settings");
  const data = await response.json();
  if (!response.ok) throw Error(data.error || "Billing settings unavailable");
  applyBillingSettings(data.settings);
  localStorage.setItem("receipt-settings", JSON.stringify(data.settings));
}
