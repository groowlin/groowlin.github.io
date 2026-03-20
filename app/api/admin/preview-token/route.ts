import { NextResponse } from "next/server";
import { previewTokenRequestSchema } from "@/lib/cms/schemas";
import { requireAdminSession } from "@/lib/cms/auth/require-admin.server";
import { handleApiError, readJsonBody } from "@/lib/cms/api.server";
import { assertCmsEnabled } from "@/lib/cms/env";
import { createPreviewTokenInDb } from "@/lib/cms/db.server";

export async function POST(request: Request) {
  try {
    assertCmsEnabled();
    await requireAdminSession();
    const json = await readJsonBody(request);
    const parsed = previewTokenRequestSchema.parse(json);

    const token = await createPreviewTokenInDb(parsed.entityType, parsed.entityId);
    return NextResponse.json({ token, url: `/preview/${token}` }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
