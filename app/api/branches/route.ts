import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuth, requireAdmin } from "@/lib/auth";

const FALLBACK_BRANCHES = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Branch 1 — Main",
    name_ur: "برانچ ۱ — مین",
    address: "Shop #1-3, Food Street",
    phone: "0300-1111111",
    pin: "1111",
    color: "#F97316",
    is_active: true,
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Branch 2 — City",
    name_ur: "برانچ ۲ — سٹی",
    address: "Commercial Market, Block B",
    phone: "0300-2222222",
    pin: "2222",
    color: "#EF4444",
    is_active: true,
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Branch 3 — North",
    name_ur: "برانچ ۳ — نارتھ",
    address: "Sector F-7, North Avenue",
    phone: "0300-3333333",
    pin: "3333",
    color: "#8B5CF6",
    is_active: true,
  },
];

export async function GET() {
  try {
    const auth = await getAuth();
    const serverClient = createServerClient();
    
    // If admin, select PIN as well for management
    const selectFields = auth?.role === "admin"
      ? "id, name, name_ur, address, phone, pin, color, is_active"
      : "id, name, name_ur, address, color";

    const { data, error } = await serverClient
      .from("branches")
      .select(selectFields)
      .eq("is_active", true)
      .order("created_at");

    if (error || !data || data.length === 0) {
      return NextResponse.json({ branches: FALLBACK_BRANCHES });
    }
    return NextResponse.json({ branches: data });
  } catch {
    return NextResponse.json({ branches: FALLBACK_BRANCHES });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "Branch ID required" }, { status: 400 });

    const serverClient = createServerClient();
    const { data, error } = await serverClient
      .from("branches")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ branch: data });
  } catch {
    return NextResponse.json({ error: "Failed to update branch" }, { status: 500 });
  }
}
