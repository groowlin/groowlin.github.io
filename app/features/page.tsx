import type { Metadata } from "next";
import Link from "next/link";
import { MotionItem } from "@/components/motion/MotionItem";
import { MotionPage } from "@/components/motion/MotionPage";
import { SiteShell } from "@/components/shell/SiteShell";
import { featureLinks, staticPageMeta } from "@/lib/content";
import styles from "@/app/page-content.module.css";

const meta = staticPageMeta.features;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: meta.canonical }
};

export default function FeaturesPage() {
  return (
    <SiteShell title="Features" showMetaNav={false}>
      <MotionPage className={styles.list}>
        {featureLinks.map((entry) => (
          <MotionItem key={entry.label}>
            <Link className={styles.listLink} href={entry.href}>
              {entry.label}
            </Link>
          </MotionItem>
        ))}
      </MotionPage>
    </SiteShell>
  );
}
