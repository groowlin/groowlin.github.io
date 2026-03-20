import { NextResponse } from "next/server";
import { reorderCasesSchema } from "@/lib/cms/schemas";
import { requireAdminSession } from "@/lib/cms/auth/require-admin.server";
import { handleApiError, readJsonBody } from "@/lib/cms/api.server";
import { assertCmsEnabled } from "@/lib/cms/env";
import { reorderDraftCasesInDb } from "@/lib/cms/db.server";

export async function POST(request: Request) {
  try {
    assertCmsEnabled();
    await requireAdminSession();
    const json = await readJsonBody(request);
    const parsed = reorderCasesSchema.parse(json);
    await reorderDraftCasesInDb(parsed.ids);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
