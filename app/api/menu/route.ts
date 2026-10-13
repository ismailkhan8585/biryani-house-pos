import { session, apiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuth } from "@/lib/auth";

// GET /api/menu
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuth();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const includeUnavailable =
      searchParams.get("includeUnavailable") === "true";

    const serverClient = createServerClient();

    const [categoriesRes, itemsRes] = await Promise.all([
      serverClient
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .order("name_en"),
      serverClient
        .from("menu_items")
        .select("*, categories(*)")
        .order("sort_order")
        .then((q) =>
          includeUnavailable
            ? q
            : { ...q, data: q.data?.filter((i) => i.is_available) },
        ),
    ]);

    if (categoriesRes.error) throw categoriesRes.error;
    if (itemsRes.error) throw itemsRes.error;
    return NextResponse.json({
      categories: categoriesRes.data || [],
      items: itemsRes.data || [],
    });
  } catch (e) {
    return apiError(e);
  }
}

// POST /api/menu — create menu item (admin only)
export async function POST(request: NextRequest) {
  try {
    await session(true);
    const body = await request.json();
    const serverClient = createServerClient();

    const { data, error } = await serverClient
      .from("menu_items")
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}

// PATCH /api/menu — update menu item (admin only)
export async function PATCH(request: NextRequest) {
  try {
    await session(true);
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
  } catch (e) {
    return apiError(e);
  }
}

// DELETE /api/menu
export async function DELETE(request: NextRequest) {
  try {
    await session(true);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "ID required" }, { status: 400 });

    const serverClient = createServerClient();
    const { error } = await serverClient
      .from("menu_items")
      .delete()
      .eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e) {
    return apiError(e);
  }
}
