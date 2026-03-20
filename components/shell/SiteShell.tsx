import Link from "next/link";
import { getSiteHeaderContent } from "@/lib/content/site.server";
import styles from "@/components/shell/site-shell.module.css";

interface SiteShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  subtitleMuted?: boolean;
  showMetaNav?: boolean;
}

export async function SiteShell({
  children,
  title,
  subtitle,
  subtitleMuted = true,
  showMetaNav = true
}: SiteShellProps) {
  const header = showMetaNav ? await getSiteHeaderContent() : null;

  return (
    <main className={styles.main}>
      <div className={styles.inner}>
        <Link className={styles.logoLink} href="/" aria-label="Go to the homepage">
          <span className={styles.logoMark} aria-hidden="true" />
        </Link>

        {(title || subtitle) && (
          <header className={styles.headerBlock}>
            {title && <h1 className={styles.title}>{title}</h1>}
            {subtitle && (
              <p className={[styles.subtitle, subtitleMuted ? styles.subtitleMuted : styles.subtitleStrong].join(" ")}>
                {subtitle}
              </p>
            )}
          </header>
        )}

        {showMetaNav && (
          <nav className={styles.metaNav} aria-label="Meta navigation">
            {header?.metaNav.map((item) => (
              <Link key={item.href} className={styles.metaLink} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {children}
      </div>
    </main>
  );
}
