"use client";

import StaffSettings from "./StaffSettings";
import BrandLogo from "@/components/BrandLogo";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Save,
  Building,
  CreditCard,
  Percent,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Branch {
  id: string;
  name: string;
  name_ur: string | null;
  address: string | null;
  phone: string | null;
  receipt_footer?: string | null;
  color: string;
}

export default function SettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);

  // Settings State
  const [settings, setSettings] = useState({
    restaurant_name: "Biryani House",
    restaurant_phone: "",
    restaurant_address: "",
    receipt_footer: "Thank you for dining with us! Please visit again.",
    jazzcash_number: "",
    jazzcash_title: "Biryani House",
    easypaisa_number: "",
    easypaisa_title: "Biryani House",
    tax_enabled: "false",
    tax_rate: "0",
  });

  // Load settings & branches
  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/branches").then((r) => r.json()),
    ])
      .then(([sData, bData]) => {
        if (sData.error || bData.error || !sData.settings || !bData.branches)
          throw Error(sData.error || bData.error || "Settings unavailable");
        if (sData.settings) {
          setSettings((prev) => ({ ...prev, ...sData.settings }));
        }
        if (bData.branches) {
          setBranches(bData.branches);
        }
      })
      .catch(() => {
        setLoadError(
          "Could not load settings. Refresh this page to retry; existing settings have not changed.",
        );
        toast.error("Failed to load settings");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Save General Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      toast.success("Settings saved successfully! 🎉");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col font-sans pb-20">
      {/* Top Navbar */}
      <header className="page-header bg-white border-b border-orange-100 px-6 py-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/admin"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-stone-700 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-orange-600" />
            <span>Master Admin</span>
          </Link>
          <BrandLogo />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              ⚙️ System & Store Settings
            </h1>
            <p className="text-xs text-stone-500">
              Configure restaurant identity, mobile payment numbers, taxes, and
              staff accounts
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto w-full px-6 pt-6 space-y-8">
        {loadError ? (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
          >
            {loadError}
          </p>
        ) : loading ? (
          <div className="flex items-center justify-center py-20 text-stone-400">
            <RefreshCw className="w-8 h-8 animate-spin text-orange-500 mb-2" />
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-8">
            {/* 1. Restaurant Profile */}
            <div className="bg-white rounded-3xl p-6 border border-orange-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100">
                <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">
                    Restaurant Profile & Receipt Info
                  </h2>
                  <p className="text-xs text-stone-400">
                    Shared brand name and default receipt footer. Receipt
                    addresses and phone numbers use the branch details below.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Restaurant Brand Name
                  </label>
                  <input
                    type="text"
                    value={settings.restaurant_name}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        restaurant_name: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:border-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Profile Phone Number (not used on branch receipts)
                  </label>
                  <input
                    type="text"
                    value={settings.restaurant_phone}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        restaurant_phone: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:border-orange-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Profile Address (not used on branch receipts)
                  </label>
                  <input
                    type="text"
                    value={settings.restaurant_address}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        restaurant_address: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:border-orange-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Receipt Footer Note
                  </label>
                  <input
                    type="text"
                    value={settings.receipt_footer}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        receipt_footer: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:border-orange-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. Digital Payments Setup */}
            <div className="bg-white rounded-3xl p-6 border border-orange-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">
                    Mobile Wallets (JazzCash & EasyPaisa)
                  </h2>
                  <p className="text-xs text-stone-400">
                    Displayed on the payment modal for cashier and customer
                    reference. Confirm transfers separately; saving these
                    details does not connect a payment gateway.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    JazzCash Account Number
                  </label>
                  <input
                    type="text"
                    value={settings.jazzcash_number}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        jazzcash_number: e.target.value,
                      })
                    }
                    placeholder="0300-1234567"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-mono focus:border-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    JazzCash Account Title
                  </label>
                  <input
                    type="text"
                    value={settings.jazzcash_title}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        jazzcash_title: e.target.value,
                      })
                    }
                    placeholder="Biryani House"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:border-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    EasyPaisa Account Number
                  </label>
                  <input
                    type="text"
                    value={settings.easypaisa_number}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        easypaisa_number: e.target.value,
                      })
                    }
                    placeholder="0300-7654321"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-mono focus:border-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    EasyPaisa Account Title
                  </label>
                  <input
                    type="text"
                    value={settings.easypaisa_title}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        easypaisa_title: e.target.value,
                      })
                    }
                    placeholder="Biryani House"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:border-orange-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 3. Tax Configuration */}
            <div className="bg-white rounded-3xl p-6 border border-orange-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">
                    Sales Tax & Billing Policy
                  </h2>
                  <p className="text-xs text-stone-400">
                    Optionally add GST/tax to customer invoices
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="tax_enabled"
                    checked={settings.tax_enabled === "true"}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        tax_enabled: e.target.checked ? "true" : "false",
                      })
                    }
                    className="w-5 h-5 rounded text-orange-500 focus:ring-orange-400"
                  />
                  <label
                    htmlFor="tax_enabled"
                    className="text-sm font-semibold cursor-pointer"
                  >
                    Enable Sales Tax on Bills
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Tax Percentage (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    required
                    disabled={settings.tax_enabled !== "true"}
                    value={settings.tax_rate}
                    onChange={(e) =>
                      setSettings({ ...settings, tax_rate: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-mono focus:border-orange-500 outline-none disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Save Button for General Settings */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg shadow-orange-500/25 transition-all disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                <span>
                  {saving ? "Saving Settings..." : "Save General Settings"}
                </span>
              </button>
            </div>
          </form>
        )}

        {!loading && !loadError && <StaffSettings branches={branches} />}
      </main>
    </div>
  );
}
