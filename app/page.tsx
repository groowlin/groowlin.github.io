import type { Metadata } from "next";
import { HomeShowcase } from "@/components/home/HomeShowcase";
import { SiteShell } from "@/components/shell/SiteShell";
import { getHomeWorkEntries } from "@/lib/content/work.server";

export const metadata: Metadata = {
  title: "Gavin Nelson, Designer",
  description: "Portfolio home with interactive work list and motion-driven previews.",
  alternates: {
    canonical: "/"
  }
};

export default function HomePage() {
  const entries = getHomeWorkEntries();

  return (
    <SiteShell showMetaNav={false}>
      <HomeShowcase entries={entries} />
    </SiteShell>
  );
}
