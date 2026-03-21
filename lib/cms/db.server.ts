import "server-only";

import { randomBytes } from "node:crypto";
import path from "node:path";
import { createHash } from "node:crypto";
import { v7 as uuidv7 } from "uuid";
import { workCaseSchema } from "@/lib/content/work-schema";
import type {
  HomeWorkEntry,
  NavEntry,
  SiteHeaderContent,
  SiteMetadataSettings,
  StaticPageContent,
  StaticPageKey,
  WorkCase
} from "@/lib/content/types";
import { defaultSiteHeaderContent, defaultSiteMetadataSettings } from "@/lib/content";
import type { AdminCaseListItem } from "@/lib/cms/types";
import { siteHeaderSchema, siteMetadataSettingsSchema, staticPageContentSchema } from "@/lib/cms/schemas";
import { getStorageBucketName } from "@/lib/cms/env";
import { createSupabaseAdminClient } from "@/lib/cms/supabase.server";

interface CmsCaseRow {
  id: string;
  slug: string;
  draft_payload: unknown;
  published_payload: unknown | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

interface CmsCaseOrderRow {
  case_id: string;
  draft_sort_order: number;
  published_sort_order: number | null;
}

interface CmsSiteHeaderRow {
  id: string;
  name: string;
  role_prefix: string;
  role_company_label: string;
  role_company_href: string;
  logo_alt: string;
  meta_nav: unknown;
  site_url: string;
  site_name: string;
  default_title: string;
  title_template: string;
  default_description: string;
  default_og_image: string | null;
  favicon_url: string | null;
  robots_index_by_default: boolean;
}

interface CmsStaticPageRow {
  key: StaticPageKey;
  content_blocks: unknown;
  meta: unknown;
}

interface CmsMediaAssetRow {
  id: string;
  path: string;
  public_url: string;
  kind: "image" | "video" | "gif";
  mime: string;
  size: number;
  created_at: string;
}

interface CmsPreviewTokenRow {
  token_hash: string;
  entity_type: "case";
  entity_id: string;
  created_at: string;
  used_at: string | null;
}

function isMissingSiteMetadataColumnsError(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  if (error.code === "42703") {
    return true;
  }

  return Boolean(error.message?.includes("site_url"));
}

function parseWorkCase(payload: unknown) {
  const parsed = workCaseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(`Invalid work case payload: ${parsed.error.message}`);
  }
  return parsed.data;
}

function withSortOrder(entry: WorkCase, sortOrder: number): WorkCase {
  return {
    ...entry,
    sortOrder
  };
}

function normalizeSiteUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (host === "example.com" || host === "www.example.com") {
      return defaultSiteMetadataSettings.siteUrl;
    }
    return value;
  } catch {
    return defaultSiteMetadataSettings.siteUrl;
  }
}

function formatSiteHeader(row: CmsSiteHeaderRow): SiteHeaderContent {
  const role = `${row.role_prefix} ${row.role_company_label}`.trim();
  const parsed = siteHeaderSchema.safeParse({
    identity: {
      name: row.name,
      role,
      rolePrefix: row.role_prefix,
      roleCompanyLabel: row.role_company_label,
      roleCompanyHref: row.role_company_href,
      logoAlt: row.logo_alt
    },
    metaNav: row.meta_nav
  });

  if (!parsed.success) {
    throw new Error(`Invalid site header payload in DB: ${parsed.error.message}`);
  }

  return parsed.data;
}

function formatStaticPage(row: CmsStaticPageRow): StaticPageContent {
  const parsed = staticPageContentSchema.safeParse({
    key: row.key,
    meta: row.meta,
    blocks: row.content_blocks
  });

  if (!parsed.success) {
    throw new Error(`Invalid static page payload for ${row.key}: ${parsed.error.message}`);
  }

  return {
    key: parsed.data.key,
    meta: parsed.data.meta,
    blocks: parsed.data.blocks
  };
}

function formatSiteMetadataSettings(row: CmsSiteHeaderRow): SiteMetadataSettings {
  const parsed = siteMetadataSettingsSchema.safeParse({
    siteUrl: normalizeSiteUrl(row.site_url),
    siteName: row.site_name,
    defaultTitle: row.default_title,
    titleTemplate: row.title_template,
    defaultDescription: row.default_description,
    defaultOgImage: row.default_og_image ?? "",
    faviconUrl: row.favicon_url ?? "",
    robotsIndexByDefault: row.robots_index_by_default
  });

  if (!parsed.success) {
    throw new Error(`Invalid site metadata payload in DB: ${parsed.error.message}`);
  }

  return parsed.data;
}

async function getCaseOrdersMap() {
  const client = createSupabaseAdminClient();
  const { data, error } = await client.from("cms_case_order").select("case_id,draft_sort_order,published_sort_order");

  if (error) {
    throw new Error(`Failed to load case order rows: ${error.message}`);
  }

  const rows = (data ?? []) as CmsCaseOrderRow[];
  return new Map(rows.map((row) => [row.case_id, row]));
}

function getSortOrderForMode(orderRow: CmsCaseOrderRow | undefined, mode: "draft" | "published") {
  if (!orderRow) {
    return Number.MAX_SAFE_INTEGER;
  }

  if (mode === "draft") {
    return orderRow.draft_sort_order;
  }

  return orderRow.published_sort_order ?? Number.MAX_SAFE_INTEGER;
}

function normalizeCaseArray(rows: CmsCaseRow[], orderMap: Map<string, CmsCaseOrderRow>, mode: "draft" | "published") {
  return rows
    .map((row) => {
      const payload = mode === "draft" ? row.draft_payload : row.published_payload;
      if (!payload) {
        return null;
      }

      const parsed = parseWorkCase(payload);
      const sortOrder = getSortOrderForMode(orderMap.get(row.id), mode);
      return {
        row,
        payload: withSortOrder(parsed, sortOrder)
      };
    })
    .filter((entry): entry is { row: CmsCaseRow; payload: WorkCase } => Boolean(entry))
    .sort((a, b) => a.payload.sortOrder - b.payload.sortOrder);
}

export async function getPublishedCasesFromDb() {
  const client = createSupabaseAdminClient();
  const [casesResult, orderMap] = await Promise.all([
    client
      .from("cms_cases")
      .select("id,slug,draft_payload,published_payload,is_published,created_at,updated_at,published_at")
      .eq("is_published", true),
    getCaseOrdersMap()
  ]);

  if (casesResult.error) {
    throw new Error(`Failed to load published cases: ${casesResult.error.message}`);
  }

  const rows = (casesResult.data ?? []) as CmsCaseRow[];
  return normalizeCaseArray(rows, orderMap, "published")
    .map((entry) => entry.payload)
    .filter((entry) => entry.status === "published");
}

export async function getPublishedCaseBySlugFromDb(slug: string) {
  const cases = await getPublishedCasesFromDb();
  return cases.find((entry) => entry.slug === slug);
}

export async function getPublishedSlugsFromDb() {
  const cases = await getPublishedCasesFromDb();
  return cases.map((entry) => entry.slug);
}

export async function getHomeEntriesFromDb(): Promise<HomeWorkEntry[]> {
  const cases = await getPublishedCasesFromDb();

  return cases.map((entry) => ({
    label: entry.summary.title,
    year: entry.summary.year,
    category: entry.summary.category,
    href: `/work/${entry.slug}`,
    preview: entry.summary.preview
  }));
}

async function getNextDraftSortOrder() {
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from("cms_case_order")
    .select("draft_sort_order")
    .order("draft_sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch next draft sort order: ${error.message}`);
  }

  const top = data?.draft_sort_order ?? 0;
  return top + 10;
}

export async function getAdminCasesFromDb(): Promise<AdminCaseListItem[]> {
  const client = createSupabaseAdminClient();
  const [casesResult, orderMap] = await Promise.all([
    client
      .from("cms_cases")
      .select("id,slug,draft_payload,published_payload,is_published,created_at,updated_at,published_at"),
    getCaseOrdersMap()
  ]);

  if (casesResult.error) {
    throw new Error(`Failed to load admin cases: ${casesResult.error.message}`);
  }

  const rows = (casesResult.data ?? []) as CmsCaseRow[];
  const normalized = normalizeCaseArray(rows, orderMap, "draft");

  return normalized.map((entry) => ({
    id: entry.row.id,
    slug: entry.row.slug,
    isPublished: entry.row.is_published,
    draftSortOrder: orderMap.get(entry.row.id)?.draft_sort_order ?? entry.payload.sortOrder,
    publishedSortOrder: orderMap.get(entry.row.id)?.published_sort_order ?? null,
    updatedAt: entry.row.updated_at,
    summaryTitle: entry.payload.summary.title,
    summaryYear: entry.payload.summary.year
  }));
}

export async function getAdminCaseByIdFromDb(id: string) {
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from("cms_cases")
    .select("id,slug,draft_payload,published_payload,is_published,created_at,updated_at,published_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load case ${id}: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const draft = parseWorkCase(data.draft_payload);
  return {
    id: data.id,
    slug: data.slug,
    isPublished: data.is_published,
    draft: draft,
    published: data.published_payload ? parseWorkCase(data.published_payload) : null
  };
}

async function ensureSlugIsUnique(slug: string, excludeCaseId?: string) {
  const client = createSupabaseAdminClient();
  let query = client.from("cms_cases").select("id").eq("slug", slug).limit(1);
  if (excludeCaseId) {
    query = query.neq("id", excludeCaseId);
  }
  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to check slug uniqueness: ${error.message}`);
  }

  return (data ?? []).length === 0;
}

function getDuplicateSlug(baseSlug: string, index: number) {
  if (index === 1) {
    return `${baseSlug}-copy`;
  }
  return `${baseSlug}-copy-${index}`;
}

async function generateUniqueDuplicateSlug(baseSlug: string) {
  let index = 1;
  while (index < 500) {
    const candidate = getDuplicateSlug(baseSlug, index);
    const isUnique = await ensureSlugIsUnique(candidate);
    if (isUnique) {
      return candidate;
    }
    index += 1;
  }
  throw new Error("Failed to generate unique slug for duplicate case");
}

export async function createCaseDraftInDb(payload: WorkCase) {
  const client = createSupabaseAdminClient();
  const parsed = parseWorkCase(payload);
  const isUnique = await ensureSlugIsUnique(parsed.slug);

  if (!isUnique) {
    return { ok: false as const, status: 409 as const, message: "Case slug already exists" };
  }

  const id = uuidv7();
  const now = new Date().toISOString();
  const nextSortOrder = await getNextDraftSortOrder();

  const withSort = {
    ...parsed,
    id,
    sortOrder: nextSortOrder
  };

  const caseInsert = await client.from("cms_cases").insert({
    id,
    slug: withSort.slug,
    draft_payload: withSort,
    published_payload: null,
    is_published: false,
    created_at: now,
    updated_at: now,
    published_at: null
  });

  if (caseInsert.error) {
    if (caseInsert.error.code === "23505") {
      return { ok: false as const, status: 409 as const, message: "Case slug already exists" };
    }
    throw new Error(`Failed to create case: ${caseInsert.error.message}`);
  }

  const orderInsert = await client.from("cms_case_order").insert({
    case_id: id,
    draft_sort_order: nextSortOrder,
    published_sort_order: null
  });

  if (orderInsert.error) {
    throw new Error(`Failed to create case order row: ${orderInsert.error.message}`);
  }

  return { ok: true as const, caseId: id, payload: withSort };
}

export async function updateCaseDraftInDb(caseId: string, payload: WorkCase) {
  const client = createSupabaseAdminClient();
  const parsed = parseWorkCase(payload);

  const isUnique = await ensureSlugIsUnique(parsed.slug, caseId);
  if (!isUnique) {
    return { ok: false as const, status: 409 as const, message: "Case slug already exists" };
  }

  const { data: orderRow, error: orderError } = await client
    .from("cms_case_order")
    .select("draft_sort_order")
    .eq("case_id", caseId)
    .maybeSingle();

  if (orderError) {
    throw new Error(`Failed to load case sort order: ${orderError.message}`);
  }

  const draftSortOrder = orderRow?.draft_sort_order ?? parsed.sortOrder;

  const updatePayload = {
    ...parsed,
    id: caseId,
    sortOrder: draftSortOrder
  };

  const { data, error } = await client
    .from("cms_cases")
    .update({
      slug: updatePayload.slug,
      draft_payload: updatePayload,
      updated_at: new Date().toISOString()
    })
    .eq("id", caseId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, status: 409 as const, message: "Case slug already exists" };
    }
    throw new Error(`Failed to update case: ${error.message}`);
  }

  if (!data) {
    return { ok: false as const, status: 404 as const, message: "Case not found" };
  }

  return { ok: true as const, payload: updatePayload };
}

export async function publishCaseFromDraftInDb(caseId: string) {
  const client = createSupabaseAdminClient();
  const [caseRowResult, orderRowResult] = await Promise.all([
    client
      .from("cms_cases")
      .select("id,slug,draft_payload")
      .eq("id", caseId)
      .maybeSingle(),
    client.from("cms_case_order").select("draft_sort_order").eq("case_id", caseId).maybeSingle()
  ]);

  if (caseRowResult.error) {
    throw new Error(`Failed to load case for publish: ${caseRowResult.error.message}`);
  }
  if (orderRowResult.error) {
    throw new Error(`Failed to load case order for publish: ${orderRowResult.error.message}`);
  }

  if (!caseRowResult.data) {
    return { ok: false as const, status: 404 as const, message: "Case not found" };
  }

  const draftSortOrder = orderRowResult.data?.draft_sort_order ?? 0;
  const draftPayload = parseWorkCase(caseRowResult.data.draft_payload);
  const publishedPayload = {
    ...draftPayload,
    sortOrder: draftSortOrder,
    status: "published" as const
  };

  const now = new Date().toISOString();

  const [caseUpdate, orderUpdate] = await Promise.all([
    client
      .from("cms_cases")
      .update({
        is_published: true,
        published_payload: publishedPayload,
        published_at: now,
        updated_at: now
      })
      .eq("id", caseId),
    client
      .from("cms_case_order")
      .update({ published_sort_order: draftSortOrder })
      .eq("case_id", caseId)
  ]);

  if (caseUpdate.error) {
    throw new Error(`Failed to publish case: ${caseUpdate.error.message}`);
  }

  if (orderUpdate.error) {
    throw new Error(`Failed to publish case order: ${orderUpdate.error.message}`);
  }

  return { ok: true as const };
}

export async function deleteCaseFromDb(caseId: string) {
  const client = createSupabaseAdminClient();
  const [orderDelete, caseDelete] = await Promise.all([
    client.from("cms_case_order").delete().eq("case_id", caseId),
    client.from("cms_cases").delete().eq("id", caseId)
  ]);

  if (orderDelete.error) {
    throw new Error(`Failed to delete case order row: ${orderDelete.error.message}`);
  }

  if (caseDelete.error) {
    throw new Error(`Failed to delete case row: ${caseDelete.error.message}`);
  }

  return { ok: true as const };
}

export async function duplicateCaseInDb(caseId: string) {
  const source = await getAdminCaseByIdFromDb(caseId);
  if (!source) {
    return { ok: false as const, status: 404 as const, message: "Case not found" };
  }

  const duplicateSlug = await generateUniqueDuplicateSlug(source.draft.slug);
  const nextSortOrder = await getNextDraftSortOrder();
  const newCaseId = uuidv7();

  const duplicatePayload: WorkCase = {
    ...source.draft,
    id: newCaseId,
    slug: duplicateSlug,
    sortOrder: nextSortOrder,
    summary: {
      ...source.draft.summary,
      title: `${source.draft.summary.title} (copy)`
    },
    status: "hidden"
  };

  const createResult = await createCaseDraftInDb(duplicatePayload);
  if (!createResult.ok) {
    return createResult;
  }

  return {
    ok: true as const,
    caseId: createResult.caseId,
    payload: createResult.payload
  };
}

export async function reorderDraftCasesInDb(ids: string[]) {
  const client = createSupabaseAdminClient();
  const { data: caseRows, error: casesError } = await client
    .from("cms_cases")
    .select("id,is_published")
    .in("id", ids);

  if (casesError) {
    throw new Error(`Failed to load cases for reorder: ${casesError.message}`);
  }

  const publishedMap = new Map((caseRows ?? []).map((row) => [row.id, row.is_published]));

  const updates = ids.map((caseId, index) =>
    {
      const nextSortOrder = (index + 1) * 10;
      const updatePayload: { draft_sort_order: number; published_sort_order?: number } = {
        draft_sort_order: nextSortOrder
      };

      if (publishedMap.get(caseId)) {
        updatePayload.published_sort_order = nextSortOrder;
      }

      return client.from("cms_case_order").update(updatePayload).eq("case_id", caseId);
    }
  );

  const results = await Promise.all(updates);

  const firstError = results.find((result) => result.error);
  if (firstError?.error) {
    throw new Error(`Failed to reorder cases: ${firstError.error.message}`);
  }

  return { ok: true as const };
}

export async function getSiteHeaderFromDb() {
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from("cms_site_header")
    .select("id,name,role_prefix,role_company_label,role_company_href,logo_alt,meta_nav")
    .eq("id", "site")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load site header: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return formatSiteHeader(data as CmsSiteHeaderRow);
}

export async function updateSiteHeaderInDb(payload: SiteHeaderContent) {
  const parsed = siteHeaderSchema.parse(payload);
  const normalized = {
    ...parsed,
    identity: {
      ...parsed.identity,
      role: `${parsed.identity.rolePrefix} ${parsed.identity.roleCompanyLabel}`.trim()
    }
  } satisfies SiteHeaderContent;
  const client = createSupabaseAdminClient();

  const { error } = await client.from("cms_site_header").upsert({
    id: "site",
    name: normalized.identity.name,
    role_prefix: normalized.identity.rolePrefix,
    role_company_label: normalized.identity.roleCompanyLabel,
    role_company_href: normalized.identity.roleCompanyHref,
    logo_alt: normalized.identity.logoAlt,
    meta_nav: normalized.metaNav as NavEntry[]
  });

  if (error) {
    throw new Error(`Failed to update site header: ${error.message}`);
  }

  return normalized;
}

export async function getSiteMetadataSettingsFromDb() {
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from("cms_site_header")
    .select(
      "id,name,role_prefix,role_company_label,role_company_href,logo_alt,meta_nav,site_url,site_name,default_title,title_template,default_description,default_og_image,favicon_url,robots_index_by_default"
    )
    .eq("id", "site")
    .maybeSingle();

  if (error) {
    if (isMissingSiteMetadataColumnsError(error)) {
      return null;
    }
    throw new Error(`Failed to load site metadata settings: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return formatSiteMetadataSettings(data as CmsSiteHeaderRow);
}

export async function updateSiteMetadataSettingsInDb(payload: SiteMetadataSettings) {
  const parsed = siteMetadataSettingsSchema.parse(payload);
  const normalizedSiteUrl = normalizeSiteUrl(parsed.siteUrl);
  const client = createSupabaseAdminClient();

  const { data: existing, error: existingError } = await client
    .from("cms_site_header")
    .select("name,role_prefix,role_company_label,role_company_href,logo_alt,meta_nav")
    .eq("id", "site")
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to load existing site header while updating metadata: ${existingError.message}`);
  }

  const identityFallback = existing
    ? {
        name: existing.name,
        rolePrefix: existing.role_prefix,
        roleCompanyLabel: existing.role_company_label,
        roleCompanyHref: existing.role_company_href,
        logoAlt: existing.logo_alt
      }
    : defaultSiteHeaderContent.identity;
  const metaNavFallback = (existing?.meta_nav as NavEntry[] | undefined) ?? defaultSiteHeaderContent.metaNav;

  const { error } = await client.from("cms_site_header").upsert({
    id: "site",
    name: identityFallback.name,
    role_prefix: identityFallback.rolePrefix,
    role_company_label: identityFallback.roleCompanyLabel,
    role_company_href: identityFallback.roleCompanyHref,
    logo_alt: identityFallback.logoAlt,
    meta_nav: metaNavFallback,
    site_url: normalizedSiteUrl,
    site_name: parsed.siteName,
    default_title: parsed.defaultTitle,
    title_template: parsed.titleTemplate,
    default_description: parsed.defaultDescription,
    default_og_image: parsed.defaultOgImage?.trim() ? parsed.defaultOgImage : null,
    favicon_url: parsed.faviconUrl?.trim() ? parsed.faviconUrl : null,
    robots_index_by_default: parsed.robotsIndexByDefault
  });

  if (error) {
    if (isMissingSiteMetadataColumnsError(error)) {
      throw new Error(
        "Missing CMS columns for site metadata. Run migrations 20260321_add_site_metadata_settings.sql and 20260321_add_favicon_to_site_metadata.sql, then try again."
      );
    }
    throw new Error(`Failed to update site metadata settings: ${error.message}`);
  }

  return {
    ...defaultSiteMetadataSettings,
    ...parsed,
    siteUrl: normalizedSiteUrl
  };
}

export async function getStaticPageFromDb(key: StaticPageKey) {
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from("cms_static_pages")
    .select("key,content_blocks,meta")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load static page ${key}: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return formatStaticPage(data as CmsStaticPageRow);
}

export async function updateStaticPageInDb(content: StaticPageContent) {
  const parsed = staticPageContentSchema.parse(content);
  const client = createSupabaseAdminClient();

  const { error } = await client.from("cms_static_pages").upsert({
    key: parsed.key,
    content_blocks: parsed.blocks,
    meta: parsed.meta
  });

  if (error) {
    throw new Error(`Failed to update static page ${content.key}: ${error.message}`);
  }

  return parsed;
}

function normalizeFileName(filename: string) {
  return filename
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

function getMediaKindFromMime(mime: string): "image" | "video" | "gif" {
  if (mime === "image/gif") {
    return "gif";
  }

  if (mime.startsWith("video/")) {
    return "video";
  }

  return "image";
}

export async function listMediaAssetsFromDb() {
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from("cms_media_assets")
    .select("id,path,public_url,kind,mime,size,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load media assets: ${error.message}`);
  }

  return (data ?? []) as CmsMediaAssetRow[];
}

export async function uploadMediaToStorageAndDb(file: File) {
  const client = createSupabaseAdminClient();
  const bucket = getStorageBucketName();

  const safeName = normalizeFileName(file.name);
  const extension = path.extname(safeName);
  const nameWithoutExt = safeName.replace(extension, "") || "asset";
  const objectPath = `${new Date().toISOString().slice(0, 10)}/${Date.now()}-${nameWithoutExt}${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const upload = await client.storage.from(bucket).upload(objectPath, buffer, {
    contentType: file.type,
    upsert: false,
    cacheControl: "3600"
  });

  if (upload.error) {
    throw new Error(`Failed to upload media: ${upload.error.message}`);
  }

  const publicUrlResult = client.storage.from(bucket).getPublicUrl(objectPath);
  const publicUrl = publicUrlResult.data.publicUrl;
  const kind = getMediaKindFromMime(file.type);

  const { data, error } = await client
    .from("cms_media_assets")
    .insert({
      path: objectPath,
      public_url: publicUrl,
      kind,
      mime: file.type,
      size: file.size
    })
    .select("id,path,public_url,kind,mime,size,created_at")
    .single();

  if (error) {
    throw new Error(`Failed to store media metadata: ${error.message}`);
  }

  return data as CmsMediaAssetRow;
}

function hashPreviewToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPreviewTokenInDb(entityType: "case", entityId: string) {
  const token = randomBytes(24).toString("base64url");
  const tokenHash = hashPreviewToken(token);
  const client = createSupabaseAdminClient();

  const { error } = await client.from("cms_preview_tokens").insert({
    token_hash: tokenHash,
    entity_type: entityType,
    entity_id: entityId,
    used_at: null
  });

  if (error) {
    throw new Error(`Failed to create preview token: ${error.message}`);
  }

  return token;
}

export async function resolvePreviewTokenFromDb(token: string) {
  const tokenHash = hashPreviewToken(token);
  const client = createSupabaseAdminClient();

  const { data, error } = await client
    .from("cms_preview_tokens")
    .select("token_hash,entity_type,entity_id,created_at,used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve preview token: ${error.message}`);
  }

  if (!data) {
    return { status: "not_found" as const };
  }

  const row = data as CmsPreviewTokenRow;

  if (row.used_at) {
    return { status: "used" as const };
  }

  const { error: markError } = await client
    .from("cms_preview_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", tokenHash)
    .is("used_at", null);

  if (markError) {
    throw new Error(`Failed to consume preview token: ${markError.message}`);
  }

  return {
    status: "ok" as const,
    entityType: row.entity_type,
    entityId: row.entity_id
  };
}

export async function getDraftCaseByIdFromDb(id: string) {
  const caseData = await getAdminCaseByIdFromDb(id);
  return caseData?.draft ?? null;
}
