import type { Metadata } from "next";
import { PageGoalTracker } from "@/components/analytics/PageGoalTracker";
import { HomeShowcase } from "@/components/home/HomeShowcase";
import { SiteShell } from "@/components/shell/SiteShell";
import { getHomeShowcaseConfigContent, getSiteMetadataSettingsContent } from "@/lib/content/site.server";
import type { HomeSectionConfig, HomeShowcaseSection, HomeWorkEntry } from "@/lib/content/types";
import { getHomeWorkEntries } from "@/lib/content/work.server";

function toWorkSlug(href: string): string | null {
  if (!href.startsWith("/work/")) {
    return null;
  }

  const slug = href.slice("/work/".length).trim();
  return slug.length > 0 ? slug : null;
}

function buildHomeShowcaseSections(configSections: HomeSectionConfig[], entries: HomeWorkEntry[]): HomeShowcaseSection[] {
  const entryBySlug = new Map<string, HomeWorkEntry>();

  for (const entry of entries) {
    const slug = toWorkSlug(entry.href);
    if (!slug) {
      continue;
    }
    entryBySlug.set(slug, entry);
  }

  const usedSlugs = new Set<string>();

  return configSections
    .map((section) => {
      const items = section.slugs.reduce<HomeWorkEntry[]>((accumulator, slug) => {
        if (usedSlugs.has(slug)) {
          return accumulator;
        }

        const entry = entryBySlug.get(slug);
        if (!entry) {
          return accumulator;
        }

        accumulator.push(entry);
        usedSlugs.add(slug);
        return accumulator;
      }, []);

      return {
        title: section.title,
        items
      };
    })
    .filter((section) => section.items.length > 0);
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
  const sections = buildHomeShowcaseSections(homeConfig.sections, entries);

  return (
    <SiteShell topCardVariant="to-profile">
      <PageGoalTracker goal="view_home" />
      <HomeShowcase title={homeConfig.title} subtitle={homeConfig.subtitle} sections={sections} />
    </SiteShell>
  );
}
