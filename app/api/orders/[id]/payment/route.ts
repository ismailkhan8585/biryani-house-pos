import { NextRequest, NextResponse } from "next/server";
import { session, apiError, ApiError } from "@/lib/api";
import { createServerClient } from "@/lib/supabase";
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await session();
    const b = await req.json();
    const { id } = await params;
    if (
      !b.shiftId ||
      !["CASH", "JAZZCASH", "EASYPAISA", "SPLIT"].includes(b.method) ||
      !Number.isFinite(Number(b.cashAmount)) ||
      Number(b.cashAmount) < 0
    )
      throw new ApiError("Valid shift and payment required");
    const { error } = await createServerClient().rpc("pos_settle_order", {
      p_id: id,
      p_shift: b.shiftId,
      p_staff: auth.staffId,
      p_method: b.method,
      p_cash: Number(b.cashAmount),
    });
    if (error) throw new ApiError(error.message, 409);
    return NextResponse.json({ success: true });
  } catch (e) {
    return apiError(e);
  }
}
