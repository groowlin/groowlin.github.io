import { MotionItem } from "@/components/motion/MotionItem";
import { MotionPage } from "@/components/motion/MotionPage";
import { TopCard } from "@/components/navigation/TopCard";
import { getTopCardContent } from "@/lib/content/site.server";
import type { TopCardVariant } from "@/lib/content/types";
import styles from "@/components/shell/site-shell.module.css";

interface SiteShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  subtitleMuted?: boolean;
  topCardVariant?: TopCardVariant;
}

export async function SiteShell({
  children,
  title,
  subtitle,
  subtitleMuted = true,
  topCardVariant
}: SiteShellProps) {
  const topCard = topCardVariant ? await getTopCardContent(topCardVariant) : null;
  const hasHeaderBlock = Boolean(title || subtitle);
  const hasAnimatedHeaderContent = hasHeaderBlock || Boolean(topCard);

  return (
    <main className={styles.main}>
      <div className={styles.inner}>
        {hasAnimatedHeaderContent && (
          <MotionPage className={styles.headerStack}>
            {topCard && (
              <MotionItem>
                <TopCard card={topCard} className={styles.topCard} />
              </MotionItem>
            )}

            {hasHeaderBlock && (
              <MotionItem>
                <header className={styles.headerBlock}>
                  {title && <h1 className={styles.title}>{title}</h1>}
                  {subtitle && (
                    <p className={[styles.subtitle, subtitleMuted ? styles.subtitleMuted : styles.subtitleStrong].join(" ")}>
                      {subtitle}
                    </p>
                  )}
                </header>
              </MotionItem>
            )}
          </MotionPage>
        )}

        {children}
      </div>
    </main>
  );
}
