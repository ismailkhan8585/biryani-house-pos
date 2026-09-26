"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Save,
  Building,
  CreditCard,
  Percent,
  KeyRound,
  Database,
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
  pin: string;
  color: string;
}

export default function SettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Settings State
  const [settings, setSettings] = useState({
    restaurant_name: "Biryani House",
    restaurant_phone: "0300-0000000",
    restaurant_address: "Shop # 12, Main Food Street",
    receipt_footer: "Thank you for dining with us! Please visit again.",
    jazzcash_number: "0300-0000000",
    jazzcash_title: "Biryani House",
    easypaisa_number: "0300-0000000",
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
        if (sData.settings) {
          setSettings((prev) => ({ ...prev, ...sData.settings }));
        }
        if (bData.branches) {
          setBranches(bData.branches);
        }
      })
      .catch(() => {
        toast.error("Failed to load settings");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Save General Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error();
      toast.success("Settings saved successfully! 🎉");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Update Branch PIN
  const handleUpdateBranchPin = async (branchId: string, newPin: string) => {
    if (!/^\d{4}$/.test(newPin)) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }

    try {
      const res = await fetch("/api/branches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: branchId, pin: newPin }),
      });
      if (!res.ok) throw new Error();
      toast.success("Branch PIN updated!");
      setBranches((prev) =>
        prev.map((b) => (b.id === branchId ? { ...b, pin: newPin } : b))
      );
    } catch {
      toast.error("Failed to update branch PIN");
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col font-sans pb-20">
      {/* Top Navbar */}
      <header className="bg-white border-b border-orange-100 px-6 py-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-stone-700 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-orange-600" />
            <span>Master Admin</span>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              ⚙️ System & Store Settings
            </h1>
            <p className="text-xs text-stone-500">
              Configure restaurant identity, mobile payment numbers, taxes, and branch PINs
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto w-full px-6 pt-6 space-y-8">
        {loading ? (
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
                    Appears on thermal printed receipts and order tickets
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
                      setSettings({ ...settings, restaurant_name: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:border-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    value={settings.restaurant_phone}
                    onChange={(e) =>
                      setSettings({ ...settings, restaurant_phone: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:border-orange-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Main Address
                  </label>
                  <input
                    type="text"
                    value={settings.restaurant_address}
                    onChange={(e) =>
                      setSettings({ ...settings, restaurant_address: e.target.value })
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
                      setSettings({ ...settings, receipt_footer: e.target.value })
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
                    Displayed on the payment modal for cashier and customer reference
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
                      setSettings({ ...settings, jazzcash_number: e.target.value })
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
                      setSettings({ ...settings, jazzcash_title: e.target.value })
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
                      setSettings({ ...settings, easypaisa_number: e.target.value })
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
                      setSettings({ ...settings, easypaisa_title: e.target.value })
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
                  <label htmlFor="tax_enabled" className="text-sm font-semibold cursor-pointer">
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
                    step="0.5"
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
                <span>{saving ? "Saving Settings..." : "Save All Settings"}</span>
              </button>
            </div>
          </form>
        )}

        {/* 4. Branch PIN Security Management */}
        <div className="bg-white rounded-3xl p-6 border border-orange-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Branch Login PINs (Security)
              </h2>
              <p className="text-xs text-stone-400">
                Each cashier logs into their branch using a 4-digit ATM PIN
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {branches.map((b) => (
              <BranchPinRow key={b.id} branch={b} onSave={handleUpdateBranchPin} />
            ))}
          </div>
        </div>

        {/* 5. Database & Offline Status */}
        <div className="bg-white rounded-3xl p-6 border border-orange-100 shadow-sm">
          <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100">
            <div className="p-2 rounded-xl bg-stone-100 text-stone-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Database & PWA Offline Engine</h2>
              <p className="text-xs text-stone-400">IndexedDB local storage + Supabase Cloud</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/60">
              <span className="text-stone-400 block mb-1 font-medium">Cloud Database</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Supabase PostgreSQL
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/60">
              <span className="text-stone-400 block mb-1 font-medium">Offline Storage</span>
              <span className="font-bold text-stone-800">IndexedDB (idb v8)</span>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/60">
              <span className="text-stone-400 block mb-1 font-medium">Thermal Receipt</span>
              <span className="font-bold text-stone-800">80mm ESC/POS Standard</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function BranchPinRow({
  branch,
  onSave,
}: {
  branch: Branch;
  onSave: (id: string, pin: string) => void;
}) {
  const [pin, setPin] = useState(branch.pin || "");
  const [isDirty, setIsDirty] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between p-4 rounded-2xl bg-stone-50 border border-stone-200/60 gap-4">
      <div className="flex items-center gap-3">
        <span
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: branch.color || "#F97316" }}
        />
        <div>
          <h4 className="text-sm font-bold text-stone-900">{branch.name}</h4>
          <p className="text-xs text-stone-400">{branch.address || "Main Branch"}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-stone-500">PIN:</span>
          <input
            type="text"
            maxLength={4}
            value={pin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              setPin(val);
              setIsDirty(val !== branch.pin);
            }}
            className="w-20 px-3 py-1.5 rounded-xl border border-stone-300 text-center font-mono font-bold text-sm tracking-widest outline-none focus:border-orange-500 bg-white"
          />
        </div>

        {isDirty && (
          <button
            onClick={() => {
              onSave(branch.id, pin);
              setIsDirty(false);
            }}
            className="px-3 py-1.5 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition-colors shadow-sm"
          >
            Update PIN
          </button>
        )}
      </div>
    </div>
  );
}
