import { NextRequest, NextResponse } from "next/server";
import { session, apiError, ApiError } from "@/lib/api";
import { createServerClient } from "@/lib/supabase";
import { hashPassword } from "@/lib/password";
export async function GET() {
  try {
    await session(true);
    const { data, error } = await createServerClient()
      .from("staff")
      .select("id,username,name,branch_id,role,is_active")
      .order("name");
    if (error) throw error;
    return NextResponse.json({ staff: data });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    const auth = await session(true);
    const b = await req.json();
    if (!b || typeof b !== "object" || Array.isArray(b))
      throw new ApiError("Staff details required");
    const db = createServerClient();
    if (
      typeof b.username !== "string" ||
      !b.username.trim() ||
      b.username.trim().length > 100 ||
      /\s/.test(b.username.trim()) ||
      typeof b.name !== "string" ||
      !b.name.trim() ||
      b.name.trim().length > 100 ||
      !["admin", "branch"].includes(b.role) ||
      (b.role === "branch" && !b.branch_id)
    )
      throw new ApiError("Name, username, role and branch required");
    if (!b.id && !b.password) throw new ApiError("Password required");
    if (
      b.password &&
      (typeof b.password !== "string" ||
        b.password.length < 8 ||
        b.password.length > 200)
    )
      throw new ApiError("Use a password of 8–200 characters");
    if (b.is_active !== undefined && typeof b.is_active !== "boolean")
      throw new ApiError("Invalid account status");
    if (b.id === auth.staffId && (b.is_active === false || b.role !== "admin"))
      throw new ApiError("Cannot disable or demote your own account");
    if (b.role === "branch") {
      const { data, error } = await db
        .from("branches")
        .select("id")
        .eq("id", b.branch_id)
        .eq("is_active", true)
        .maybeSingle();
      if (error || !data) throw new ApiError("Select an active branch");
    }
    const values = {
      username: String(b.username).trim().toLowerCase(),
      name: String(b.name).trim(),
      role: b.role,
      branch_id: b.role === "branch" ? b.branch_id : null,
      is_active: b.is_active !== false,
      ...(b.password ? { password_hash: hashPassword(b.password) } : {}),
    };
    const result = b.id
      ? await db
          .from("staff")
          .update(values)
          .eq("id", b.id)
          .select("id")
          .maybeSingle()
      : await db.from("staff").insert(values).select("id").maybeSingle();
    if (result.error?.code === "23505")
      throw new ApiError(
        "Username already exists. Choose another username.",
        409,
      );
    if (result.error) throw result.error;
    if (!result.data)
      throw new ApiError(
        "Staff account not found. Refresh and try again.",
        404,
      );
    return NextResponse.json({ success: true });
  } catch (e) {
    return apiError(e);
  }
}
