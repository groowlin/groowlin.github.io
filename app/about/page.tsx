import type { Metadata } from "next";
import { MotionItem } from "@/components/motion/MotionItem";
import { MotionPage } from "@/components/motion/MotionPage";
import { SiteShell } from "@/components/shell/SiteShell";
import { staticPageMeta } from "@/lib/content";
import styles from "@/app/page-content.module.css";

const meta = staticPageMeta.about;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: meta.canonical }
};

export default function AboutPage() {
  return (
    <SiteShell title="About" showMetaNav={false}>
      <MotionPage className={styles.stack}>
        <MotionItem>
          <p className={styles.lead}>
            Product and interaction designer focused on visual systems, motion language, and expressive yet clear user
            interfaces.
          </p>
        </MotionItem>
        <MotionItem>
          <p className={styles.lead}>
            This clone preserves the editorial rhythm and interaction model of the original site while using
            placeholder media assets for phase 1 delivery.
          </p>
        </MotionItem>
      </MotionPage>
    </SiteShell>
  );
}
