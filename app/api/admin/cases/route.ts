import { NextResponse } from "next/server";
import { createCaseSchema } from "@/lib/cms/schemas";
import { requireAdminSession } from "@/lib/cms/auth/require-admin.server";
import { handleApiError, readJsonBody } from "@/lib/cms/api.server";
import { assertCmsEnabled } from "@/lib/cms/env";
import { createCaseDraftInDb, getAdminCasesFromDb } from "@/lib/cms/db.server";

export async function GET() {
  try {
    assertCmsEnabled();
    await requireAdminSession();
    const cases = await getAdminCasesFromDb();
    return NextResponse.json({ cases });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertCmsEnabled();
    await requireAdminSession();
    const json = await readJsonBody(request);
    const parsed = createCaseSchema.parse(json);

    const result = await createCaseDraftInDb(parsed.payload);

    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }

    return NextResponse.json({ caseId: result.caseId, payload: result.payload }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
