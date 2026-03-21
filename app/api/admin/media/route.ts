import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/cms/auth/require-admin.server";
import { handleApiError } from "@/lib/cms/api.server";
import { assertCmsEnabled } from "@/lib/cms/env";
import { listMediaAssetsFromDb, uploadMediaToStorageAndDb } from "@/lib/cms/db.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    assertCmsEnabled();
    await requireAdminSession();
    const assets = await listMediaAssetsFromDb();
    return NextResponse.json(
      { assets },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate"
        }
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertCmsEnabled();
    await requireAdminSession();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Missing upload file" }, { status: 422 });
    }

    const asset = await uploadMediaToStorageAndDb(file);
    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
