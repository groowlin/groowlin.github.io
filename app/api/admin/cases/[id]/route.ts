import { NextResponse } from "next/server";
import { updateCaseSchema } from "@/lib/cms/schemas";
import { requireAdminSession } from "@/lib/cms/auth/require-admin.server";
import { handleApiError, readJsonBody } from "@/lib/cms/api.server";
import { assertCmsEnabled } from "@/lib/cms/env";
import { deleteCaseFromDb, getAdminCaseByIdFromDb, updateCaseDraftInDb } from "@/lib/cms/db.server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, { params }: RouteParams) {
  try {
    assertCmsEnabled();
    await requireAdminSession();
    const { id } = await params;
    const entry = await getAdminCaseByIdFromDb(id);

    if (!entry) {
      return NextResponse.json({ message: "Case not found" }, { status: 404 });
    }

    return NextResponse.json({ case: entry });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    assertCmsEnabled();
    await requireAdminSession();
    const { id } = await params;
    const json = await readJsonBody(request);
    const parsed = updateCaseSchema.parse(json);

    const result = await updateCaseDraftInDb(id, parsed.payload);

    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }

    return NextResponse.json({ payload: result.payload });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, { params }: RouteParams) {
  try {
    assertCmsEnabled();
    await requireAdminSession();
    const { id } = await params;
    await deleteCaseFromDb(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
