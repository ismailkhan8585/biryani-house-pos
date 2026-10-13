import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { session, apiError, ApiError } from "@/lib/api";
const fields = "id,name,name_ur,address,phone,color,is_active,receipt_footer";
export async function GET() {
  try {
    const { data, error } = await createServerClient()
      .from("branches")
      .select(fields)
      .eq("is_active", true)
      .order("created_at");
    if (error) throw error;
    return NextResponse.json({ branches: data });
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(req: NextRequest) {
  try {
    await session(true);
    const b = await req.json();
    if (!b || typeof b.id !== "string" || !b.id)
      throw new ApiError("Branch required");
    const limits: Record<string, number> = {
      name: 100,
      name_ur: 100,
      address: 500,
      phone: 50,
      receipt_footer: 500,
      color: 7,
    };
    for (const key of Object.keys(limits)) {
      if (
        b[key] !== undefined &&
        b[key] !== null &&
        (typeof b[key] !== "string" || b[key].length > limits[key])
      )
        throw new ApiError("Invalid " + key);
    }
    if (b.name !== undefined && (typeof b.name !== "string" || !b.name.trim()))
      throw new ApiError("Branch name is required");
    if (b.color !== undefined && !/^#[0-9a-f]{6}$/i.test(b.color))
      throw new ApiError("Use a valid branch color");
    const values = Object.fromEntries(
      ["name", "name_ur", "address", "phone", "receipt_footer", "color"]
        .filter((k) => k in b)
        .map((k) => [k, b[k]]),
    );
    const { data, error } = await createServerClient()
      .from("branches")
      .update(values)
      .eq("id", b.id)
      .select(fields)
      .maybeSingle();
    if (error) throw error;
    if (!data)
      throw new ApiError("Branch not found. Refresh and try again.", 404);
    return NextResponse.json({ branch: data });
  } catch (e) {
    return apiError(e);
  }
}
