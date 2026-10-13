"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck, UserRound } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { useShiftStore } from "@/stores/pos-shift";
import { useCartStore } from "@/stores/pos-cart";
export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "branch">("branch");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw Error(data.error);
      useShiftStore.getState().clearShift();
      useCartStore.getState().newOrder();
      router.replace(data.role === "admin" ? "/admin" : "/pos");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="min-h-dvh bg-orange-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-3xl bg-white border border-orange-100 shadow-lg p-8">
        <div className="flex justify-center">
          <BrandLogo size={144} preload />
        </div>
        <h1 className="text-2xl font-bold text-center mt-5">Staff sign in</h1>
        <p className="text-stone-500 text-center mt-2">
          Use your individual staff account.
        </p>
        <form onSubmit={login} className="space-y-5 mt-8">
          <fieldset disabled={loading}>
            <legend className="mb-2 text-sm font-semibold text-stone-700">
              Sign in as
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  {
                    value: "branch",
                    label: "Cashier",
                    description: "Billing and tables",
                    Icon: UserRound,
                  },
                  {
                    value: "admin",
                    label: "Admin",
                    description: "Manage your business",
                    Icon: ShieldCheck,
                  },
                ] as const
              ).map(({ value, label, description, Icon }) => (
                <label key={value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="login-role"
                    value={value}
                    checked={role === value}
                    onChange={() => {
                      setRole(value);
                      setError("");
                    }}
                    className="peer sr-only"
                  />
                  <span className="flex h-full flex-col items-center gap-1 rounded-2xl border border-stone-200 p-3 text-center text-stone-600 transition-colors hover:border-orange-300 peer-checked:border-orange-500 peer-checked:bg-orange-50 peer-checked:text-orange-800 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-orange-500">
                    <Icon size={22} aria-hidden="true" />
                    <span className="text-sm font-bold">{label}</span>
                    <span className="text-xs">{description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block">
            Username
            <input
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={100}
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="field"
            />
          </label>
          <div>
            <label htmlFor="password" className="block">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field"
                style={{ paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-controls="password"
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-stone-500 hover:text-orange-600 focus-visible:outline-2 focus-visible:outline-orange-500"
              >
                {showPassword ? (
                  <EyeOff size={20} aria-hidden="true" />
                ) : (
                  <Eye size={20} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
          {error && (
            <p role="alert" className="text-red-700">
              {error}
            </p>
          )}
          <button className="btn-primary w-full" disabled={loading}>
            {loading
              ? "Signing in..."
              : role === "admin"
                ? "Sign in as Admin"
                : "Sign in as Cashier"}
          </button>
        </form>
        <p className="text-sm text-stone-500 mt-6">
          Ask your administrator for an account or password reset.
        </p>
      </div>
    </main>
  );
}
