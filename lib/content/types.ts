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
  defaultDescription: string;
  defaultOgImage?: string;
  faviconUrl?: string;
  robotsIndexByDefault: boolean;
}

export interface LinkPreviewMetadata {
  title: string;
  description: string;
  url: string;
  type: "website" | "article";
  image?: string;
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

export interface MediaAssetSource {
  src: string;
  type: string;
}

export interface MediaPlaceholder {
  kind: MediaKind;
  aspectRatio?: string;
  caption?: string;
  src?: string;
  placeholderToken?: string;
  intrinsicWidth?: number;
  intrinsicHeight?: number;
  srcSet?: string;
  fullSrc?: string;
  fullIntrinsicWidth?: number;
  fullIntrinsicHeight?: number;
  videoSources?: MediaAssetSource[];
  fullVideoSources?: MediaAssetSource[];
}

export interface HomePreview {
  kind: MediaKind;
  src?: string;
  placeholderToken?: string;
  aspectRatio: string;
  centered?: boolean;
  intrinsicWidth?: number;
  intrinsicHeight?: number;
  srcSet?: string;
  fullSrc?: string;
  fullIntrinsicWidth?: number;
  fullIntrinsicHeight?: number;
  videoSources?: MediaAssetSource[];
  fullVideoSources?: MediaAssetSource[];
}

export interface HomeWorkEntry {
  kind?: "work";
  label: string;
  subtitle: string;
  href: string;
  preview: HomePreview;
  previewCaption?: string;
  stickerSrcs?: string[];
}

export interface HomeGameEntry {
  kind: "game";
  slug: string;
  label: string;
  subtitle: string;
}

export interface HomePlannedItem {
  label: string;
  subtitle: string;
  statusLabel: string;
}

export interface HomePlannedEntry extends HomePlannedItem {
  kind: "planned";
  slug: string;
  stickerSrcs?: string[];
}

export type HomeShowcaseEntry = HomeWorkEntry | HomeGameEntry | HomePlannedEntry;

export interface HomeSectionConfig {
  title?: string;
  slugs: string[];
}

export interface HomeTabConfig {
  title: string;
  sections: HomeSectionConfig[];
}

export interface HomeShowcaseConfig {
  title: string;
  subtitle?: string;
  itemStickers?: Record<string, string[]>;
  gameItems?: Record<string, { label: string; subtitle: string }>;
  plannedItems?: Record<string, HomePlannedItem>;
  tabs: HomeTabConfig[];
}

export interface HomeShowcaseSection {
  title?: string;
  items: HomeShowcaseEntry[];
}

export interface HomeShowcaseTab {
  title: string;
  sections: HomeShowcaseSection[];
}

export type WorkCaseStatus = "published" | "hidden";

export interface WorkCaseSummary {
  title: string;
  subtitle: string;
  preview: HomePreview;
}

export interface WorkCaseShortSummary {
  paragraphs: string[];
  media?: MediaPlaceholder[];
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
  shortSummary?: WorkCaseShortSummary;
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
  itemStickers?: Record<string, string[]>;
  plannedItems?: Record<string, HomePlannedItem>;
  seo: SiteMetadataSettings;
}

export interface StaticPageFrontmatter {
  title: string;
  description: string;
  canonical: string;
}

export interface NotFoundPageFrontmatter {
  title: string;
  subtitle: string;
  description: string;
  canonical: string;
  ogImage?: string;
  ogType?: "article" | "website";
}

export interface NotFoundPageContent {
  meta: PageMeta;
  summary: {
    title: string;
    subtitle: string;
  };
  content: React.ReactNode;
}

export interface WorkFrontmatter {
  slug: string;
  title: string;
  subtitle: string;
  status: WorkCaseStatus;
  preview: HomePreview;
  shortSummary?: WorkCaseShortSummary;
  description: string;
  canonical: string;
  ogImage?: string;
  ogType?: "article" | "website";
}
