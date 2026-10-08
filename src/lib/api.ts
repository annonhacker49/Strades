import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { currentUser } from "./security";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error("Database initialization failed", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "The demo database is unavailable. Start the local database or contact the site operator.",
        },
      },
      { status: 503 },
    );
  }
  console.error("Unhandled API error", error);
  return NextResponse.json(
    { success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } },
    { status: 500 },
  );
}

export async function requireUser(request: Request) {
  const user = await currentUser(request);
  if (!user) throw new ApiError("UNAUTHORIZED", "Please sign in to continue.", 401);
  if (user.suspendedAt) throw new ApiError("ACCOUNT_SUSPENDED", "This account is suspended.", 403);
  return user;
}

export async function requireAdmin(request: Request) {
  const user = await requireUser(request);
  if (user.role !== "ADMIN") throw new ApiError("FORBIDDEN", "Administrator access is required.", 403);
  return user;
}

export function parseJson<T>(request: Request, validator: (data: unknown) => T): Promise<T> {
  return request.json().then((data: unknown) => validator(data));
}

export function objectBody(data: unknown): Record<string, unknown> {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new ApiError("INVALID_INPUT", "Request body must be a JSON object.");
  }
  return data as Record<string, unknown>;
}
