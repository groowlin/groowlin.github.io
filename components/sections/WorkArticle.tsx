import Link from "next/link";
import { MediaPlaceholderView } from "@/components/media/MediaPlaceholder";
import { type WorkCase } from "@/lib/content/types";
import styles from "@/components/sections/work-article.module.css";

interface WorkArticleProps {
  entry: WorkCase;
}

export function WorkArticle({ entry }: WorkArticleProps) {
  return (
    <article className={styles.article}>
      <MediaPlaceholderView media={entry.heroMedia} />

      {entry.sections.map((section, index) => {
        if (section.type === "paragraph") {
          return (
            <section key={`${entry.slug}-p-${index}`} className={styles.section}>
              {section.title && <h2 className={styles.sectionTitle}>{section.title}</h2>}
              <p className={styles.body}>{section.body}</p>
            </section>
          );
        }

        if (section.type === "list") {
          return (
            <section key={`${entry.slug}-l-${index}`} className={styles.section}>
              {section.title && <h2 className={styles.sectionTitle}>{section.title}</h2>}
              <ul>
                {section.items.map((item) => (
                  <li key={`${entry.slug}-${item}`}>{item}</li>
                ))}
              </ul>
            </section>
          );
        }

        if (section.type === "media") {
          return (
            <section key={`${entry.slug}-m-${index}`} className={styles.section}>
              {section.title && <h2 className={styles.sectionTitle}>{section.title}</h2>}
              {section.body && <p className={styles.body}>{section.body}</p>}
              <MediaPlaceholderView media={section.media} />
            </section>
          );
        }

        if (section.type === "quote") {
          return (
            <blockquote key={`${entry.slug}-q-${index}`} className={styles.quote}>
              <p>{section.quote}</p>
              {section.attribution && <footer>{section.attribution}</footer>}
            </blockquote>
          );
        }

        return (
          <section key={`${entry.slug}-c-${index}`} className={styles.section}>
            {section.body && <p className={styles.body}>{section.body}</p>}
            <Link className={styles.cta} href={section.href}>
              {section.label}
            </Link>
          </section>
        );
      })}
    </article>
  );
}
