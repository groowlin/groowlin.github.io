import "server-only";

import path from "node:path";
import { cache } from "react";
import { homeFrontmatterSchema, staticPageFrontmatterSchema, topCardFrontmatterSchema } from "@/lib/content/schemas";
import { getContentDir, parseMdxFrontmatter, renderMdx } from "@/lib/content/mdx.server";
import type {
  HomeFrontmatter,
  SiteMetadataSettings,
  StaticPageContent,
  StaticPageKey,
  TopCardContent,
  TopCardVariant
} from "@/lib/content/types";

const SITE_HOME_FILE = getContentDir("site", "home.mdx");
const PAGES_DIR = getContentDir("pages");
const TOP_CARD_FILE_BY_VARIANT: Record<TopCardVariant, string> = {
  "to-profile": "top-card-to-profile.mdx",
  "to-home": "top-card-to-home.mdx",
  default: "top-card-default.mdx"
};

const loadHomeFrontmatter = cache(async (): Promise<HomeFrontmatter> => {
  const { frontmatter } = await parseMdxFrontmatter(SITE_HOME_FILE, homeFrontmatterSchema);
  return frontmatter;
});

export async function getSiteMetadataSettingsContent(): Promise<SiteMetadataSettings> {
  const home = await loadHomeFrontmatter();
  return home.seo;
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
