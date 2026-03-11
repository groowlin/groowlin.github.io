import type { Metadata } from "next";
import { MediaPlaceholderView } from "@/components/media/MediaPlaceholder";
import { MotionItem } from "@/components/motion/MotionItem";
import { MotionPage } from "@/components/motion/MotionPage";
import { SiteShell } from "@/components/shell/SiteShell";
import { explorationItems, staticPageMeta } from "@/lib/content";
import styles from "@/app/page-content.module.css";

const meta = staticPageMeta.explorations;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: meta.canonical }
};

export default function ExplorationsPage() {
  return (
    <SiteShell title="Explorations" subtitle="2020-present - Misc. creative exercises" showMetaNav={false}>
      <MotionPage className={styles.masonry}>
        {explorationItems.map((media, index) => (
          <MotionItem key={`${media.posterToken}-${index}`} className={styles.masonryItem}>
            <MediaPlaceholderView media={media} />
          </MotionItem>
        ))}
      </MotionPage>
    </SiteShell>
  );
}
