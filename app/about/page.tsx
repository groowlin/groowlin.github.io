import type { Metadata } from "next";
import { MotionItem } from "@/components/motion/MotionItem";
import { MotionPage } from "@/components/motion/MotionPage";
import { StaticPageBlocks } from "@/components/sections/StaticPageBlocks";
import { SiteShell } from "@/components/shell/SiteShell";
import { getStaticPageContent } from "@/lib/content/site.server";
import styles from "@/app/page-content.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getStaticPageContent("about");
  return {
    title: content.meta.title,
    description: content.meta.description,
    alternates: { canonical: content.meta.canonical }
  };
}

export default async function AboutPage() {
  const content = await getStaticPageContent("about");
  return (
    <SiteShell title="About" showMetaNav={false}>
      <MotionPage className={styles.stack}>
        <MotionItem>
          <StaticPageBlocks content={content} />
        </MotionItem>
      </MotionPage>
    </SiteShell>
  );
}
