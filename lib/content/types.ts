export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  ogType?: "website" | "article";
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

export type TopCardVariant = "to-profile" | "to-home" | "default";

export interface TopCardFrontmatter {
  photo: string;
  title: string;
  subtitle: string;
  link: string;
  icon1?: string;
  icon2?: string;
  icon3?: string;
  icon4?: string;
}

export interface TopCardContent {
  variant: TopCardVariant;
  photo: string;
  title: string;
  subtitle: string;
  link: string;
  icons: string[];
}

export type MediaKind = "image" | "video" | "gif";

export type MediaBleed = "default" | "wide";

export interface MediaPlaceholder {
  kind: MediaKind;
  aspectRatio?: string;
  caption?: string;
  src?: string;
  placeholderToken?: string;
  bleed?: MediaBleed;
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
  subtitle: string;
  href: string;
  preview: HomePreview;
}

export interface HomeSectionConfig {
  title?: string;
  slugs: string[];
}

export interface HomeShowcaseConfig {
  title: string;
  subtitle?: string;
  sections: HomeSectionConfig[];
}

export interface HomeShowcaseSection {
  title?: string;
  items: HomeWorkEntry[];
}

export type WorkCaseStatus = "published" | "hidden";

export interface WorkCaseSummary {
  title: string;
  subtitle: string;
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

export type StaticPageKey = "about";

export interface StaticPageContent {
  key: StaticPageKey;
  meta: PageMeta;
  content: React.ReactNode;
}

export interface HomeFrontmatter {
  title: string;
  subtitle?: string;
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
  subtitle: string;
  status: WorkCaseStatus;
  preview: HomePreview;
  description: string;
  canonical: string;
  ogImage?: string;
  ogType?: "article" | "website";
}
