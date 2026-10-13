import { NextRequest, NextResponse } from "next/server";
import { session, apiError, ApiError } from "@/lib/api";
import { signToken } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
export async function POST(req: NextRequest) {
  try {
    const auth = await session(true);
    const { branchId } = await req.json();
    const { data, error } = await createServerClient()
      .from("branches")
      .select("id,name")
      .eq("id", branchId)
      .eq("is_active", true)
      .single();
    if (error || !data) throw new ApiError("Select an active branch");
    const token = await signToken({
      branchId: data.id,
      branchName: data.name,
      role: auth.role,
      staffId: auth.staffId,
      staffName: auth.staffName,
    });
    const res = NextResponse.json({ branch: data });
    res.cookies.set("pos_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 43200,
      path: "/",
    });
    return res;
  } catch (e) {
    return apiError(e);
  }
}
