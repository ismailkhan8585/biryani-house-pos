"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, ChevronLeft, ArrowRight, CheckCircle } from "lucide-react";
import { useBranchStore } from "@/stores/pos-branch";
import toast from "react-hot-toast";

interface Branch {
  id: string;
  name: string;
  name_ur: string | null;
  address: string | null;
  color: string;
}

type LoginStep = "select-branch" | "enter-pin" | "admin-login";

const BRANCH_THEMES: Record<string, {
  accent: string; light: string; ring: string;
  gradient: string; dot: string;
}> = {
  "#F97316": { accent: "#ea580c", light: "#fff7ed", ring: "rgba(249,115,22,0.18)", gradient: "linear-gradient(135deg,#fb923c,#ea580c)", dot: "#f97316" },
  "#EF4444": { accent: "#dc2626", light: "#fff1f2", ring: "rgba(239,68,68,0.15)",  gradient: "linear-gradient(135deg,#f87171,#dc2626)", dot: "#ef4444" },
  "#8B5CF6": { accent: "#7c3aed", light: "#faf5ff", ring: "rgba(139,92,246,0.15)", gradient: "linear-gradient(135deg,#a78bfa,#7c3aed)", dot: "#8b5cf6" },
  "#2563EB": { accent: "#1d4ed8", light: "#eff6ff", ring: "rgba(37,99,235,0.15)",  gradient: "linear-gradient(135deg,#60a5fa,#1d4ed8)", dot: "#2563eb" },
};
const getTheme = (c: string) => BRANCH_THEMES[c] ?? BRANCH_THEMES["#F97316"];

/* ── tiny sub-components ─────────────────────────────────────────────── */
function Spinner({ color = "rgba(255,255,255,0.35)", size = 20 }: { color?: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `2.5px solid ${color}`,
      borderTopColor: color === "rgba(255,255,255,0.35)" ? "#fff" : "var(--brand-500)",
      animation: "spin 0.7s linear infinite",
    }} />
  );
}

export default function LoginPage() {
  const router    = useRouter();
  const setBranch = useBranchStore((s) => s.setBranch);

  const [branches, setBranches]               = useState<Branch[]>([]);
  const [step, setStep]                       = useState<LoginStep>("select-branch");
  const [selected, setSelected]               = useState<Branch | null>(null);
  const [pin, setPin]                         = useState("");
  const [adminPw, setAdminPw]                 = useState("");
  const [showPw, setShowPw]                   = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [shake, setShake]                     = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(true);

  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then((d) => { setBranches(d.branches || []); setLoadingBranches(false); })
      .catch(() => {
        setBranches([
          { id: "11111111-1111-1111-1111-111111111111", name: "Branch 1 — Main",  name_ur: "برانچ ۱ - مین",   address: "Shop #1-3, Food Street",     color: "#F97316" },
          { id: "22222222-2222-2222-2222-222222222222", name: "Branch 2 — City",  name_ur: "برانچ ۲ - سٹی",   address: "Commercial Market, Block B", color: "#EF4444" },
          { id: "33333333-3333-3333-3333-333333333333", name: "Branch 3 — North", name_ur: "برانچ ۳ - نارتھ",  address: "Sector F-7, North Avenue",   color: "#8B5CF6" },
        ]);
        setLoadingBranches(false);
      });
  }, []);

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 450); };

  const handleBranchSelect = (b: Branch) => { setSelected(b); setPin(""); setStep("enter-pin"); };

  const handlePinDigit = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) handlePinLogin(next);
  };

  const handlePinLogin = async (pinValue: string) => {
    if (!selected) return;
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/login", { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "branch", branchId: selected.id, pin: pinValue }) });
      const data = await res.json();
      if (!res.ok) { triggerShake(); setPin(""); toast.error(data.error || "Incorrect PIN"); return; }
      setBranch({ id: data.branch.id, name: data.branch.name, color: data.branch.color, role: "branch" });
      toast.success(`Welcome, ${data.branch.name}!`);
      router.push("/pos");
    } catch { toast.error("Login failed."); setPin(""); }
    finally { setLoading(false); }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const res  = await fetch("/api/auth/login", { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "admin", password: adminPw }) });
      const data = await res.json();
      if (!res.ok) { triggerShake(); toast.error(data.error || "Incorrect password"); return; }
      setBranch({ id: data.branch.id, name: "All Branches", color: "#F97316", role: "admin" });
      toast.success("Welcome, Admin!"); router.push("/admin");
    } catch { toast.error("Login failed."); }
    finally { setLoading(false); }
  };

  const PIN_KEYS = ["1","2","3","4","5","6","7","8","9","⌫","0","✓"];
  const theme    = selected ? getTheme(selected.color) : getTheme("#F97316");

  return (
    <div style={{ display:"flex", minHeight:"100vh", overflow:"hidden", fontFamily:"var(--font-sans)" }}>

      {/* ══════════════ LEFT PANEL ══════════════ */}
      <div style={{
        flex: 1,
        background: "linear-gradient(160deg, #1a0f08 0%, #0d0804 100%)",
        display: "flex", flexDirection: "column",
        position: "relative", overflow: "hidden",
        minWidth: 0,
      }}>
        {/* Decorative circles */}
        <div style={{ position:"absolute", top:-120, left:-80, width:420, height:420, borderRadius:"50%",
          background:"radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 65%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-100, right:-60, width:340, height:340, borderRadius:"50%",
          background:"radial-gradient(circle, rgba(234,88,12,0.12) 0%, transparent 65%)", pointerEvents:"none" }} />
        {/* Grid texture */}
        <div style={{
          position:"absolute", inset:0, pointerEvents:"none", opacity:0.04,
          backgroundImage:"linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize:"48px 48px",
        }} />

        {/* Content */}
        <div style={{ position:"relative", flex:1, display:"flex", flexDirection:"column", justifyContent:"space-between", padding:"52px 56px" }}>
          
          {/* Top — Logo */}
          <div>
            <div style={{
              width:64, height:64, borderRadius:20,
              background:"linear-gradient(135deg, #f97316, #c2410c)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:30,
              boxShadow:"0 8px 32px rgba(249,115,22,0.45), 0 2px 8px rgba(0,0,0,0.3)",
              marginBottom:32,
            }}>
              🍛
            </div>
            <div style={{ fontSize:44, fontWeight:800, color:"#fff", lineHeight:1.1, letterSpacing:"-0.03em" }}>
              Biryani<br />
              <span style={{ color:"#f97316" }}>House</span>
            </div>
            <div className="font-urdu" style={{ fontSize:20, color:"rgba(255,255,255,0.4)", marginTop:10 }}>
              بریانی ہاؤس
            </div>
          </div>

          {/* Middle — Feature list */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {[
              { icon:"⚡", text:"Lightning-fast billing & KOT" },
              { icon:"📡", text:"Works offline, syncs when online" },
              { icon:"📊", text:"Real-time reports across all branches" },
              { icon:"🔐", text:"Secure per-branch PIN access" },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{
                  width:36, height:36, borderRadius:10,
                  background:"rgba(249,115,22,0.12)",
                  border:"1px solid rgba(249,115,22,0.2)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:16, flexShrink:0,
                }}>
                  {icon}
                </div>
                <span style={{ fontSize:13, color:"rgba(255,255,255,0.55)", lineHeight:1.4 }}>{text}</span>
              </div>
            ))}
          </div>

          {/* Bottom — version */}
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.2)", letterSpacing:"0.05em" }}>
            BIRYANI HOUSE POS · v2.0 · SECURE
          </div>
        </div>
      </div>

      {/* ══════════════ RIGHT PANEL ══════════════ */}
      <div style={{
        width:460, flexShrink:0,
        background:"#fff",
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        padding:"48px 44px",
        position:"relative",
        boxShadow:"-24px 0 64px rgba(0,0,0,0.25)",
      }}>
        {/* Top badge */}
        <div style={{
          position:"absolute", top:28,
          display:"flex", alignItems:"center", gap:6,
        }}>
          <div style={{
            width:6, height:6, borderRadius:"50%",
            background:"#22c55e",
            boxShadow:"0 0 0 3px rgba(34,197,94,0.25)",
            animation:"pulse-green 2s ease-in-out infinite",
          }} />
          <span style={{ fontSize:11, fontWeight:600, color:"var(--stone-400)", letterSpacing:"0.06em" }}>
            SYSTEM ONLINE
          </span>
        </div>

        {/* Header text */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--stone-400)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:6 }}>
            Point of Sale
          </div>
          <div style={{ fontSize:26, fontWeight:800, color:"var(--stone-900)", letterSpacing:"-0.02em" }}>
            Staff Login
          </div>
        </div>

        {/* ── STEP: SELECT BRANCH ── */}
        {step === "select-branch" && (
          <div style={{ width:"100%", animation:"fadeUp 0.22s ease forwards" }}>
            <div style={{ fontSize:13, fontWeight:600, color:"var(--stone-500)", marginBottom:14, textAlign:"center" }}>
              Select your branch to continue
            </div>

            {loadingBranches ? (
              <div style={{ display:"flex", justifyContent:"center", padding:"44px 0" }}>
                <Spinner color="var(--border-soft)" size={32} />
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {branches.map((b) => {
                  const t = getTheme(b.color);
                  return (
                    <button
                      key={b.id}
                      onClick={() => handleBranchSelect(b)}
                      style={{
                        display:"flex", alignItems:"center", gap:14,
                        padding:"16px 18px",
                        borderRadius:16,
                        border:`1.5px solid ${t.ring.replace("0.18","0.35").replace("0.15","0.3")}`,
                        background:`linear-gradient(135deg, ${t.light} 0%, #fff 60%)`,
                        cursor:"pointer",
                        transition:"all 0.18s ease",
                        textAlign:"left",
                        position:"relative", overflow:"hidden",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = `0 8px 24px ${t.ring}`;
                        e.currentTarget.style.borderColor = t.dot;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.borderColor = t.ring.replace("0.18","0.35").replace("0.15","0.3");
                      }}
                    >
                      {/* Accent stripe */}
                      <div style={{
                        position:"absolute", left:0, top:0, bottom:0,
                        width:4, borderRadius:"16px 0 0 16px",
                        background: t.gradient,
                      }} />

                      {/* Color dot */}
                      <div style={{
                        width:38, height:38, borderRadius:12,
                        background: t.gradient,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:18, flexShrink:0,
                        boxShadow:`0 4px 12px ${t.ring}`,
                      }}>
                        🏪
                      </div>

                      {/* Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:"var(--stone-800)", marginBottom:2 }}>
                          {b.name}
                        </div>
                        {b.address && (
                          <div style={{ fontSize:11, color:"var(--stone-400)", display:"flex", alignItems:"center", gap:3 }}>
                            📍 {b.address}
                          </div>
                        )}
                        {b.name_ur && (
                          <div className="font-urdu" style={{ fontSize:11, color:t.accent, marginTop:1 }}>
                            {b.name_ur}
                          </div>
                        )}
                      </div>

                      <ArrowRight size={16} color={t.accent} />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Admin link */}
            <div style={{ marginTop:28, paddingTop:22, borderTop:"1px solid var(--border-muted)", textAlign:"center" }}>
              <button
                onClick={() => setStep("admin-login")}
                style={{
                  display:"inline-flex", alignItems:"center", gap:6,
                  padding:"8px 18px", borderRadius:10,
                  border:"1px solid var(--border-soft)",
                  background:"transparent",
                  fontSize:12, fontWeight:700,
                  color:"var(--stone-500)",
                  cursor:"pointer",
                  transition:"all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--brand-50)";
                  e.currentTarget.style.borderColor = "var(--brand-300)";
                  e.currentTarget.style.color = "var(--brand-600)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "var(--border-soft)";
                  e.currentTarget.style.color = "var(--stone-500)";
                }}
              >
                👑 Owner / Admin Access
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: PIN ENTRY ── */}
        {step === "enter-pin" && selected && (
          <div style={{ width:"100%", animation:"fadeUp 0.22s ease forwards" }} className={shake ? "shake" : ""}>
            <button
              onClick={() => { setStep("select-branch"); setPin(""); }}
              style={{
                display:"flex", alignItems:"center", gap:4,
                fontSize:12, fontWeight:600, color:"var(--stone-400)",
                background:"none", border:"none", cursor:"pointer", marginBottom:24,
              }}
            >
              <ChevronLeft size={14} /> Back to branches
            </button>

            {/* Selected branch pill */}
            <div style={{ textAlign:"center", marginBottom:28 }}>
              <div style={{
                display:"inline-flex", alignItems:"center", gap:8,
                padding:"8px 16px", borderRadius:40,
                background: theme.light,
                border:`1.5px solid ${theme.ring.replace("0.18","0.4").replace("0.15","0.35")}`,
                marginBottom:16,
              }}>
                <div style={{
                  width:8, height:8, borderRadius:"50%",
                  background: theme.dot,
                  boxShadow:`0 0 0 3px ${theme.ring}`,
                }} />
                <span style={{ fontSize:13, fontWeight:700, color: theme.accent }}>{selected.name}</span>
              </div>
              <div style={{ fontSize:20, fontWeight:800, color:"var(--stone-800)", marginBottom:4 }}>
                Enter your PIN
              </div>
              <div style={{ fontSize:12, color:"var(--stone-400)" }}>
                4-digit branch access code
              </div>
            </div>

            {/* PIN dots */}
            <div style={{ display:"flex", justifyContent:"center", gap:16, marginBottom:28 }}>
              {[0,1,2,3].map((i) => {
                const filled = i < pin.length;
                return (
                  <div key={i} style={{
                    width: filled ? 18 : 14,
                    height: filled ? 18 : 14,
                    borderRadius:"50%",
                    border: `2.5px solid ${filled ? theme.dot : "var(--border-soft)"}`,
                    background: filled ? theme.dot : "transparent",
                    transition:"all 0.15s ease",
                    boxShadow: filled ? `0 0 0 4px ${theme.ring}` : "none",
                  }} />
                );
              })}
            </div>

            {/* Keypad */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:9 }}>
              {PIN_KEYS.map((key) => {
                const isBack    = key === "⌫";
                const isConfirm = key === "✓";
                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (isBack) setPin((p) => p.slice(0,-1));
                      else if (isConfirm) { if (pin.length === 4) handlePinLogin(pin); }
                      else handlePinDigit(key);
                    }}
                    disabled={loading}
                    style={{
                      height:58, borderRadius:14,
                      border: isConfirm ? "none" : isBack ? "1.5px solid #fecdd3" : "1.5px solid var(--border-soft)",
                      fontSize: isConfirm || isBack ? 20 : 22,
                      fontWeight:700, cursor:"pointer",
                      transition:"all 0.1s ease",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      background: isConfirm ? theme.gradient : isBack ? "#fff1f2" : "#fafaf9",
                      color: isConfirm ? "#fff" : isBack ? "#dc2626" : "var(--stone-800)",
                      boxShadow: isConfirm ? `0 4px 16px ${theme.ring}` : "var(--shadow-sm)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isConfirm && !isBack) {
                        e.currentTarget.style.background = "var(--stone-100)";
                        e.currentTarget.style.borderColor = "var(--stone-300)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isConfirm && !isBack) {
                        e.currentTarget.style.background = "#fafaf9";
                        e.currentTarget.style.borderColor = "var(--border-soft)";
                      }
                    }}
                  >
                    {loading && isConfirm ? <Spinner /> : key}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP: ADMIN LOGIN ── */}
        {step === "admin-login" && (
          <div style={{ width:"100%", animation:"fadeUp 0.22s ease forwards" }} className={shake ? "shake" : ""}>
            <button
              onClick={() => setStep("select-branch")}
              style={{
                display:"flex", alignItems:"center", gap:4,
                fontSize:12, fontWeight:600, color:"var(--stone-400)",
                background:"none", border:"none", cursor:"pointer", marginBottom:24,
              }}
            >
              <ChevronLeft size={14} /> Back
            </button>

            <div style={{ textAlign:"center", marginBottom:32 }}>
              <div style={{
                width:64, height:64, borderRadius:20,
                background:"linear-gradient(135deg,#fbbf24,#d97706)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:28, margin:"0 auto 18px",
                boxShadow:"0 6px 24px rgba(217,119,6,0.4)",
              }}>
                👑
              </div>
              <div style={{ fontSize:20, fontWeight:800, color:"var(--stone-800)", marginBottom:4 }}>
                Admin Access
              </div>
              <div style={{ fontSize:12, color:"var(--stone-400)" }}>
                Full access to all branches &amp; reports
              </div>
            </div>

            <form onSubmit={handleAdminLogin} style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ position:"relative" }}>
                <Lock size={14} color="var(--stone-400)" style={{
                  position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", pointerEvents:"none",
                }} />
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Enter master password"
                  value={adminPw}
                  onChange={(e) => setAdminPw(e.target.value)}
                  className="pos-input"
                  style={{ paddingLeft:40, paddingRight:42, height:48 }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", cursor:"pointer",
                    color:"var(--stone-400)", display:"flex",
                  }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || !adminPw}
                className="btn-primary"
                style={{
                  height:50, fontSize:14, width:"100%",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                  borderRadius:14,
                }}
              >
                {loading
                  ? <><Spinner /> Logging in…</>
                  : <><CheckCircle size={16} /> Login as Admin</>
                }
              </button>
            </form>

            {/* Hint */}
            <div style={{
              marginTop:20, padding:"12px 14px", borderRadius:12,
              background:"var(--stone-50)", border:"1px solid var(--border-muted)",
              display:"flex", gap:8, alignItems:"flex-start",
            }}>
              <span style={{ fontSize:14, flexShrink:0 }}>💡</span>
              <span style={{ fontSize:11, color:"var(--stone-400)", lineHeight:1.6 }}>
                Use the master password set in your <code style={{ background:"var(--stone-100)", padding:"1px 5px", borderRadius:4, fontSize:10 }}>.env.local</code> file.
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ position:"absolute", bottom:20, textAlign:"center" }}>
          <span style={{ fontSize:10, color:"var(--stone-300)", letterSpacing:"0.05em" }}>
            BIRYANI HOUSE POS v2.0 · SECURE LOGIN
          </span>
        </div>
      </div>
    </div>
  );
}
