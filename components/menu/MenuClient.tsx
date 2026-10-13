"use client";

import BrandLogo from "@/components/BrandLogo";
import CategoryManager from "./CategoryManager";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  X,
  Star,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";
import type { MenuItem, Category } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

interface MenuClientProps {
  role: "branch" | "admin";
}

export default function MenuClient({ role: _role }: MenuClientProps) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showCategories, setShowCategories] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name_en: "",
    name_ur: "",
    category_id: "",
    price: "",
    emoji: "🍛",
    description: "",
    is_available: true,
    is_featured: false,
  });

  const loadMenu = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/menu?includeUnavailable=true");
      if (!res.ok) throw new Error("Failed to fetch menu");
      const data = await res.json();
      setItems(data.items || []);
      setCategories(data.categories || []);
      if (data.categories?.length > 0) {
        setFormData((prev) => ({
          ...prev,
          category_id: prev.category_id || data.categories[0].id,
        }));
      }
    } catch {
      toast.error("Could not load menu items");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  // Open modal for Create
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name_en: "",
      name_ur: "",
      category_id: categories[0]?.id || "",
      price: "",
      emoji: "🍛",
      description: "",
      is_available: true,
      is_featured: false,
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name_en: item.name_en,
      name_ur: item.name_ur || "",
      category_id: item.category_id || categories[0]?.id || "",
      price: item.price.toString(),
      emoji: item.emoji || "🍛",
      description: item.description || "",
      is_available: item.is_available,
      is_featured: item.is_featured,
    });
    setIsModalOpen(true);
  };

  // Quick toggle availability
  const toggleAvailability = async (item: MenuItem) => {
    try {
      const updated = !item.is_available;
      // Optimistic update
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_available: updated } : i,
        ),
      );

      const res = await fetch("/api/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, is_available: updated }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        `${item.name_en} marked ${updated ? "Available" : "Sold Out"}`,
      );
    } catch {
      toast.error("Failed to update availability");
      loadMenu();
    }
  };

  // Quick toggle featured
  const toggleFeatured = async (item: MenuItem) => {
    try {
      const updated = !item.is_featured;
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_featured: updated } : i,
        ),
      );

      const res = await fetch("/api/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, is_featured: updated }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${item.name_en} featured status updated`);
    } catch {
      toast.error("Failed to update featured");
      loadMenu();
    }
  };

  // Delete item
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const res = await fetch(`/api/menu?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Item deleted");
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      toast.error("Failed to delete item");
    }
  };

  // Save (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name_en.trim() || !formData.price) {
      toast.error("Please enter item name and price");
      return;
    }

    try {
      const payload = {
        name_en: formData.name_en.trim(),
        name_ur: formData.name_ur.trim() || null,
        category_id: formData.category_id || null,
        price: parseFloat(formData.price),
        emoji: formData.emoji.trim() || "🍛",
        description: formData.description.trim() || null,
        is_available: formData.is_available,
        is_featured: formData.is_featured,
      };

      if (editingItem) {
        const res = await fetch("/api/menu", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingItem.id, ...payload }),
        });
        if (!res.ok) throw new Error();
        toast.success("Item updated successfully");
      } else {
        const res = await fetch("/api/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        toast.success("New dish added to menu");
      }

      setIsModalOpen(false);
      loadMenu();
    } catch {
      toast.error("Failed to save menu item");
    }
  };

  // Filtered items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name_en.toLowerCase().includes(search.toLowerCase()) ||
      (item.name_ur && item.name_ur.includes(search));
    const matchesCategory =
      selectedCategory === "all" || item.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col font-sans pb-16">
      {/* Top Navbar */}
      <header className="page-header bg-white border-b border-orange-100 px-6 py-4 sticky top-0 z-20 shadow-sm flex flex-wrap items-center justify-between gap-4">
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
            <h1 className="text-xl font-bold tracking-tight text-stone-900 flex items-center gap-2">
              🍛 Menu & Price Management
            </h1>
            <p className="text-xs text-stone-500">
              Manage dishes, prices, and stock across all branches
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowCategories(true)}
            disabled={loading}
          >
            <Plus size={16} /> Manage Categories
          </button>
          <button
            onClick={loadMenu}
            className="p-2.5 rounded-xl bg-white border border-stone-200 text-stone-600 hover:bg-orange-50 hover:text-orange-600 transition-colors shadow-sm"
            aria-label="Refresh Menu"
            title="Refresh Menu"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin text-orange-500" : ""}`}
            />
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors shadow-md shadow-orange-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Dish</span>
          </button>
        </div>
      </header>

      {showCategories && (
        <CategoryManager
          categories={categories}
          items={items}
          onClose={() => setShowCategories(false)}
          onSaved={(category) => {
            setCategories((current) =>
              [...current.filter((c) => c.id !== category.id), category].sort(
                (a, b) =>
                  a.sort_order - b.sort_order ||
                  a.name_en.localeCompare(b.name_en),
              ),
            );
            setItems((current) =>
              current.map((item) =>
                item.category_id === category.id
                  ? { ...item, categories: category }
                  : item,
              ),
            );
            if (isModalOpen)
              setFormData((current) => ({
                ...current,
                category_id: category.id,
              }));
          }}
        />
      )}
      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full px-6 pt-6 space-y-6">
        {/* Search & Category Filter */}
        <div className="bg-white rounded-2xl p-4 border border-orange-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
          {/* Categories */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === "all"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              All Categories ({items.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedCategory === c.id
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                <span>{c.icon}</span>
                <span>{c.name_en}</span>
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-auto sm:min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Menu Items Table / Grid */}
        <div className="bg-white rounded-3xl border border-orange-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="menu-management-table w-full text-left text-sm">
              <thead className="bg-stone-50 border-b border-stone-200/80 text-stone-500 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-6">Dish</th>
                  <th className="py-3.5 px-4">Urdu Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Featured</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredItems.map((item) => {
                  const cat = categories.find((c) => c.id === item.category_id);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-orange-50/30 transition-colors"
                    >
                      <td data-label="Dish" className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                            {item.emoji}
                          </span>
                          <div>
                            <div className="font-bold text-stone-900">
                              {item.name_en}
                            </div>
                            {item.description && (
                              <div className="text-xs text-stone-400 max-w-xs truncate">
                                {item.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td data-label="Urdu name" className="py-4 px-4 font-urdu text-base text-stone-600">
                        {item.name_ur || "—"}
                      </td>
                      <td data-label="Category" className="py-4 px-4">
                        <span className="text-xs bg-stone-100 text-stone-700 px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1">
                          {cat?.icon} {cat?.name_en || "General"}
                        </span>
                      </td>
                      <td data-label="Price" className="py-4 px-4 font-mono font-bold text-stone-900">
                        {formatCurrency(item.price)}
                      </td>
                      <td data-label="Status" className="py-4 px-4 text-center">
                        <button
                          onClick={() => toggleAvailability(item)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                            item.is_available
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                          }`}
                        >
                          {item.is_available ? "In Stock" : "Sold Out"}
                        </button>
                      </td>
                      <td data-label="Featured" className="py-4 px-4 text-center">
                        <button
                          onClick={() => toggleFeatured(item)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            item.is_featured
                              ? "text-amber-500 bg-amber-50 hover:bg-amber-100"
                              : "text-stone-300 hover:text-stone-400"
                          }`}
                          title={
                            item.is_featured
                              ? "Featured item"
                              : "Mark as featured"
                          }
                        >
                          <Star
                            className={`w-4 h-4 ${item.is_featured ? "fill-amber-400" : ""}`}
                          />
                        </button>
                      </td>
                      <td data-label="Actions" className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-2 rounded-xl text-stone-500 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                            aria-label="Edit"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.name_en)}
                            className="p-2 rounded-xl text-stone-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                            aria-label="Delete"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div
          className="responsive-dialog fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-orange-100 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h3 className="text-lg font-bold text-stone-900">
                {editingItem ? "Edit Dish" : "Add New Dish"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Dish Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name_en}
                    onChange={(e) =>
                      setFormData({ ...formData, name_en: e.target.value })
                    }
                    placeholder="e.g. Chicken Biryani Single"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:border-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Emoji
                  </label>
                  <input
                    type="text"
                    value={formData.emoji}
                    onChange={(e) =>
                      setFormData({ ...formData, emoji: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-center text-xl focus:border-orange-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Dish Name (Urdu)
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={formData.name_ur}
                  onChange={(e) =>
                    setFormData({ ...formData, name_ur: e.target.value })
                  }
                  placeholder="چکن بریانی سنگل"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-urdu focus:border-orange-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) =>
                      setFormData({ ...formData, category_id: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:border-orange-500 outline-none bg-white"
                  >
                    <option value="" disabled>
                      Select a category
                    </option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name_en}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold text-orange-700 underline"
                    onClick={() => setShowCategories(true)}
                  >
                    + Create or edit category
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Price (PKR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="10"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    placeholder="350"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-mono focus:border-orange-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Description / Ingredients
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Served with raita and salad..."
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm focus:border-orange-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_available}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_available: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-orange-500 focus:ring-orange-400"
                  />
                  <span>Available (In Stock)</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_featured: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-orange-500 focus:ring-orange-400"
                  />
                  <span>Featured Dish ⭐</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-md shadow-orange-500/20"
                >
                  {editingItem ? "Save Changes" : "Add Dish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
