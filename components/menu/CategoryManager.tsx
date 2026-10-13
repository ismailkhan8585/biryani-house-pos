"use client";
import { useEffect, useRef, useState } from "react";
import { Edit2, Plus, X, Layers } from "lucide-react";
import type { Category, MenuItem } from "@/lib/supabase";

const icons = [
  "🍛",
  "🍗",
  "🍢",
  "🥖",
  "🥗",
  "🥤",
  "🍰",
  "☕",
  "🍕",
  "🍔",
  "🍲",
  "🍽️",
];
export default function CategoryManager({
  categories,
  items,
  onClose,
  onSaved,
}: {
  categories: Category[];
  items: MenuItem[];
  onClose: () => void;
  onSaved: (category: Category) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const empty = () => ({
    id: "",
    name_en: "",
    name_ur: "",
    icon: "🍛",
    sort_order: String(
      Math.min(9999, Math.max(0, ...categories.map((c) => c.sort_order)) + 1),
    ),
  });
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  function reset() {
    setForm(empty());
    setError("");
    setSuccess("");
    nameInput.current?.focus();
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/categories", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sort_order: Number(form.sort_order) }),
      });
      const data = await response.json();
      if (!response.ok)
        throw Error(data.error || "Category could not be saved");
      onSaved(data.category);
      setForm({
        ...data.category,
        name_ur: data.category.name_ur || "",
        sort_order: String(data.category.sort_order),
      });
      setSuccess(
        "Category saved. It is available in the dish form. Refresh the menu on cashier terminals to see changes.",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Cannot connect. Your changes have not been saved.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="category-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
      className="m-auto w-[calc(100%_-_2rem)] max-w-4xl max-h-[90dvh] overflow-y-auto rounded-3xl border border-orange-100 bg-white p-0 text-stone-800 shadow-2xl backdrop:bg-black/50"
    >
      <header className="flex items-center gap-3 border-b border-orange-100 p-5 sm:p-6">
        <div className="rounded-2xl bg-orange-50 p-3 text-orange-600">
          <Layers size={24} />
        </div>
        <div className="flex-1">
          <h2 id="category-title" className="text-xl font-bold">
            Menu categories
          </h2>
          <p className="text-sm text-stone-500">
            Organize the menu across all branches.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          aria-label="Close category manager"
          className="rounded-xl p-3 hover:bg-stone-100"
        >
          <X size={20} />
        </button>
      </header>
      <div className="grid md:grid-cols-[280px_1fr]">
        <aside className="border-b border-stone-200 bg-stone-50 p-5 md:border-b-0 md:border-r">
          <button
            type="button"
            onClick={reset}
            disabled={saving}
            className="btn-secondary w-full"
          >
            <Plus size={16} /> New category
          </button>
          <p className="mt-5 mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Existing categories · {categories.length}
          </p>
          <div className="max-h-64 overflow-y-auto space-y-2 md:max-h-[440px]">
            {!categories.length && (
              <p className="text-sm text-stone-500">
                Create your first category to start organizing dishes.
              </p>
            )}
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                disabled={saving}
                aria-label={"Edit " + category.name_en}
                aria-pressed={form.id === category.id}
                onClick={() => {
                  setForm({
                    id: category.id,
                    name_en: category.name_en,
                    name_ur: category.name_ur || "",
                    icon: category.icon,
                    sort_order: String(category.sort_order),
                  });
                  setError("");
                  setSuccess("");
                  nameInput.current?.focus();
                }}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${form.id === category.id ? "border-orange-300 bg-orange-50" : "border-stone-200 bg-white hover:border-orange-200"}`}
              >
                <span className="text-xl" aria-hidden="true">
                  {category.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-semibold">
                    {category.name_en}
                  </span>
                  <span className="text-xs text-stone-500">
                    {
                      items.filter((item) => item.category_id === category.id)
                        .length
                    }{" "}
                    dishes · Order {category.sort_order}
                  </span>
                </span>
                <Edit2 size={14} aria-hidden="true" />
              </button>
            ))}
          </div>
        </aside>
        <form onSubmit={save} className="space-y-5 p-5 sm:p-6">
          <div>
            <h3 className="text-lg font-bold">
              {form.id ? "Edit category" : "Create a category"}
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              Choose a clear name and an icon that cashiers can recognize
              quickly.
            </p>
          </div>
          <fieldset disabled={saving} className="space-y-4">
            <label className="block text-sm font-semibold">
              Category name <span className="text-orange-600">*</span>
              <input
                ref={nameInput}
                autoFocus
                required
                maxLength={100}
                value={form.name_en}
                onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                placeholder="e.g. Biryani & Pulao"
                className="field"
              />
            </label>
            <label className="block text-sm font-semibold">
              Urdu name{" "}
              <span className="font-normal text-stone-500">(optional)</span>
              <input
                dir="rtl"
                lang="ur"
                maxLength={100}
                value={form.name_ur}
                onChange={(e) => setForm({ ...form, name_ur: e.target.value })}
                className="field font-urdu"
                placeholder="بریانی اور پلاؤ"
              />
            </label>
            <div>
              <label className="block text-sm font-semibold">
                Icon{" "}
                <input
                  required
                  maxLength={50}
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="field max-w-28 text-center text-xl"
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                {icons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    aria-label={"Use icon " + icon}
                    aria-pressed={form.icon === icon}
                    onClick={() => setForm({ ...form, icon })}
                    className={`h-10 w-10 rounded-xl border text-xl ${form.icon === icon ? "border-orange-400 bg-orange-50" : "border-stone-200 hover:bg-stone-50"}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <label className="block text-sm font-semibold">
              Display order
              <input
                type="number"
                min="0"
                max="9999"
                step="1"
                required
                value={form.sort_order}
                onChange={(e) =>
                  setForm({ ...form, sort_order: e.target.value })
                }
                className="field max-w-32"
              />
              <span className="mt-1 block text-xs font-normal text-stone-500">
                Lower numbers appear first in the menu.
              </span>
            </label>
          </fieldset>
          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
            <p className="mb-2 text-xs font-semibold text-orange-800">
              CATEGORY PREVIEW
            </p>
            <span className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold shadow-sm">
              <span>{form.icon}</span>
              {form.name_en.trim() || "Your category name"}
            </span>
            {form.name_ur && (
              <p dir="rtl" lang="ur" className="font-urdu mt-2">
                {form.name_ur}
              </p>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="text-sm text-green-700">
              {success}
            </p>
          )}
          <footer className="flex flex-wrap justify-end gap-3 border-t border-stone-100 pt-4">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="btn-secondary"
            >
              Done
            </button>
            <button disabled={saving} className="btn-primary">
              {saving
                ? "Saving..."
                : form.id
                  ? "Save changes"
                  : "Create category"}
            </button>
          </footer>
        </form>
      </div>
    </dialog>
  );
}
