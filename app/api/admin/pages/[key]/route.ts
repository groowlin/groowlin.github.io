import { NextResponse } from "next/server";
import { staticPageContentSchema } from "@/lib/cms/schemas";
import { requireAdminSession } from "@/lib/cms/auth/require-admin.server";
import { handleApiError, readJsonBody } from "@/lib/cms/api.server";
import { assertCmsEnabled } from "@/lib/cms/env";
import { getStaticPageFromDb, updateStaticPageInDb } from "@/lib/cms/db.server";
import { staticPageContentDefaults } from "@/lib/content";
import type { StaticPageKey } from "@/lib/content/types";

interface RouteParams {
  params: Promise<{ key: string }>;
}

function normalizePageKey(raw: string): StaticPageKey {
  if (raw !== "about" && raw !== "connect") {
    throw new Error(`Unsupported static page key: ${raw}`);
  }

  return raw;
}

export async function GET(_: Request, { params }: RouteParams) {
  try {
    assertCmsEnabled();
    await requireAdminSession();
    const { key: rawKey } = await params;
    const key = normalizePageKey(rawKey);
    const page = await getStaticPageFromDb(key);
    return NextResponse.json({ page: page ?? staticPageContentDefaults[key] });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    assertCmsEnabled();
    await requireAdminSession();
    const { key: rawKey } = await params;
    const key = normalizePageKey(rawKey);

    const json = await readJsonBody(request);
    const parsed = staticPageContentSchema.parse({
      ...json,
      key
    });

    const updated = await updateStaticPageInDb(parsed);
    return NextResponse.json({ page: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
