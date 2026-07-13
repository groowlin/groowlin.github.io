import Image from "next/image";
import Link from "next/link";
import type { TopCardContent } from "@/lib/content/types";
import styles from "@/components/navigation/top-card.module.css";

interface TopCardProps {
  card: TopCardContent;
  className?: string;
  showArrow?: boolean;
}

type TopCardVisualProps = TopCardProps;

interface TopCardArrowProps {
  className?: string;
  positioned?: boolean;
}

export function getExternalLinkProps(href: string) {
  return /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i.test(href) ? { target: "_blank", rel: "noopener noreferrer" } : {};
}

function TopCardBody({ card, showArrow }: Pick<TopCardProps, "card" | "showArrow">) {
  return (
    <>
      <span className={styles.row}>
        <span className={styles.photoWrap}>
          <Image className={styles.photo} src={card.photo} alt={card.title} width={64} height={64} draggable={false} />
        </span>

        <span className={styles.text}>
          <span className={styles.title}>{card.title}</span>

          <span className={styles.subtitleRow}>
            <span className={styles.subtitle}>{card.subtitle}</span>

            {card.icons.length > 0 ? (
              <span className={styles.icons} aria-hidden="true">
                {card.icons.map((iconPath, index) => (
                  <Image key={`${iconPath}-${index}`} className={styles.icon} src={iconPath} alt="" width={18} height={18} draggable={false} />
                ))}
              </span>
            ) : null}
          </span>
        </span>
      </span>

      {showArrow ? <TopCardArrow /> : null}
    </>
  );
}

export function TopCardArrow({ className, positioned = true }: TopCardArrowProps) {
  return (
    <span
      className={[styles.arrowGlyph, positioned ? styles.arrow : "", className].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
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
  );
}

export function TopCardVisual({ card, className, showArrow = true }: TopCardVisualProps) {
  return (
    <div className={[styles.card, styles.visualCard, className].filter(Boolean).join(" ")} aria-hidden="true">
      <TopCardBody card={card} showArrow={showArrow} />
    </div>
  );
}

export function TopCard({ card, className, showArrow = true }: TopCardProps) {
  return (
    <Link
      href={card.link}
      scroll={false}
      className={[styles.card, className].filter(Boolean).join(" ")}
      {...getExternalLinkProps(card.link)}
    >
      <TopCardBody card={card} showArrow={showArrow} />
    </Link>
  );
}
