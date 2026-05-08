import "server-only";

import path from "node:path";
import { cache } from "react";
import {
  homeFrontmatterSchema,
  notFoundPageFrontmatterSchema,
  staticPageFrontmatterSchema,
  topCardFrontmatterSchema
} from "@/lib/content/schemas";
import { getContentDir, parseMdxFrontmatter, renderMdx } from "@/lib/content/mdx.server";
import type {
  HomeSectionConfig,
  HomeShowcaseConfig,
  NotFoundPageContent,
  SiteMetadataSettings,
  StaticPageContent,
  StaticPageKey,
  TopCardContent,
  TopCardVariant
} from "@/lib/content/types";

const SITE_HOME_FILE = getContentDir("site", "home.mdx");
const PAGES_DIR = getContentDir("pages");
const ABOUT_PAGE_FILE = getContentDir("pages", "about.mdx");
const NOT_FOUND_PAGE_FILE = getContentDir("pages", "not-found.mdx");
const TOP_CARD_FILE_BY_VARIANT: Record<TopCardVariant, string> = {
  "to-profile": "top-card-to-profile.mdx",
  "to-home": "top-card-to-home.mdx",
  default: "top-card-default.mdx"
};
const HOME_SECTION_SPLIT_RE = /\n\s*---\s*\n/g;
const HOME_SECTION_TITLE_RE = /^##\s+(.+)$/;
const HOME_SECTION_ITEM_RE = /^-\s+(.+)$/;
const HOME_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function extractMarkdownSection(body: string, heading: string): string | null {
  const normalizedBody = body.replace(/\r\n/g, "\n").trim();
  const lines = normalizedBody.split("\n");
  const normalizedHeading = heading.trim();
  const startIndex = lines.findIndex((line) => line.trim() === `## ${normalizedHeading}`);

  if (startIndex === -1) {
    return null;
  }

  let endIndex = lines.length;

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (/^#{1,6}\s+/.test(lines[index]?.trim() ?? "")) {
      endIndex = index;
      break;
    }
  }

  return lines.slice(startIndex, endIndex).join("\n").trim() || null;
}

const loadHomeSource = cache(async () => {
  return parseMdxFrontmatter(SITE_HOME_FILE, homeFrontmatterSchema);
});

export async function getSiteMetadataSettingsContent(): Promise<SiteMetadataSettings> {
  const { frontmatter: home } = await loadHomeSource();
  return home.seo;
}

function normalizeHomeSlug(value: string): string | null {
  let candidate = value.trim();

  if (!candidate) {
    return null;
  }

  const markdownLinkMatch = candidate.match(/^\[[^\]]+\]\(([^)]+)\)$/);
  if (markdownLinkMatch?.[1]) {
    candidate = markdownLinkMatch[1].trim();
  }

  if (candidate.startsWith("`") && candidate.endsWith("`") && candidate.length > 2) {
    candidate = candidate.slice(1, -1).trim();
  }

  if (candidate.startsWith("/work/")) {
    candidate = candidate.slice("/work/".length);
  }

  if (candidate.startsWith("/")) {
    return null;
  }

  const normalized = candidate.split(/[?#]/, 1)[0]?.trim() ?? "";
  return HOME_SLUG_RE.test(normalized) ? normalized : null;
}

function parseHomeBodySections(body: string): HomeSectionConfig[] {
  const normalizedBody = body.replace(/\r\n/g, "\n").trim();

  if (!normalizedBody) {
    return [];
  }

  return normalizedBody
    .split(HOME_SECTION_SPLIT_RE)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk): HomeSectionConfig | null => {
      const lines = chunk
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        return null;
      }

      const maybeTitle = lines[0]?.match(HOME_SECTION_TITLE_RE);
      const title = maybeTitle?.[1]?.trim() || undefined;
      const firstItemIndex = maybeTitle ? 1 : 0;
      const slugs = lines.slice(firstItemIndex).reduce<string[]>((accumulator, line) => {
        const itemMatch = line.match(HOME_SECTION_ITEM_RE);
        if (!itemMatch?.[1]) {
          return accumulator;
        }

        const slug = normalizeHomeSlug(itemMatch[1]);
        if (slug) {
          accumulator.push(slug);
        }

        return accumulator;
      }, []);

      if (slugs.length === 0) {
        return null;
      }

      return { title, slugs };
    })
    .filter((section): section is HomeSectionConfig => section !== null);
}

export async function getHomeShowcaseConfigContent(): Promise<HomeShowcaseConfig> {
  const { frontmatter, body } = await loadHomeSource();

  return {
    title: frontmatter.title,
    subtitle: frontmatter.subtitle,
    sections: parseHomeBodySections(body)
  };
}

const loadTopCardContent = cache(async (variant: TopCardVariant): Promise<TopCardContent> => {
  const fileName = TOP_CARD_FILE_BY_VARIANT[variant];
  const filePath = getContentDir("site", fileName);

  try {
    const { frontmatter } = await parseMdxFrontmatter(filePath, topCardFrontmatterSchema);

    return {
      variant,
      photo: frontmatter.photo,
      title: frontmatter.title,
      subtitle: frontmatter.subtitle,
      link: frontmatter.link,
      icons: [frontmatter.icon1, frontmatter.icon2, frontmatter.icon3, frontmatter.icon4].filter(
        (value): value is string => Boolean(value)
      )
    };
  } catch (error) {
    if (variant === "default") {
      throw error;
    }
    return loadTopCardContent("default");
  }
});

export async function getTopCardContent(variant: TopCardVariant): Promise<TopCardContent> {
  return loadTopCardContent(variant);
}

const loadStaticPage = cache(async (key: StaticPageKey): Promise<StaticPageContent> => {
  const filePath = path.join(PAGES_DIR, `${key}.mdx`);
  const { frontmatter, body } = await parseMdxFrontmatter(filePath, staticPageFrontmatterSchema);

  return {
    key,
    meta: {
      title: frontmatter.title,
      description: frontmatter.description,
      canonical: frontmatter.canonical
    },
    content: renderMdx(body)
  };
});

export async function getStaticPageContent(key: StaticPageKey) {
  return loadStaticPage(key);
}

const loadNotFoundPage = cache(async (): Promise<NotFoundPageContent> => {
  const { frontmatter, body } = await parseMdxFrontmatter(NOT_FOUND_PAGE_FILE, notFoundPageFrontmatterSchema);
  const { body: aboutBody } = await parseMdxFrontmatter(ABOUT_PAGE_FILE, staticPageFrontmatterSchema);
  const contactsSection = extractMarkdownSection(aboutBody, "Контакты");
  const mergedBody = [body.trim(), contactsSection].filter(Boolean).join("\n\n");

  return {
    meta: {
      title: frontmatter.title,
      description: frontmatter.description,
      canonical: frontmatter.canonical,
      ogImage: frontmatter.ogImage,
      ogType: frontmatter.ogType ?? "website"
    },
    summary: {
      title: frontmatter.title,
      subtitle: frontmatter.subtitle
    },
    content: renderMdx(mergedBody, "work")
  };
});

export async function getNotFoundPageContent(): Promise<NotFoundPageContent> {
  return loadNotFoundPage();
}
