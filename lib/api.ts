import { NextResponse } from "next/server";
import { getAuth, type AuthPayload } from "./auth";
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function session(admin = false) {
  const auth = await getAuth();
  if (!auth) throw new ApiError("Please sign in again", 401);
  if (admin && auth.role !== "admin")
    throw new ApiError("Administrator permission required", 403);
  return auth;
}
export function branchScope(
  auth: AuthPayload,
  requested?: string | null,
  allowAll = false,
) {
  if (auth.role !== "admin") {
    if (requested && requested !== auth.branchId)
      throw new ApiError("Branch access denied", 403);
    return auth.branchId;
  }
  const branch = requested || auth.branchId;
  if (!branch || branch === "all" || branch === "admin") {
    if (allowAll) return null;
    throw new ApiError("Select a branch before continuing");
  }
  return branch;
}
export function apiError(error: unknown) {
  if (error instanceof ApiError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof Error && error.message === "Invalid date")
    return NextResponse.json(
      { error: "Use a valid date (YYYY-MM-DD)" },
      { status: 400 },
    );
  console.error(error);
  return NextResponse.json(
    {
      error:
        "Could not save or load data. Please retry; no success has been confirmed.",
    },
    { status: 503 },
  );
}
