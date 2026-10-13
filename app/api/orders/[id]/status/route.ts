import { NextRequest, NextResponse } from "next/server";
import { session, apiError, ApiError } from "@/lib/api";
import { createServerClient } from "@/lib/supabase";
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await session(true);
    const { id } = await params;
    const b = await req.json();
    if (
      b.status !== "CANCELLED" ||
      typeof b.reason !== "string" ||
      b.reason.trim().length < 3
    )
      throw new ApiError(
        "Cancellation reason required; only unpaid open orders may be cancelled",
      );
    const { error } = await createServerClient().rpc("pos_cancel_order", {
      p_id: id,
      p_staff: auth.staffId,
      p_reason: b.reason.trim(),
    });
    if (error) throw new ApiError(error.message, 409);
    return NextResponse.json({ success: true });
  } catch (e) {
    return apiError(e);
  }
}
