import { NextResponse } from "next/server";
import { siteMetadataSettingsSchema } from "@/lib/cms/schemas";
import { requireAdminSession } from "@/lib/cms/auth/require-admin.server";
import { handleApiError, readJsonBody } from "@/lib/cms/api.server";
import { assertCmsEnabled } from "@/lib/cms/env";
import { getSiteMetadataSettingsFromDb, updateSiteMetadataSettingsInDb } from "@/lib/cms/db.server";
import { defaultSiteMetadataSettings } from "@/lib/content";

export async function GET() {
  try {
    assertCmsEnabled();
    await requireAdminSession();
    const settings = await getSiteMetadataSettingsFromDb();
    return NextResponse.json({ settings: settings ?? defaultSiteMetadataSettings });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertCmsEnabled();
    await requireAdminSession();
    const json = await readJsonBody(request);
    const parsed = siteMetadataSettingsSchema.parse(json);
    const updated = await updateSiteMetadataSettingsInDb(parsed);
    return NextResponse.json({ settings: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
