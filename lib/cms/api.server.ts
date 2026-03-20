import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AdminAuthError } from "@/lib/cms/auth/require-admin.server";

export function handleApiError(error: unknown) {
  if (error instanceof AdminAuthError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { message: "Validation error", issues: error.issues.map((issue) => ({ path: issue.path, message: issue.message })) },
      { status: 422 }
    );
  }

  if (error instanceof Error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
}

export async function readJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Invalid JSON payload");
  }
}
