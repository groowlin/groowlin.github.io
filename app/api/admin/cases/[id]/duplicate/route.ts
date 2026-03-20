import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/cms/auth/require-admin.server";
import { handleApiError } from "@/lib/cms/api.server";
import { assertCmsEnabled } from "@/lib/cms/env";
import { duplicateCaseInDb } from "@/lib/cms/db.server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_: Request, { params }: RouteParams) {
  try {
    assertCmsEnabled();
    await requireAdminSession();
    const { id } = await params;
    const result = await duplicateCaseInDb(id);

    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }

    return NextResponse.json({ caseId: result.caseId, payload: result.payload }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
