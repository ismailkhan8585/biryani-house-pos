import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuth } from "@/lib/auth";
import { generateShiftNumber } from "@/lib/utils";

// GET /api/shifts — get current shift for branch
export async function GET() {
  try {
    const auth = await getAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const serverClient = createServerClient();
    const { data, error } = await serverClient
      .from("shifts")
      .select("*")
      .eq("branch_id", auth.branchId)
      .eq("status", "OPEN")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ shift: data });
  } catch {
    return NextResponse.json({ error: "Failed to fetch shift" }, { status: 500 });
  }
}

// POST /api/shifts — open new shift
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { operatorName, openingCash } = body;

    const serverClient = createServerClient();
    const shiftNumber = generateShiftNumber(auth.branchName);

    const { data, error } = await serverClient
      .from("shifts")
      .insert({
        branch_id: auth.branchId,
        shift_number: shiftNumber,
        operator_name: operatorName || "Cashier",
        opening_cash: openingCash || 0,
        status: "OPEN",
        opened_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ shift: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to open shift" }, { status: 500 });
  }
}

// PATCH /api/shifts — close shift
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { shiftId, closingCash, expectedCash } = body;

    const cashDifference = closingCash - expectedCash;

    const serverClient = createServerClient();
    const { data, error } = await serverClient
      .from("shifts")
      .update({
        status: "CLOSED",
        closing_cash: closingCash,
        expected_cash: expectedCash,
        cash_difference: cashDifference,
        closed_at: new Date().toISOString(),
      })
      .eq("id", shiftId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ shift: data });
  } catch {
    return NextResponse.json({ error: "Failed to close shift" }, { status: 500 });
  }
}
