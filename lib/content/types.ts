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
  subtitle?: string;
  year?: string;
  section: NavSection;
}

export interface RedirectRule {
  source: string;
  destination: string;
  permanent: boolean;
}

export type MediaKind = "image" | "video";

export interface MediaPlaceholder {
  kind: MediaKind;
  aspectRatio: string;
  caption?: string;
  posterToken: string;
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
  title?: string;
  body?: string;
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

export type SectionBlock =
  | ParagraphSection
  | ListSection
  | MediaSection
  | QuoteSection
  | CtaSection;

export interface HomePreview {
  kind: MediaKind;
  token: string;
  aspectRatio: string;
  centered?: boolean;
}

export interface HomeWorkEntry {
  label: string;
  subtitle: string;
  year: string;
  href: string;
  preview: HomePreview;
}

export interface WorkCase {
  slug: string;
  title: string;
  subtitle: string;
  year: string;
  category: string;
  meta: PageMeta;
  heroMedia: MediaPlaceholder;
  sections: SectionBlock[];
}

export interface CmsContentAdapter {
  getWorkCases(): WorkCase[];
  getWorkCaseBySlug(slug: string): WorkCase | undefined;
}
