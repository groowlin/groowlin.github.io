import type { Metadata } from "next";
import { HomeShowcase } from "@/components/home/HomeShowcase";
import { SiteShell } from "@/components/shell/SiteShell";
import { getSiteHeaderContent, getSiteMetadataSettingsContent } from "@/lib/content/site.server";
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
  const [entries, header] = await Promise.all([getHomeWorkEntries(), getSiteHeaderContent()]);

  return (
    <SiteShell showMetaNav={false}>
      <HomeShowcase entries={entries} header={header} />
    </SiteShell>
  );
}
