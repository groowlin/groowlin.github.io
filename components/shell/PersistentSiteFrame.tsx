"use client";

import { AnimatedTopCard } from "@/components/navigation/AnimatedTopCard";
import { BottomPaddingController } from "@/components/shell/BottomPaddingController";
import type { TopCardContent, TopCardVariant } from "@/lib/content/types";
import styles from "@/components/shell/site-shell.module.css";

interface PersistentSiteFrameProps {
  children: React.ReactNode;
  topCards: Record<TopCardVariant, TopCardContent>;
  workSlugs: string[];
}

export function PersistentSiteFrame({ children, topCards, workSlugs }: PersistentSiteFrameProps) {
  return (
    <main className={styles.main} data-page-main="">
      <div className={styles.inner}>
        <div className={styles.pageStack}>
          <AnimatedTopCard topCards={topCards} workSlugs={workSlugs} className={styles.topCard} />
          {children}
          <div aria-hidden="true" data-page-content-end="" />
        </div>
      </div>
      <BottomPaddingController />
    </main>
  );
}
