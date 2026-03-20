import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MotionPage } from "@/components/motion/MotionPage";
import { WorkArticle } from "@/components/sections/WorkArticle";
import { SiteShell } from "@/components/shell/SiteShell";
import { getDraftCaseByIdFromDb, resolvePreviewTokenFromDb } from "@/lib/cms/db.server";
import { assertCmsEnabled } from "@/lib/cms/env";
import styles from "@/app/page-content.module.css";

interface PreviewPageProps {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  },
  title: "Preview"
};

export default async function PreviewPage({ params }: PreviewPageProps) {
  assertCmsEnabled();
  const { token } = await params;
  const resolved = await resolvePreviewTokenFromDb(token);

  if (resolved.status !== "ok") {
    notFound();
  }

  if (resolved.entityType !== "case") {
    notFound();
  }

  const draftCase = await getDraftCaseByIdFromDb(resolved.entityId);

  if (!draftCase) {
    notFound();
  }

  return (
    <SiteShell
      title={`${draftCase.summary.title} (preview)`}
      subtitle={`${draftCase.summary.year} · ${draftCase.summary.category}`}
      subtitleMuted={false}
      showMetaNav={false}
    >
      <MotionPage className={styles.stack}>
        <WorkArticle entry={draftCase} />
      </MotionPage>
    </SiteShell>
  );
}
