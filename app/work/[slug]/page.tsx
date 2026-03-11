import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MotionPage } from "@/components/motion/MotionPage";
import { WorkArticle } from "@/components/sections/WorkArticle";
import { SiteShell } from "@/components/shell/SiteShell";
import { getWorkCase, workSlugs } from "@/lib/content";
import styles from "@/app/page-content.module.css";

interface WorkPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return workSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: WorkPageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = getWorkCase(slug);

  if (!entry) {
    return {
      title: "Work"
    };
  }

  return {
    title: entry.meta.title,
    description: entry.meta.description,
    alternates: { canonical: entry.meta.canonical },
    openGraph: {
      title: entry.meta.title,
      description: entry.meta.description,
      type: entry.meta.ogType ?? "article",
      url: entry.meta.canonical
    }
  };
}

export default async function WorkPage({ params }: WorkPageProps) {
  const { slug } = await params;
  const entry = getWorkCase(slug);

  if (!entry) {
    notFound();
  }

  return (
    <SiteShell title={entry.title} subtitle={`${entry.year} - ${entry.category}`} showMetaNav={false}>
      <MotionPage className={styles.stack}>
        <div className={styles.workMeta}>
          <span>{entry.subtitle}</span>
        </div>
        <div>
          <WorkArticle entry={entry} />
        </div>
      </MotionPage>
    </SiteShell>
  );
}
