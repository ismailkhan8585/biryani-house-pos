import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { createServerClient } from "./supabase";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "biryani-house-secret"
);

export interface AuthPayload {
  branchId: string;
  branchName: string;
  role: "branch" | "admin";
  iat?: number;
  exp?: number;
}

// Sign a JWT with branch/admin payload
export async function signToken(payload: Omit<AuthPayload, "iat" | "exp">): Promise<string> {
  return await new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

// Verify a JWT and return the payload
export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthPayload;
  } catch {
    return null;
  }
}

// Get the current auth payload from the cookie (server-side)
export async function getAuth(): Promise<AuthPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("pos_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

// Require auth — throws if not authenticated
export async function requireAuth(): Promise<AuthPayload> {
  const auth = await getAuth();
  if (!auth) throw new Error("Unauthorized");
  return auth;
}

// Require admin — throws if not admin
export async function requireAdmin(): Promise<AuthPayload> {
  const auth = await requireAuth();
  if (auth.role !== "admin") throw new Error("Forbidden");
  return auth;
}

// Verify branch PIN against Supabase (with fallback)
const FALLBACK_BRANCH_PINS = [
  { id: "11111111-1111-1111-1111-111111111111", name: "Branch 1 — Main", pin: "1111", color: "#F97316" },
  { id: "22222222-2222-2222-2222-222222222222", name: "Branch 2 — City", pin: "2222", color: "#EF4444" },
  { id: "33333333-3333-3333-3333-333333333333", name: "Branch 3 — North", pin: "3333", color: "#8B5CF6" },
];

export async function verifyBranchPin(
  branchId: string,
  pin: string
): Promise<{ id: string; name: string; color: string } | null> {
  try {
    const serverClient = createServerClient();
    const { data, error } = await serverClient
      .from("branches")
      .select("id, name, color, pin")
      .eq("id", branchId)
      .eq("is_active", true)
      .single();

    if (!error && data) {
      if (data.pin !== pin) return null;
      return { id: data.id, name: data.name, color: data.color };
    }
  } catch {
    // Ignore and fallback
  }

  // Fallback check
  const fallback = FALLBACK_BRANCH_PINS.find((b) => b.id === branchId);
  if (fallback && fallback.pin === pin) {
    return { id: fallback.id, name: fallback.name, color: fallback.color };
  }
  return null;
}

// Verify master password
export function verifyMasterPassword(password: string): boolean {
  return password === process.env.MASTER_PASSWORD;
}
