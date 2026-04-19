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
  subtitleVariant?: "default" | "workMeta";
  topCardVariant?: TopCardVariant;
}

export async function SiteShell({
  children,
  title,
  subtitle,
  subtitleMuted = true,
  subtitleVariant = "default",
  topCardVariant
}: SiteShellProps) {
  const topCard = topCardVariant ? await getTopCardContent(topCardVariant) : null;
  const compensationClass = topCard ? styles.compensated : "";
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
                <header className={[styles.headerBlock, compensationClass].filter(Boolean).join(" ")}>
                  {title && <h1 className={styles.title}>{title}</h1>}
                  {subtitle && (
                    <p
                      className={[
                        styles.subtitle,
                        subtitleMuted ? styles.subtitleMuted : styles.subtitleStrong,
                        subtitleVariant === "workMeta" ? styles.subtitleWorkMeta : ""
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {subtitle}
                    </p>
                  )}
                </header>
              </MotionItem>
            )}
          </MotionPage>
        )}

        {topCard ? <div className={styles.compensated}>{children}</div> : children}
      </div>
    </main>
  );
}
