export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  ogType?: "website" | "article";
}

export interface WorkCaseMeta {
  title: string;
  description: string;
  ogImage?: string;
  ogType?: "article" | "website";
}

export type NavSection = "work" | "meta" | "contact";

export interface NavEntry {
  label: string;
  href: string;
  subtitle?: string;
  year?: string;
  section: NavSection;
}

export interface SiteIdentity {
  name: string;
  role: string;
  rolePrefix: string;
  roleCompanyLabel: string;
  roleCompanyHref: string;
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

export interface RedirectRule {
  source: string;
  destination: string;
  permanent: boolean;
}

export type MediaKind = "image" | "video" | "gif";

export interface MediaPlaceholder {
  kind: MediaKind;
  aspectRatio?: string;
  caption?: string;
  src?: string;
  placeholderToken?: string;
}

export interface ParagraphSection {
  type: "paragraph";
  title?: string;
  body: string;
}

export interface ListSection {
  type: "list";
  title?: string;
  items: string[];
}

export interface MediaSection {
  type: "media";
  media: MediaPlaceholder;
}

export interface QuoteSection {
  type: "quote";
  quote: string;
  attribution?: string;
}

export interface CtaSection {
  type: "cta";
  label: string;
  href: string;
  body?: string;
}

export interface GallerySection {
  type: "gallery";
  title?: string;
  body?: string;
  layout?: "grid" | "carousel";
  items: MediaPlaceholder[];
}

export interface MetricItem {
  value: string;
  label: string;
  note?: string;
}

export interface MetricsSection {
  type: "metrics";
  title?: string;
  items: MetricItem[];
}

export interface TimelineItem {
  title: string;
  period?: string;
  body?: string;
  media?: MediaPlaceholder;
}

export interface TimelineSection {
  type: "timeline";
  title?: string;
  items: TimelineItem[];
}

export type SimpleSectionBlock =
  | ParagraphSection
  | ListSection
  | MediaSection
  | QuoteSection
  | CtaSection;

export interface TwoColumnSection {
  type: "twoColumn";
  title?: string;
  left: SimpleSectionBlock[];
  right: SimpleSectionBlock[];
}

export type SectionBlock =
  | ParagraphSection
  | ListSection
  | MediaSection
  | QuoteSection
  | CtaSection
  | GallerySection
  | MetricsSection
  | TimelineSection
  | TwoColumnSection;

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

export interface WorkCase {
  schemaVersion: "1.0";
  id: string;
  slug: string;
  status: WorkCaseStatus;
  sortOrder: number;
  summary: WorkCaseSummary;
  meta: WorkCaseMeta;
  sections: SectionBlock[];
}

export type StaticPageKey = "about" | "connect";

export interface StaticPageParagraphBlock {
  type: "paragraph";
  title?: string;
  body: string;
}

export interface StaticPageListBlock {
  type: "list";
  title?: string;
  items: string[];
}

export interface StaticPageQuoteBlock {
  type: "quote";
  quote: string;
  attribution?: string;
}

export interface StaticPageLinksBlock {
  type: "links";
  title?: string;
  items: Array<{ label: string; href: string }>;
}

export type StaticPageBlock =
  | StaticPageParagraphBlock
  | StaticPageListBlock
  | StaticPageQuoteBlock
  | StaticPageLinksBlock;

export interface StaticPageContent {
  key: StaticPageKey;
  meta: PageMeta;
  blocks: StaticPageBlock[];
}
