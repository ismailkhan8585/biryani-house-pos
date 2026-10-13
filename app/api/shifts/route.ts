import { NextRequest, NextResponse } from "next/server";
import { session, branchScope, apiError, ApiError } from "@/lib/api";
import { createServerClient } from "@/lib/supabase";
export async function GET(req: NextRequest) {
  try {
    const auth = await session();
    const branch = branchScope(auth, req.nextUrl.searchParams.get("branchId"));
    const { data, error } = await createServerClient()
      .from("shifts")
      .select("*")
      .eq("branch_id", branch)
      .eq("staff_id", auth.staffId)
      .eq("status", "OPEN")
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ shift: data });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    const auth = await session();
    const b = await req.json();
    const branch = branchScope(auth, b.branchId);
    const cash = Number(b.openingCash);
    if (!Number.isFinite(cash) || cash < 0)
      throw new ApiError("Invalid opening cash");
    const { data, error } = await createServerClient().rpc("pos_open_shift", {
      p_staff: auth.staffId,
      p_branch: branch,
      p_cash: cash,
    });
    if (error) throw new ApiError(error.message, 409);
    return NextResponse.json({ shift: data }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(req: NextRequest) {
  try {
    const auth = await session();
    const b = await req.json();
    const cash = Number(b.closingCash);
    if (!Number.isFinite(cash) || cash < 0)
      throw new ApiError("Invalid closing cash");
    const { data, error } = await createServerClient().rpc("pos_close_shift", {
      p_id: b.shiftId,
      p_staff: auth.staffId,
      p_cash: cash,
    });
    if (error) throw new ApiError(error.message, 409);
    return NextResponse.json({ shift: data });
  } catch (e) {
    return apiError(e);
  }
}
