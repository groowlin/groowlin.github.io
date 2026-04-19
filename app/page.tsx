import type { Metadata } from "next";
import { HomeShowcase } from "@/components/home/HomeShowcase";
import { SiteShell } from "@/components/shell/SiteShell";
import { getSiteMetadataSettingsContent, getTopCardContent } from "@/lib/content/site.server";
import { getHomeWorkEntries } from "@/lib/content/work.server";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteMetadataSettingsContent();

  return {
    title: {
      absolute: settings.defaultTitle
    },
    description: settings.defaultDescription,
    alternates: {
      canonical: "/"
    },
    openGraph: {
      title: settings.defaultTitle,
      description: settings.defaultDescription,
      siteName: settings.siteName,
      type: "website",
      url: "/",
      images: settings.defaultOgImage ? [settings.defaultOgImage] : undefined
    }
  };
}

export default async function HomePage() {
  const [entries, topCard] = await Promise.all([getHomeWorkEntries(), getTopCardContent("to-profile")]);

  return (
    <SiteShell>
      <HomeShowcase entries={entries} topCard={topCard} />
    </SiteShell>
  );
}
