"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
type Branch = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  receipt_footer?: string | null;
};
type Staff = {
  id?: string;
  username: string;
  name: string;
  role: string;
  branch_id: string | null;
  is_active: boolean;
  password?: string;
};
export default function StaffSettings({ branches }: { branches: Branch[] }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<Staff>({
    username: "",
    name: "",
    role: "branch",
    branch_id: branches[0]?.id || "",
    is_active: true,
    password: "",
  });
  async function load() {
    setLoadError("");
    try {
      const r = await fetch("/api/staff");
      const d = await r.json();
      if (!r.ok) {
        throw Error(d.error);
      }
      setStaff(d.staff);
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "Could not load staff. Please retry.",
      );
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const r = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) {
        throw Error(d.error);
      }
      toast.success("Staff account saved");
      setForm({
        username: "",
        name: "",
        role: "branch",
        branch_id: branches[0]?.id || "",
        is_active: true,
        password: "",
      });
      void load();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not save staff. Please retry.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <section className="bg-white border rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold">Branch receipt details</h2>
        <p className="text-sm text-stone-500">
          Save each branch separately. These details appear on new receipts;
          existing receipt snapshots stay unchanged.
        </p>
        {!branches.length && (
          <p className="text-sm text-amber-800">
            No active branches are available. A cashier account requires an
            active branch.
          </p>
        )}
        {branches.map((b) => (
          <BranchForm key={b.id} branch={b} />
        ))}
      </section>
      <section className="bg-white border rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold">Staff accounts</h2>
        {loadError && (
          <div role="alert" className="text-red-700">
            {loadError}{" "}
            <button type="button" className="btn-secondary" onClick={load}>
              Retry
            </button>
          </div>
        )}
        <p className="text-sm text-stone-500">
          Every cashier uses an individual account. Existing passwords are never
          displayed.
        </p>
        <div className="space-y-2">
          {staff.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap gap-3 justify-between border-b py-2"
            >
              <span>
                {s.name} ({s.username}) -{" "}
                {s.role === "admin" ? "Administrator" : "Cashier"} -{" "}
                {s.role === "admin"
                  ? "All branches"
                  : branches.find((b) => b.id === s.branch_id)?.name ||
                    "Branch unavailable"}{" "}
                - {s.is_active ? "Active" : "Disabled"}
              </span>
              <button
                type="button"
                className="btn-secondary"
                disabled={saving}
                onClick={() => setForm({ ...s, password: "" })}
              >
                Edit / Reset password
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
          <h3 className="sm:col-span-2 font-semibold">
            {form.id ? "Edit staff account" : "Create staff account"}
          </h3>
          <label>
            Name
            <input
              className="field"
              required
              maxLength={100}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Username
            <input
              className="field"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={100}
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </label>
          <label>
            New password
            <input
              className="field"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={200}
              required={!form.id}
              placeholder={
                form.id
                  ? "Leave blank to keep current"
                  : "At least 8 characters"
              }
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          <label>
            Role
            <select
              className="field"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="branch">Cashier</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
          {form.role === "branch" && (
            <label>
              Assigned branch
              <select
                className="field"
                required
                value={form.branch_id || ""}
                onChange={(e) =>
                  setForm({ ...form, branch_id: e.target.value })
                }
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.checked })
              }
            />{" "}
            Account active
          </label>
          <button className="btn-primary" disabled={saving}>
            {saving
              ? "Saving..."
              : form.id
                ? "Save staff changes"
                : "Create staff account"}
          </button>
          {form.id && (
            <button
              type="button"
              className="btn-secondary"
              disabled={saving}
              onClick={() =>
                setForm({
                  username: "",
                  name: "",
                  role: "branch",
                  branch_id: "",
                  is_active: true,
                  password: "",
                })
              }
            >
              Cancel editing
            </button>
          )}
        </form>
      </section>
    </>
  );
}
function BranchForm({ branch }: { branch: Branch }) {
  const [form, setForm] = useState(branch);
  const [saving, setSaving] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const r = await fetch("/api/branches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (r.ok) toast.success("Branch details saved");
      else toast.error(d.error);
    } catch {
      toast.error("Could not save branch details. Please retry.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <form
      onSubmit={save}
      className="border rounded-xl p-4 grid sm:grid-cols-2 gap-3"
    >
      <h3 className="sm:col-span-2 font-bold">{branch.name}</h3>
      <label>
        Address
        <input
          className="field"
          value={form.address || ""}
          maxLength={500}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </label>
      <label>
        Phone
        <input
          className="field"
          type="tel"
          maxLength={50}
          value={form.phone || ""}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </label>
      <label className="sm:col-span-2">
        Receipt footer
        <input
          className="field"
          value={form.receipt_footer || ""}
          maxLength={500}
          onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })}
        />
      </label>
      <button className="btn-secondary" disabled={saving}>
        {saving ? "Saving..." : "Save branch details"}
      </button>
    </form>
  );
}
