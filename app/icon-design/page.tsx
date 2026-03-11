import type { Metadata } from "next";
import { MediaPlaceholderView } from "@/components/media/MediaPlaceholder";
import { MotionItem } from "@/components/motion/MotionItem";
import { MotionPage } from "@/components/motion/MotionPage";
import { SiteShell } from "@/components/shell/SiteShell";
import { iconDesignItems, staticPageMeta } from "@/lib/content";
import styles from "@/app/page-content.module.css";

const meta = staticPageMeta.iconDesign;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: meta.canonical }
};

export default function IconDesignPage() {
  return (
    <SiteShell title="App icon design" subtitle="2020-present - iOS and macOS app icons" showMetaNav={false}>
      <MotionPage className={styles.iconGrid}>
        {iconDesignItems.map((item) => (
          <MotionItem key={item} className={styles.iconCard}>
            <MediaPlaceholderView media={{ kind: "image", aspectRatio: "1 / 1", posterToken: item }} />
            <p className={styles.iconTitle}>{item}</p>
          </MotionItem>
        ))}
      </MotionPage>
    </SiteShell>
  );
}
