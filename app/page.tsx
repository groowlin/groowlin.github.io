import type { Metadata } from "next";
import { HomeShowcase } from "@/components/home/HomeShowcase";
import { SiteShell } from "@/components/shell/SiteShell";
import { getHomeWorkEntries } from "@/lib/content/work.server";
import { getSiteHeaderContent } from "@/lib/content/site.server";

export const metadata: Metadata = {
  title: "Home",
  description: "Selected product design cases and recent work.",
  alternates: {
    canonical: "/"
  }
};

export default async function HomePage() {
  const [entries, header] = await Promise.all([getHomeWorkEntries(), getSiteHeaderContent()]);

  return (
    <SiteShell showMetaNav={false}>
      <HomeShowcase entries={entries} header={header} />
    </SiteShell>
  );
}
