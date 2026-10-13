import { NextResponse } from "next/server";
import { session, branchScope, apiError } from "@/lib/api";

export async function GET() {
  try {
    const auth = await session();
    const branchId = branchScope(auth);
    return NextResponse.json(
      {
        context: auth.staffId + ":" + branchId,
        expires: (auth.exp || 0) * 1000,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
