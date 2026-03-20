import type { Metadata } from "next";
import { MotionItem } from "@/components/motion/MotionItem";
import { MotionPage } from "@/components/motion/MotionPage";
import { StaticPageBlocks } from "@/components/sections/StaticPageBlocks";
import { SiteShell } from "@/components/shell/SiteShell";
import { getStaticPageContent } from "@/lib/content/site.server";
import styles from "@/app/page-content.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getStaticPageContent("connect");
  return {
    title: content.meta.title,
    description: content.meta.description,
    alternates: { canonical: content.meta.canonical }
  };
}

export default async function ConnectPage() {
  const content = await getStaticPageContent("connect");
  return (
    <SiteShell title="Connect" showMetaNav={false}>
      <MotionPage className={styles.list}>
        <MotionItem>
          <StaticPageBlocks content={content} />
        </MotionItem>
      </MotionPage>
    </SiteShell>
  );
}
