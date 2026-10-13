import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { createServerClient } from "./supabase";
export interface AuthPayload {
  branchId: string;
  branchName: string;
  role: "branch" | "admin";
  staffId: string;
  staffName: string;
  iat?: number;
  exp?: number;
}
function secret() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
    throw new Error("JWT_SECRET must have at least 32 characters");
  return new TextEncoder().encode(process.env.JWT_SECRET);
}
export async function signToken(payload: Omit<AuthPayload, "iat" | "exp">) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}
export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
    });
    if (
      typeof payload.staffId !== "string" ||
      !payload.staffId ||
      typeof payload.staffName !== "string" ||
      !payload.staffName ||
      typeof payload.branchId !== "string" ||
      !payload.branchId ||
      typeof payload.branchName !== "string" ||
      !payload.branchName ||
      typeof payload.exp !== "number" ||
      (payload.role === "branch" &&
        ["all", "admin"].includes(payload.branchId)) ||
      !["admin", "branch"].includes(String(payload.role))
    )
      return null;
    return payload as unknown as AuthPayload;
  } catch {
    return null;
  }
}
export async function getAuth(): Promise<AuthPayload | null> {
  const token = (await cookies()).get("pos_token")?.value;
  if (!token) return null;
  const auth = await verifyToken(token);
  if (!auth) return null;
  const { data, error } = await createServerClient()
    .from("staff")
    .select("id,name,role,branch_id,is_active")
    .eq("id", auth.staffId)
    .single();
  if (
    error ||
    !data?.is_active ||
    data.role !== auth.role ||
    (data.role === "branch" && data.branch_id !== auth.branchId)
  )
    return null;
  if (auth.branchId !== "all" && auth.branchId !== "admin") {
    const { data: branch, error: branchError } = await createServerClient()
      .from("branches")
      .select("name")
      .eq("id", auth.branchId)
      .eq("is_active", true)
      .single();
    if (branchError || !branch) return null;
    return { ...auth, staffName: data.name, branchName: branch.name };
  }
  return { ...auth, staffName: data.name };
}
export async function requireAuth() {
  const auth = await getAuth();
  if (!auth) throw new Error("Unauthorized");
  return auth;
}
export async function requireAdmin() {
  const auth = await requireAuth();
  if (auth.role !== "admin") throw new Error("Forbidden");
  return auth;
}
