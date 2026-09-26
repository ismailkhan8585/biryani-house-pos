import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getAuth } from "@/lib/auth";

export async function GET() {
  try {
    const serverClient = createServerClient();
    const { data, error } = await serverClient.from("settings").select("*");
    
    // Default fallback settings if DB is not populated yet
    const settingsMap: Record<string, string> = {
      restaurant_name: "Biryani House",
      restaurant_phone: "0300-0000000",
      restaurant_address: "Shop # 12, Main Food Street",
      receipt_footer: "Thank you for dining with us! Please visit again.",
      jazzcash_number: "0300-0000000",
      easypaisa_number: "0300-0000000",
      tax_enabled: "false",
      tax_rate: "0",
    };

    if (!error && data) {
      data.forEach((row: { key: string; value: string }) => {
        settingsMap[row.key] = row.value;
      });
    }

    return NextResponse.json({ settings: settingsMap });
  } catch (err) {
    console.error("GET /api/settings error:", err);
    return NextResponse.json({
      settings: {
        restaurant_name: "Biryani House",
        restaurant_phone: "0300-0000000",
        jazzcash_number: "0300-0000000",
        easypaisa_number: "0300-0000000",
      },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth();
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized — Admin only" }, { status: 401 });
    }

    const body = await request.json();
    const serverClient = createServerClient();

    // Upsert each key/value
    const updates = Object.entries(body).map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString(),
    }));

    for (const item of updates) {
      await serverClient.from("settings").upsert(item, { onConflict: "key" });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/settings error:", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
