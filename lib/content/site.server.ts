import "server-only";

import { defaultSiteHeaderContent, defaultSiteMetadataSettings, staticPageContentDefaults } from "@/lib/content";
import type { SiteHeaderContent, SiteMetadataSettings, StaticPageContent, StaticPageKey } from "@/lib/content/types";
import { getSiteHeaderFromDb, getSiteMetadataSettingsFromDb, getStaticPageFromDb } from "@/lib/cms/db.server";
import { isCmsReadFromDbEnabled } from "@/lib/cms/env";

export async function getSiteHeaderContent(): Promise<SiteHeaderContent> {
  if (!isCmsReadFromDbEnabled()) {
    return defaultSiteHeaderContent;
  }

  const fromDb = await getSiteHeaderFromDb();
  return fromDb ?? defaultSiteHeaderContent;
}

export async function getStaticPageContent(key: StaticPageKey): Promise<StaticPageContent> {
  if (!isCmsReadFromDbEnabled()) {
    return staticPageContentDefaults[key];
  }

  const fromDb = await getStaticPageFromDb(key);
  return fromDb ?? staticPageContentDefaults[key];
}

export async function getSiteMetadataSettingsContent(): Promise<SiteMetadataSettings> {
  if (!isCmsReadFromDbEnabled()) {
    return defaultSiteMetadataSettings;
  }

  const fromDb = await getSiteMetadataSettingsFromDb();
  return fromDb ?? defaultSiteMetadataSettings;
}
