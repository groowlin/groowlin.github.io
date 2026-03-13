import Link from "next/link";
import { metaNav } from "@/lib/content";
import styles from "@/components/shell/site-shell.module.css";

interface SiteShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showMetaNav?: boolean;
}

export function SiteShell({
  children,
  title,
  subtitle,
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
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
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
