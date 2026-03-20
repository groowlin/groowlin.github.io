import type { SiteHeaderContent, StaticPageContent, WorkCase } from "@/lib/content/types";

export interface AdminCaseListItem {
  id: string;
  slug: string;
  isPublished: boolean;
  draftSortOrder: number;
  publishedSortOrder: number | null;
  updatedAt: string;
  summaryTitle: string;
  summaryYear: string;
}

export interface AdminCasePayload {
  id: string;
  slug: string;
  isPublished: boolean;
  draft: WorkCase;
  published: WorkCase | null;
}

export interface CmsMediaAsset {
  id: string;
  path: string;
  public_url: string;
  kind: "image" | "video" | "gif";
  mime: string;
  size: number;
  created_at: string;
}

export interface AdminInitialData {
  cases: AdminCaseListItem[];
  header: SiteHeaderContent;
  about: StaticPageContent;
  connect: StaticPageContent;
  media: CmsMediaAsset[];
}
