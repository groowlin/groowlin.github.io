import { PageRevealSequence } from "@/components/motion/PageRevealSequence";
import { AnimatedTopCard } from "@/components/navigation/AnimatedTopCard";
import { getTopCardContent } from "@/lib/content/site.server";
import type { TopCardVariant } from "@/lib/content/types";
import styles from "@/components/shell/site-shell.module.css";

interface SiteShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  subtitleMuted?: boolean;
  subtitleVariant?: "default" | "workMeta";
  topCardVariant?: TopCardVariant;
}

export async function SiteShell({
  children,
  title,
  subtitle,
  headerAction,
  subtitleMuted = true,
  subtitleVariant = "default",
  topCardVariant
}: SiteShellProps) {
  const topCard = topCardVariant ? await getTopCardContent(topCardVariant) : null;
  const compensationClass = topCard ? styles.compensated : "";
  const hasHeaderBlock = Boolean(title || subtitle);
  const bodyClassName = topCard && hasHeaderBlock ? styles.compensated : undefined;

  return (
    <main className={styles.main}>
      <div className={styles.inner}>
        <div className={styles.pageStack}>
          {topCard && <AnimatedTopCard card={topCard} className={styles.topCard} />}

          <PageRevealSequence className={styles.revealStack}>
            {hasHeaderBlock && (
              <header className={[styles.headerBlock, compensationClass].filter(Boolean).join(" ")}>
                <div className={styles.headerText}>
                  {title && (
                    <h1 className={styles.title} data-page-reveal="">
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p
                      className={[
                        styles.subtitle,
                        subtitleMuted ? styles.subtitleMuted : styles.subtitleStrong,
                        subtitleVariant === "workMeta" ? styles.subtitleWorkMeta : ""
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      data-page-reveal=""
                    >
                      {subtitle}
                    </p>
                  )}
                </div>
                {headerAction ? (
                  <div className={styles.headerAction} data-page-reveal="">
                    {headerAction}
                  </div>
                ) : null}
              </header>
            )}

            <div className={bodyClassName}>
              {children}
            </div>
          </PageRevealSequence>
        </div>
      </div>
    </main>
  );
}
