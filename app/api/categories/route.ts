import { NextRequest, NextResponse } from "next/server";
import { session, apiError, ApiError } from "@/lib/api";
import { createServerClient } from "@/lib/supabase";

async function save(request: NextRequest, editing: boolean) {
  try {
    await session(true);
    const body = await request.json();
    if (!body || typeof body !== "object")
      throw new ApiError("Category details required");
    const name = typeof body.name_en === "string" ? body.name_en.trim() : "";
    const urdu = typeof body.name_ur === "string" ? body.name_ur.trim() : "";
    const icon = typeof body.icon === "string" ? body.icon.trim() : "";
    const sortOrder = body.sort_order;
    if (!name || name.length > 100)
      throw new ApiError("Enter a category name of 1–100 characters");
    if (urdu.length > 100 || !icon || icon.length > 50)
      throw new ApiError(
        "Urdu name must be at most 100 characters; an icon is required (up to 50 characters)",
      );
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999)
      throw new ApiError("Display order must be a whole number from 0 to 9999");
    if (
      editing &&
      (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id))
    )
      throw new ApiError("Invalid category ID");
    const db = createServerClient();
    const values = {
      name_en: name,
      name_ur: urdu || null,
      icon,
      sort_order: sortOrder,
    };
    // Whitelist editable fields; IDs and dish assignments are never rewritten.
    const query = editing
      ? db.from("categories").update(values).eq("id", body.id)
      : db.from("categories").insert(values);
    const { data, error } = await query.select().maybeSingle();
    if (error) throw error;
    if (!data)
      throw new ApiError("Category not found. Refresh and try again.", 404);
    return NextResponse.json(
      { category: data },
      { status: editing ? 200 : 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: NextRequest) {
  return save(request, false);
}
export async function PATCH(request: NextRequest) {
  return save(request, true);
}
