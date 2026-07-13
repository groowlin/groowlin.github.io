import { PageRevealSequence } from "@/components/motion/PageRevealSequence";
import styles from "@/components/shell/site-shell.module.css";

interface SiteShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  subtitleMuted?: boolean;
  subtitleVariant?: "default" | "workMeta";
}

export function SiteShell({
  children,
  title,
  subtitle,
  headerAction,
  subtitleMuted = true,
  subtitleVariant = "default"
}: SiteShellProps) {
  const hasHeaderBlock = Boolean(title || subtitle);
  const bodyClassName = hasHeaderBlock ? styles.compensated : undefined;

  return (
    <PageRevealSequence className={styles.revealStack}>
      {hasHeaderBlock && (
        <header className={[styles.headerBlock, styles.compensated].filter(Boolean).join(" ")}>
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

      <div className={bodyClassName}>{children}</div>
    </PageRevealSequence>
  );
}
