import "server-only";

import path from "node:path";
import { cache } from "react";
import { homeFrontmatterSchema, staticPageFrontmatterSchema } from "@/lib/content/schemas";
import { getContentDir, parseMdxFrontmatter, renderMdx } from "@/lib/content/mdx.server";
import type {
  HomeFrontmatter,
  NavEntry,
  SiteHeaderContent,
  SiteMetadataSettings,
  StaticPageContent,
  StaticPageKey
} from "@/lib/content/types";

const SITE_HOME_FILE = getContentDir("site", "home.mdx");
const PAGES_DIR = getContentDir("pages");

const loadHomeFrontmatter = cache(async (): Promise<HomeFrontmatter> => {
  const { frontmatter } = await parseMdxFrontmatter(SITE_HOME_FILE, homeFrontmatterSchema);
  return frontmatter;
});

export async function getSiteHeaderContent(): Promise<SiteHeaderContent> {
  const home = await loadHomeFrontmatter();

  return {
    identity: {
      name: home.name,
      role: home.role,
      logoAlt: home.name,
      avatarUrl: home.avatar
    },
    metaNav: home.metaNav.map<NavEntry>((entry) => ({
      label: entry.label,
      href: entry.href,
      section: "meta"
    }))
  };
}

export async function getSiteMetadataSettingsContent(): Promise<SiteMetadataSettings> {
  const home = await loadHomeFrontmatter();
  return home.seo;
}

export async function getContactLinks() {
  const home = await loadHomeFrontmatter();
  return home.contacts;
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
