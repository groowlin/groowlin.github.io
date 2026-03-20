import { NextResponse } from "next/server";
import { siteHeaderSchema } from "@/lib/cms/schemas";
import { requireAdminSession } from "@/lib/cms/auth/require-admin.server";
import { handleApiError, readJsonBody } from "@/lib/cms/api.server";
import { assertCmsEnabled } from "@/lib/cms/env";
import { getSiteHeaderFromDb, updateSiteHeaderInDb } from "@/lib/cms/db.server";
import { defaultSiteHeaderContent } from "@/lib/content";

export async function GET() {
  try {
    assertCmsEnabled();
    await requireAdminSession();
    const header = await getSiteHeaderFromDb();
    return NextResponse.json({ header: header ?? defaultSiteHeaderContent });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertCmsEnabled();
    await requireAdminSession();
    const json = await readJsonBody(request);
    const parsed = siteHeaderSchema.parse(json);
    const updated = await updateSiteHeaderInDb(parsed);
    return NextResponse.json({ header: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
