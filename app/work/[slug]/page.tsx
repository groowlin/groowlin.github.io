import type { Metadata } from "next";
import { WorkCaseAnalyticsTracker } from "@/components/analytics/WorkCaseAnalyticsTracker";
import { notFound } from "next/navigation";
import { WorkArticle } from "@/components/sections/WorkArticle";
import { WorkShortSummaryButton, WorkShortSummaryProvider } from "@/components/sections/WorkShortSummaryToggle";
import { SiteShell } from "@/components/shell/SiteShell";
import { getWorkCase, getWorkSlugs } from "@/lib/content/work.server";
import styles from "@/app/page-content.module.css";

interface WorkPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getWorkSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: WorkPageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getWorkCase(slug);

  if (!entry) {
    return {};
  }

  return {
    description: entry.meta.description,
    alternates: { canonical: entry.canonical }
  };
}

export default async function WorkPage({ params }: WorkPageProps) {
  const { slug } = await params;
  const entry = await getWorkCase(slug);

  if (!entry) {
    notFound();
  }

  return (
    <WorkShortSummaryProvider shortSummary={entry.shortSummary}>
      <WorkCaseAnalyticsTracker slug={slug} title={entry.summary.title} />
      <SiteShell
        title={entry.summary.title}
        subtitle={entry.summary.subtitle}
        headerAction={<WorkShortSummaryButton />}
        subtitleMuted={false}
        subtitleVariant="workMeta"
        topCardVariant="to-home"
      >
        <div className={styles.stack}>
          <WorkArticle content={entry.content} />
        </div>
      </SiteShell>
    </WorkShortSummaryProvider>
  );
}
