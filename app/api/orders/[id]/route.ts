import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuth } from "@/lib/auth";

// GET /api/orders/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await getAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const serverClient = createServerClient();
    const { data, error } = await serverClient
      .from("orders")
      .select("*, order_items(*), branches(name, color)")
      .eq("id", id)
      .single();

    if (error) throw error;
    return NextResponse.json({ order: data });
  } catch {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
}

// PATCH /api/orders/[id] — update order
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await getAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const serverClient = createServerClient();

    const { data, error } = await serverClient
      .from("orders")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ order: data });
  } catch {
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
