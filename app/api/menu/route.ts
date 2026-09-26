import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuth, requireAdmin } from "@/lib/auth";

const FALLBACK_CATEGORIES = [
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", name_en: "Biryani & Pulao", name_ur: "بریانی اور پلاؤ", icon: "🍛", sort_order: 1, is_active: true },
  { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", name_en: "Karahi & Handi", name_ur: "کڑاہی اور ہانڈی", icon: "🍗", sort_order: 2, is_active: true },
  { id: "cccccccc-cccc-cccc-cccc-cccccccccccc", name_en: "BBQ & Kebabs", name_ur: "بار بی کیو اور کباب", icon: "🍢", sort_order: 3, is_active: true },
  { id: "dddddddd-dddd-dddd-dddd-dddddddddddd", name_en: "Naan & Roti", name_ur: "نان اور روٹی", icon: "🥖", sort_order: 4, is_active: true },
  { id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", name_en: "Sides & Raita", name_ur: "رائتہ اور سلاد", icon: "🥗", sort_order: 5, is_active: true },
  { id: "ffffffff-ffff-ffff-ffff-ffffffffffff", name_en: "Beverages & Desserts", name_ur: "مشروبات اور میٹھا", icon: "🥤", sort_order: 6, is_active: true },
];

const FALLBACK_ITEMS = [
  { id: "item-1", name_en: "Chicken Biryani Single", name_ur: "چکن بریانی سنگل", category_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", price: 380, emoji: "🍗", is_available: true, is_featured: true, sort_order: 1, description: "Fragrant basmati rice cooked with succulent chicken piece, potato and secret spices" },
  { id: "item-2", name_en: "Chicken Biryani Double", name_ur: "چکن بریانی ڈبل", category_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", price: 650, emoji: "🍗", is_available: true, is_featured: true, sort_order: 2, description: "Double chicken piece with extra spiced aromatic basmati rice" },
  { id: "item-3", name_en: "Beef Biryani Single", name_ur: "بیف بریانی سنگل", category_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", price: 480, emoji: "🥩", is_available: true, is_featured: true, sort_order: 3, description: "Tender slow-cooked beef with spiced rice and potatoes" },
  { id: "item-4", name_en: "Beef Biryani Double", name_ur: "بیف بریانی ڈبل", category_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", price: 850, emoji: "🥩", is_available: true, is_featured: false, sort_order: 4, description: "Large portion of Karachi-style beef biryani" },
  { id: "item-5", name_en: "Special Mutton Biryani", name_ur: "اسپیشل مٹن بریانی", category_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", price: 1150, emoji: "🍖", is_available: true, is_featured: true, sort_order: 5, description: "Prime cut mutton simmered in saffron-infused long grain basmati rice" },
  { id: "item-6", name_en: "Chicken Degi Pulao", name_ur: "چکن دیگی پلاؤ", category_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", price: 420, emoji: "🍚", is_available: true, is_featured: false, sort_order: 6, description: "Mildly spiced traditional yakhni pulao with tender chicken" },
  { id: "item-7", name_en: "Chicken Karahi (Half)", name_ur: "چکن کڑاہی (نصف)", category_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", price: 950, emoji: "🥘", is_available: true, is_featured: true, sort_order: 7, description: "Freshly wok-fried chicken in fresh tomatoes, ginger and green chilies" },
  { id: "item-8", name_en: "Chicken Karahi (Full)", name_ur: "چکن کڑاہی (مکمل)", category_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", price: 1750, emoji: "🥘", is_available: true, is_featured: false, sort_order: 8, description: "Full 1kg chicken karahi with rich butter and ginger garnishing" },
  { id: "item-9", name_en: "Chicken Tikka Boti", name_ur: "چکن تکہ بوٹی", category_id: "cccccccc-cccc-cccc-cccc-cccccccccccc", price: 320, emoji: "🍢", is_available: true, is_featured: true, sort_order: 9, description: "Boneless chicken cubes grilled over hot charcoal coals" },
  { id: "item-10", name_en: "Beef Seekh Kebab (4 Pcs)", name_ur: "بیف سیخ کباب (۴ عدد)", category_id: "cccccccc-cccc-cccc-cccc-cccccccccccc", price: 450, emoji: "🍢", is_available: true, is_featured: true, sort_order: 10, description: "Minced spiced beef skewered and char-grilled to perfection" },
  { id: "item-11", name_en: "Roghani Naan", name_ur: "روغنی نان", category_id: "dddddddd-dddd-dddd-dddd-dddddddddddd", price: 70, emoji: "🥖", is_available: true, is_featured: false, sort_order: 11, description: "Soft tandoori bread topped with sesame seeds and butter" },
  { id: "item-12", name_en: "Garlic Butter Naan", name_ur: "گارلک بٹر نان", category_id: "dddddddd-dddd-dddd-dddd-dddddddddddd", price: 90, emoji: "🥖", is_available: true, is_featured: false, sort_order: 12, description: "Tandoori naan brushed with garlic butter and fresh coriander" },
  { id: "item-13", name_en: "Zeera Raita", name_ur: "زیرہ رائتہ", category_id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", price: 60, emoji: "🥣", is_available: true, is_featured: false, sort_order: 13, description: "Chilled fresh yogurt blended with roasted cumin seeds" },
  { id: "item-14", name_en: "Fresh Kachumber Salad", name_ur: "کچومر سلاد", category_id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", price: 70, emoji: "🥗", is_available: true, is_featured: false, sort_order: 14, description: "Diced cucumber, onion, tomato with lemon dressing" },
  { id: "item-15", name_en: "Soft Drink (500ml)", name_ur: "کولڈ ڈرنک (۵۰۰ ملی لیٹر)", category_id: "ffffffff-ffff-ffff-ffff-ffffffffffff", price: 120, emoji: "🥤", is_available: true, is_featured: false, sort_order: 15, description: "Chilled Pepsi, 7Up, or Mirinda" },
  { id: "item-16", name_en: "Shahi Kheer Cup", name_ur: "شاہی کھیر کپ", category_id: "ffffffff-ffff-ffff-ffff-ffffffffffff", price: 150, emoji: "🍮", is_available: true, is_featured: true, sort_order: 16, description: "Slow-simmered rice pudding with saffron, almonds, and pistachios" },
];

// GET /api/menu
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const includeUnavailable = searchParams.get("includeUnavailable") === "true";

    const serverClient = createServerClient();

    const [categoriesRes, itemsRes] = await Promise.all([
      serverClient.from("categories").select("*").eq("is_active", true).order("sort_order"),
      serverClient
        .from("menu_items")
        .select("*, categories(*)")
        .order("sort_order")
        .then((q) =>
          includeUnavailable ? q : { ...q, data: q.data?.filter((i) => i.is_available) }
        ),
    ]);

    if (!categoriesRes.error && !itemsRes.error && categoriesRes.data && itemsRes.data && itemsRes.data.length > 0) {
      return NextResponse.json({
        categories: categoriesRes.data,
        items: itemsRes.data,
      });
    }

    // Fallback if DB not seeded or credentials pending
    const items = includeUnavailable
      ? FALLBACK_ITEMS
      : FALLBACK_ITEMS.filter((i) => i.is_available);

    return NextResponse.json({
      categories: FALLBACK_CATEGORIES,
      items,
    });
  } catch {
    return NextResponse.json({
      categories: FALLBACK_CATEGORIES,
      items: FALLBACK_ITEMS,
    });
  }
}

// POST /api/menu — create menu item (admin only)
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const serverClient = createServerClient();

    const { data, error } = await serverClient
      .from("menu_items")
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ item: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create menu item" }, { status: 500 });
  }
}

// PATCH /api/menu — update menu item (admin only)
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { id, ...updates } = body;

    const serverClient = createServerClient();
    const { data, error } = await serverClient
      .from("menu_items")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ item: data });
  } catch {
    return NextResponse.json({ error: "Failed to update menu item" }, { status: 500 });
  }
}

// DELETE /api/menu
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const serverClient = createServerClient();
    const { error } = await serverClient.from("menu_items").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete menu item" }, { status: 500 });
  }
}
