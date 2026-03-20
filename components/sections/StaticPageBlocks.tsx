import Link from "next/link";
import type { StaticPageContent } from "@/lib/content/types";
import styles from "@/app/page-content.module.css";

interface StaticPageBlocksProps {
  content: StaticPageContent;
}

export function StaticPageBlocks({ content }: StaticPageBlocksProps) {
  return (
    <>
      {content.blocks.map((block, index) => {
        if (block.type === "paragraph") {
          return (
            <section key={`${content.key}-paragraph-${index}`} className={styles.stack}>
              {block.title && <h2>{block.title}</h2>}
              <p className={styles.lead}>{block.body}</p>
            </section>
          );
        }

        if (block.type === "list") {
          return (
            <section key={`${content.key}-list-${index}`} className={styles.stack}>
              {block.title && <h2>{block.title}</h2>}
              <ul>
                {block.items.map((item, itemIndex) => (
                  <li key={`${content.key}-list-${index}-${itemIndex}`}>{item}</li>
                ))}
              </ul>
            </section>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote key={`${content.key}-quote-${index}`}>
              <p className={styles.lead}>{block.quote}</p>
              {block.attribution && <footer>{block.attribution}</footer>}
            </blockquote>
          );
        }

        return (
          <section key={`${content.key}-links-${index}`} className={styles.list}>
            {block.title && <h2>{block.title}</h2>}
            {block.items.map((item) => (
              <Link key={`${content.key}-${item.label}-${item.href}`} className={styles.listLink} href={item.href}>
                {item.label}
              </Link>
            ))}
          </section>
        );
      })}
    </>
  );
}
