import { PageRevealSequence } from "@/components/motion/PageRevealSequence";
import styles from "@/components/shell/site-shell.module.css";

interface SiteShellProps {
  children: React.ReactNode;
  title?: string;
  titleMobileBreakAfter?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  subtitleMuted?: boolean;
  subtitleVariant?: "default" | "workMeta";
}

export function SiteShell({
  children,
  title,
  titleMobileBreakAfter,
  subtitle,
  headerAction,
  subtitleMuted = true,
  subtitleVariant = "default"
}: SiteShellProps) {
  const hasHeaderBlock = Boolean(title || subtitle);
  const bodyClassName = hasHeaderBlock ? styles.compensated : undefined;
  const titleBreakIndex = title && titleMobileBreakAfter ? title.indexOf(titleMobileBreakAfter) : -1;
  const titleBreakOffset = titleBreakIndex + (titleMobileBreakAfter?.length ?? 0);
  const titleHasMobileBreak = titleBreakIndex >= 0;

  return (
    <PageRevealSequence className={styles.revealStack}>
      {hasHeaderBlock && (
        <header className={[styles.headerBlock, styles.compensated].filter(Boolean).join(" ")}>
          <div className={styles.headerText}>
            {title && (
              <h1 className={styles.title} data-page-reveal="">
                {titleHasMobileBreak ? (
                  <>
                    {title.slice(0, titleBreakOffset)}
                    <br className={styles.mobileTitleBreak} />
                    {title.slice(titleBreakOffset).trimStart()}
                  </>
                ) : (
                  title
                )}
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
