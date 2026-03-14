import Link from "next/link";
import { metaNav } from "@/lib/content";
import styles from "@/components/shell/site-shell.module.css";

interface SiteShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  subtitleMuted?: boolean;
  showMetaNav?: boolean;
}

export function SiteShell({
  children,
  title,
  subtitle,
  subtitleMuted = true,
  showMetaNav = true
}: SiteShellProps) {
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
            {metaNav.map((item) => (
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
