import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

// Public routes that don't require auth
const PUBLIC_ROUTES = ["/login", "/api/auth/login", "/api/auth/logout", "/api/branches"];

// Admin-only routes
const ADMIN_ROUTES = ["/admin"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Allow static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/sw.js") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Get token from cookie
  const token = request.cookies.get("pos_token")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await verifyToken(token);

  if (!payload) {
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      res.cookies.delete("pos_token");
      return res;
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("pos_token");
    return response;
  }

  // Admin-only route protection
  if (ADMIN_ROUTES.some((r) => pathname.startsWith(r))) {
    if (payload.role !== "admin") {
      return NextResponse.redirect(new URL("/pos", request.url));
    }
  }

  // Inject branch info into request headers for API routes
  // encodeURIComponent ensures non-Latin-1 chars (e.g. em dash in branch names) don't throw
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-branch-id", payload.branchId);
  requestHeaders.set("x-branch-name", encodeURIComponent(payload.branchName));
  requestHeaders.set("x-user-role", payload.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-.*\\.png|sw\\.js|workbox-.*\\.js).*)",
  ],
};
