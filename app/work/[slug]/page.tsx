import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MotionPage } from "@/components/motion/MotionPage";
import { WorkArticle } from "@/components/sections/WorkArticle";
import { SiteShell } from "@/components/shell/SiteShell";
import { getWorkCase, getWorkSlugs } from "@/lib/content/work.server";
import styles from "@/app/page-content.module.css";

interface WorkPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getWorkSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: WorkPageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getWorkCase(slug);

  if (!entry) {
    return {
      title: "Work"
    };
  }

  const canonical = `/work/${entry.slug}`;

  return {
    title: entry.meta.title,
    description: entry.meta.description,
    alternates: { canonical },
    openGraph: {
      title: entry.meta.title,
      description: entry.meta.description,
      type: entry.meta.ogType ?? "article",
      url: canonical
    }
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
      subtitle={`${entry.summary.year} · ${entry.summary.category}`}
      subtitleMuted={false}
      showMetaNav={false}
    >
      <MotionPage className={styles.stack}>
        <div>
          <WorkArticle entry={entry} />
        </div>
      </MotionPage>
    </SiteShell>
  );
}
