import type { Metadata } from "next";
import { PageGoalTracker } from "@/components/analytics/PageGoalTracker";
import { SiteShell } from "@/components/shell/SiteShell";
import { getStaticPageContent } from "@/lib/content/site.server";
import styles from "@/app/page-content.module.css";
import { GalleryLightboxScope } from "@/components/media/GalleryLightboxScope";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getStaticPageContent("about");

  return {
    description: content.meta.description,
    alternates: { canonical: content.meta.canonical }
  };
}

export default async function AboutPage() {
  const content = await getStaticPageContent("about");

  return (
    <SiteShell title={content.meta.title}>
      <PageGoalTracker goal="view_about" />
      <div className={styles.stack}>
        <GalleryLightboxScope>
          <article className={styles.mdxContent}>{content.content}</article>
        </GalleryLightboxScope>
      </div>
    </SiteShell>
  );
}
