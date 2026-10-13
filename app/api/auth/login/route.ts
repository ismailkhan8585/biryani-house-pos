import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { signToken } from "@/lib/auth";
import { checkPassword, hashPassword } from "@/lib/password";
import { ApiError, apiError } from "@/lib/api";
export async function POST(request: NextRequest) {
  try {
    const { username, password, branchId, role } = await request.json();
    // Older clients may omit the choice; privileges always come from the account.
    if (role !== undefined && role !== "admin" && role !== "branch")
      throw new ApiError("Select Admin or Cashier");
    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      !username.trim() ||
      username.trim().length > 100 ||
      !password ||
      password.length > 200
    )
      throw new ApiError("Username and password required");
    const db = createServerClient();
    const name = username.trim().toLowerCase();
    const { data: rate, error: rateError } = await db.rpc("pos_login_attempt", {
      p_username: name,
    });
    if (rateError) throw rateError;
    if (!rate)
      throw new ApiError("Too many attempts. Try again in 15 minutes.", 429);
    const { data: foundStaff, error } = await db
      .from("staff")
      .select("*")
      .eq("username", name)
      .maybeSingle();
    if (error) throw error;
    let staff = foundStaff;
    // Bootstrap a single named owner account. Subsequent logins always use its stored hash.
    if (
      !staff &&
      role !== "branch" &&
      name === (process.env.ADMIN_USERNAME || "owner").trim().toLowerCase() &&
      process.env.MASTER_PASSWORD &&
      password === process.env.MASTER_PASSWORD
    ) {
      const result = await db
        .from("staff")
        .insert({
          username: name,
          name: "Owner",
          role: "admin",
          password_hash: hashPassword(password),
        })
        .select()
        .single();
      if (result.error) throw result.error;
      staff = result.data;
    }
    if (
      !staff?.is_active ||
      !["admin", "branch"].includes(staff.role) ||
      !checkPassword(password, staff.password_hash)
    )
      throw new ApiError("Invalid username or password", 401);
    if (role !== undefined && role !== staff.role)
      throw new ApiError(
        "This account cannot sign in with the selected role. Choose the role assigned to your account.",
        403,
      );
    let branch = { id: "all", name: "All Branches", color: "#F97316" };
    if (staff.role === "branch") {
      if (branchId && branchId !== staff.branch_id)
        throw new ApiError("This staff account belongs to another branch", 403);
      const result = await db
        .from("branches")
        .select("id,name,color")
        .eq("id", staff.branch_id)
        .eq("is_active", true)
        .single();
      if (result.error || !result.data)
        throw new ApiError("Branch unavailable", 403);
      branch = result.data;
    }
    const token = await signToken({
      branchId: branch.id,
      branchName: branch.name,
      role: staff.role,
      staffId: staff.id,
      staffName: staff.name,
    });
    const response = NextResponse.json({
      success: true,
      branch,
      role: staff.role,
    });
    response.cookies.set("pos_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 43200,
      path: "/",
    });
    return response;
  } catch (e) {
    return apiError(e);
  }
}
