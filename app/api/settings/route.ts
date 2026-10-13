import { session, apiError, ApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  try {
    await session();
    const serverClient = createServerClient();
    const { data, error } = await serverClient.from("settings").select("*");

    if (error) throw error;
    // Defaults apply only when settings are not yet configured.
    const settingsMap: Record<string, string> = {
      restaurant_name: "Biryani House",
      restaurant_phone: "",
      restaurant_address: "",
      receipt_footer: "Thank you for dining with us! Please visit again.",
      jazzcash_number: "",
      easypaisa_number: "",
      tax_enabled: "false",
      tax_rate: "0",
    };

    if (!error && data) {
      data.forEach((row: { key: string; value: string }) => {
        if (
          Object.hasOwn(settingsMap, row.key) ||
          ["restaurant_name_ur", "jazzcash_title", "easypaisa_title"].includes(
            row.key,
          )
        )
          settingsMap[row.key] = row.value;
      });
    }

    return NextResponse.json({ settings: settingsMap });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await session(true);

    const body = await request.json();
    const limits: Record<string, number> = {
      restaurant_name: 100,
      restaurant_name_ur: 100,
      restaurant_phone: 50,
      restaurant_address: 500,
      receipt_footer: 500,
      jazzcash_number: 50,
      jazzcash_title: 100,
      easypaisa_number: 50,
      easypaisa_title: 100,
      tax_enabled: 5,
      tax_rate: 20,
    };
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      !Object.keys(body).length
    )
      throw new ApiError("Settings are required");
    for (const [key, value] of Object.entries(body)) {
      if (!Object.hasOwn(limits, key))
        throw new ApiError("Unsupported setting: " + key);
      if (typeof value !== "string" || value.length > limits[key])
        throw new ApiError("Invalid value for " + key);
    }
    if (body.restaurant_name !== undefined && !body.restaurant_name.trim())
      throw new ApiError("Restaurant name is required");
    if (
      body.tax_rate !== undefined &&
      (!body.tax_rate.trim() ||
        !Number.isFinite(Number(body.tax_rate)) ||
        Number(body.tax_rate) < 0 ||
        Number(body.tax_rate) > 100)
    )
      throw new ApiError("Tax rate must be between 0 and 100");
    if (
      body.tax_enabled !== undefined &&
      !["true", "false"].includes(String(body.tax_enabled))
    )
      throw new ApiError("Invalid tax setting");
    const serverClient = createServerClient();

    // Upsert each key/value
    const updates = Object.entries(body).map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await serverClient
      .from("settings")
      .upsert(updates, { onConflict: "key" });
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
