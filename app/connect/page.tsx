import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { MotionItem } from "@/components/motion/MotionItem";
import { MotionPage } from "@/components/motion/MotionPage";
import { StaticPageBlocks } from "@/components/sections/StaticPageBlocks";
import { SiteShell } from "@/components/shell/SiteShell";
import { getStaticPageContent } from "@/lib/content/site.server";
import styles from "@/app/page-content.module.css";

export async function generateMetadata(): Promise<Metadata> {
  noStore();
  const content = await getStaticPageContent("connect");
  return {
    title: content.meta.title,
    description: content.meta.description,
    alternates: { canonical: content.meta.canonical }
  };
}

export default async function ConnectPage() {
  noStore();
  const content = await getStaticPageContent("connect");
  return (
    <SiteShell title={content.meta.title} showMetaNav={false}>
      <MotionPage className={styles.list}>
        <MotionItem>
          <StaticPageBlocks content={content} />
        </MotionItem>
      </MotionPage>
    </SiteShell>
  );
}
