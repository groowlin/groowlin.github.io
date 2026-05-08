import type { Metadata } from "next";
import { WorkArticle } from "@/components/sections/WorkArticle";
import { SiteShell } from "@/components/shell/SiteShell";
import { getNotFoundPageContent } from "@/lib/content/site.server";
import styles from "@/app/page-content.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getNotFoundPageContent();

  return {
    description: content.meta.description,
    alternates: { canonical: content.meta.canonical }
  };
}

export default async function NotFoundPage() {
  const content = await getNotFoundPageContent();

  return (
    <SiteShell
      title={content.summary.title}
      subtitle={content.summary.subtitle}
      subtitleMuted={false}
      subtitleVariant="workMeta"
      topCardVariant="default"
    >
      <div className={styles.stack}>
        <WorkArticle content={content.content} />
      </div>
    </SiteShell>
  );
}
