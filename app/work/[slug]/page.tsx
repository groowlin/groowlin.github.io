import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkArticle } from "@/components/sections/WorkArticle";
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
    return {
      title: "Кейс"
    };
  }

  return {
    title: entry.meta.title,
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
    <SiteShell
      title={entry.summary.title}
      subtitle={entry.summary.subtitle}
      subtitleMuted={false}
      subtitleVariant="workMeta"
      topCardVariant="to-home"
    >
      <div className={styles.stack}>
        <WorkArticle content={entry.content} />
      </div>
    </SiteShell>
  );
}
