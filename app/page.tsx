import type { Metadata } from "next";
import { HomeShowcase } from "@/components/home/HomeShowcase";
import { SiteShell } from "@/components/shell/SiteShell";

export const metadata: Metadata = {
  title: "Gavin Nelson, Designer",
  description: "Portfolio home with interactive work list and motion-driven previews.",
  alternates: {
    canonical: "/"
  }
};

export default function HomePage() {
  return (
    <SiteShell showMetaNav>
      <HomeShowcase />
    </SiteShell>
  );
}
