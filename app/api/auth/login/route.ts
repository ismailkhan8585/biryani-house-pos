import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { signToken, verifyBranchPin, verifyMasterPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, branchId, pin, password } = body;

    if (type === "branch") {
      // Branch PIN login
      if (!branchId || !pin) {
        return NextResponse.json({ error: "Branch ID and PIN required" }, { status: 400 });
      }

      const branch = await verifyBranchPin(branchId, pin);
      if (!branch) {
        return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
      }

      const token = await signToken({
        branchId: branch.id,
        branchName: branch.name,
        role: "branch",
      });

      const response = NextResponse.json({
        success: true,
        branch: { id: branch.id, name: branch.name, color: branch.color },
        role: "branch",
      });

      response.cookies.set("pos_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      });

      return response;
    }

    if (type === "admin") {
      // Master admin login
      if (!password) {
        return NextResponse.json({ error: "Password required" }, { status: 400 });
      }

      if (!verifyMasterPassword(password)) {
        return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
      }

      // Admin logs in with a default "admin" branch context
      let firstBranch: { id: string; name: string; color: string } | null = null;
      try {
        const serverClient = createServerClient();
        const { data } = await serverClient
          .from("branches")
          .select("id, name, color")
          .eq("is_active", true)
          .order("created_at")
          .limit(1)
          .single();
        if (data) firstBranch = data;
      } catch {
        // ignore
      }

      const token = await signToken({
        branchId: firstBranch?.id || "admin",
        branchName: "All Branches",
        role: "admin",
      });

      const response = NextResponse.json({
        success: true,
        branch: { id: firstBranch?.id || "admin", name: "All Branches", color: "#F97316" },
        role: "admin",
      });

      response.cookies.set("pos_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24,
        path: "/",
      });

      return response;
    }

    return NextResponse.json({ error: "Invalid login type" }, { status: 400 });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
