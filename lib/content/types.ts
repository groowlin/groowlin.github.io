export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  ogType?: "website" | "article";
}

export type NavSection = "work" | "meta" | "contact";

export interface NavEntry {
  label: string;
  href: string;
  section: NavSection;
}

export interface SiteIdentity {
  name: string;
  role: string;
  logoAlt: string;
  avatarUrl?: string;
}

export interface SiteMetadataSettings {
  siteUrl: string;
  siteName: string;
  defaultTitle: string;
  titleTemplate: string;
  defaultDescription: string;
  defaultOgImage?: string;
  faviconUrl?: string;
  robotsIndexByDefault: boolean;
}

export interface SiteHeaderContent {
  identity: SiteIdentity;
  metaNav: NavEntry[];
}

export type MediaKind = "image" | "video" | "gif";

export interface MediaPlaceholder {
  kind: MediaKind;
  aspectRatio?: string;
  caption?: string;
  src?: string;
  placeholderToken?: string;
}

export interface HomePreview {
  kind: MediaKind;
  src?: string;
  placeholderToken?: string;
  aspectRatio: string;
  centered?: boolean;
}

export interface HomeWorkEntry {
  label: string;
  year: string;
  category: string;
  href: string;
  preview: HomePreview;
}

export type WorkCaseStatus = "published" | "hidden";

export interface WorkCaseSummary {
  title: string;
  year: string;
  category: string;
  preview: HomePreview;
}

export interface WorkCaseMeta {
  title: string;
  description: string;
  ogImage?: string;
  ogType?: "article" | "website";
}

export interface WorkCase {
  slug: string;
  summary: WorkCaseSummary;
  meta: WorkCaseMeta;
  canonical: string;
  content: React.ReactNode;
}

export type StaticPageKey = "about" | "connect";

export interface StaticPageContent {
  key: StaticPageKey;
  meta: PageMeta;
  content: React.ReactNode;
}

export interface HomeFrontmatter {
  name: string;
  role: string;
  avatar?: string;
  metaNav: Array<{ label: string; href: string }>;
  contacts: Array<{ label: string; href: string }>;
  seo: SiteMetadataSettings;
}

export interface StaticPageFrontmatter {
  title: string;
  description: string;
  canonical: string;
}

export interface WorkFrontmatter {
  slug: string;
  title: string;
  year: string;
  category: string;
  status: WorkCaseStatus;
  preview: HomePreview;
  description: string;
  canonical: string;
  ogImage?: string;
  ogType?: "article" | "website";
}
