import Image from "next/image";
import Link from "next/link";
import type { TopCardContent } from "@/lib/content/types";
import styles from "@/components/navigation/top-card.module.css";

interface TopCardProps {
  card: TopCardContent;
  className?: string;
}

export function TopCard({ card, className }: TopCardProps) {
  return (
    <Link href={card.link} className={[styles.card, className].filter(Boolean).join(" ")}>
      <span className={styles.row}>
        <span className={styles.photoWrap}>
          <Image className={styles.photo} src={card.photo} alt={card.title} width={64} height={64} />
        </span>

        <span className={styles.text}>
          <span className={styles.title}>{card.title}</span>

          <span className={styles.subtitleRow}>
            <span className={styles.subtitle}>{card.subtitle}</span>

            {card.icons.length > 0 ? (
              <span className={styles.icons} aria-hidden="true">
                {card.icons.map((iconPath, index) => (
                  <Image key={`${iconPath}-${index}`} className={styles.icon} src={iconPath} alt="" width={18} height={18} />
                ))}
              </span>
            ) : null}
          </span>
        </span>
      </span>

      <span className={styles.arrow} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false">
          <path
            d="M9 6L15 12L9 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </Link>
  );
}
