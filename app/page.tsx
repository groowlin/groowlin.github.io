import type { Metadata } from "next";
import { PageGoalTracker } from "@/components/analytics/PageGoalTracker";
import { GamesExperience } from "@/components/games/GamesEntry";
import { HomeShowcase } from "@/components/home/HomeShowcase";
import { SiteShell } from "@/components/shell/SiteShell";
import { getHomeShowcaseConfigContent, getSiteMetadataSettingsContent } from "@/lib/content/site.server";
import type {
  HomeShowcaseSection,
  HomeShowcaseTab,
  HomeTabConfig,
  HomeShowcaseEntry,
  HomePlannedItem,
  HomeWorkEntry
} from "@/lib/content/types";
import { getHomeWorkEntries } from "@/lib/content/work.server";
import { gamesEnabled } from "@/lib/features";

function toWorkSlug(href: string): string | null {
  if (!href.startsWith("/work/")) {
    return null;
  }

  const slug = href.slice("/work/".length).trim();
  return slug.length > 0 ? slug : null;
}

function buildHomeShowcaseTabs(
  configTabs: HomeTabConfig[],
  entries: HomeWorkEntry[],
  itemStickers: Record<string, string[]> = {},
  gameItems: Record<string, { label: string; subtitle: string }> = {},
  plannedItems: Record<string, HomePlannedItem> = {}
): HomeShowcaseTab[] {
  const entryBySlug = new Map<string, HomeWorkEntry>();

  for (const entry of entries) {
    const slug = toWorkSlug(entry.href);
    if (!slug) {
      continue;
    }
    entryBySlug.set(slug, entry);
  }

  const usedSlugs = new Set<string>();

  return configTabs
    .map((tab) => {
      const sections = tab.sections
        .map((section): HomeShowcaseSection => {
          const items = section.slugs.reduce<HomeShowcaseEntry[]>((accumulator, slug) => {
            if (usedSlugs.has(slug)) return accumulator;
            if (!gamesEnabled && (slug === "mini-games" || gameItems[slug])) return accumulator;

            const planned = plannedItems[slug];
            if (planned) {
              if (entryBySlug.has(slug)) {
                throw new Error(`Home planned item "${slug}" conflicts with a published work entry`);
              }
              accumulator.push({ kind: "planned", slug, ...planned, stickerSrcs: itemStickers.globus?.slice(0, 1) });
              usedSlugs.add(slug);
              return accumulator;
            }

            const game = gameItems[slug];
            if (game) {
              accumulator.push({ kind: "game", slug, label: game.label, subtitle: game.subtitle });
              usedSlugs.add(slug);
              return accumulator;
            }
            const entry = entryBySlug.get(slug);
            if (!entry) return accumulator;

            const stickerSrcs = itemStickers[slug];
            accumulator.push({ ...entry, ...(stickerSrcs ? { stickerSrcs } : {}) });
            usedSlugs.add(slug);
            return accumulator;
          }, []);

          return { title: section.title, items };
        })
        .filter((section) => section.items.length > 0);

      return { title: tab.title, sections };
    })
    .filter((tab) => tab.sections.length > 0);
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteMetadataSettingsContent();

  return {
    title: settings.defaultTitle,
    description: settings.defaultDescription,
    alternates: {
      canonical: "/"
    }
  };
}

export default async function HomePage() {
  const [homeConfig, entries] = await Promise.all([getHomeShowcaseConfigContent(), getHomeWorkEntries()]);
  const tabs = buildHomeShowcaseTabs(homeConfig.tabs, entries, homeConfig.itemStickers, homeConfig.gameItems, homeConfig.plannedItems);

  return (
    <>
      <SiteShell>
        <PageGoalTracker goal="view_home" />
        <HomeShowcase title={homeConfig.title} tabs={tabs} />
      </SiteShell>
      {gamesEnabled && <GamesExperience />}
    </>
  );
}
