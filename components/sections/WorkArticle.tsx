import Link from "next/link";
import { MediaPlaceholderView } from "@/components/media/MediaPlaceholder";
import { type SimpleSectionBlock, type WorkCase } from "@/lib/content/types";
import styles from "@/components/sections/work-article.module.css";

interface WorkArticleProps {
  entry: WorkCase;
}

function renderSimpleSection(slug: string, section: SimpleSectionBlock, keyPrefix: string) {
  if (section.type === "paragraph") {
    return (
      <section key={`${slug}-${keyPrefix}-p`} className={styles.section}>
        {section.title && <h3 className={styles.sectionTitle}>{section.title}</h3>}
        <p className={styles.body}>{section.body}</p>
      </section>
    );
  }

  if (section.type === "list") {
    return (
      <section key={`${slug}-${keyPrefix}-l`} className={styles.section}>
        {section.title && <h3 className={styles.sectionTitle}>{section.title}</h3>}
        <ul>
          {section.items.map((item) => (
            <li key={`${slug}-${keyPrefix}-${item}`}>{item}</li>
          ))}
        </ul>
      </section>
    );
  }

  if (section.type === "media") {
    return (
      <section key={`${slug}-${keyPrefix}-m`} className={styles.section}>
        <MediaPlaceholderView media={section.media} variant="work" />
      </section>
    );
  }

  if (section.type === "quote") {
    return (
      <blockquote key={`${slug}-${keyPrefix}-q`} className={styles.quote}>
        <p>{section.quote}</p>
        {section.attribution && <footer>{section.attribution}</footer>}
      </blockquote>
    );
  }

  return (
    <section key={`${slug}-${keyPrefix}-c`} className={styles.section}>
      {section.body && <p className={styles.body}>{section.body}</p>}
      <Link className={styles.cta} href={section.href}>
        {section.label}
      </Link>
    </section>
  );
}

export function WorkArticle({ entry }: WorkArticleProps) {
  return (
    <article className={styles.article}>
      {entry.sections.map((section, index) => {
        if (
          section.type === "paragraph" ||
          section.type === "list" ||
          section.type === "media" ||
          section.type === "quote" ||
          section.type === "cta"
        ) {
          return renderSimpleSection(entry.slug, section, `${index}`);
        }

        if (section.type === "gallery") {
          return (
            <section key={`${entry.slug}-g-${index}`} className={styles.section}>
              {section.title && <h2 className={styles.sectionTitle}>{section.title}</h2>}
              {section.body && <p className={styles.body}>{section.body}</p>}
              <div className={section.layout === "carousel" ? styles.galleryCarousel : styles.galleryGrid}>
                {section.items.map((item, itemIndex) => (
                  <MediaPlaceholderView key={`${entry.slug}-g-${index}-${itemIndex}`} media={item} variant="work" />
                ))}
              </div>
            </section>
          );
        }

        if (section.type === "metrics") {
          return (
            <section key={`${entry.slug}-metrics-${index}`} className={styles.section}>
              {section.title && <h2 className={styles.sectionTitle}>{section.title}</h2>}
              <div className={styles.metricsGrid}>
                {section.items.map((item) => (
                  <div key={`${entry.slug}-${index}-${item.label}`} className={styles.metricCard}>
                    <p className={styles.metricValue}>{item.value}</p>
                    <p className={styles.metricLabel}>{item.label}</p>
                    {item.note && <p className={styles.metricNote}>{item.note}</p>}
                  </div>
                ))}
              </div>
            </section>
          );
        }

        if (section.type === "timeline") {
          return (
            <section key={`${entry.slug}-timeline-${index}`} className={styles.section}>
              {section.title && <h2 className={styles.sectionTitle}>{section.title}</h2>}
              <ol className={styles.timelineList}>
                {section.items.map((item, itemIndex) => (
                  <li key={`${entry.slug}-${index}-${item.title}-${itemIndex}`} className={styles.timelineItem}>
                    <div className={styles.timelineHeader}>
                      <h3 className={styles.timelineTitle}>{item.title}</h3>
                      {item.period && <p className={styles.timelinePeriod}>{item.period}</p>}
                    </div>
                    {item.body && <p className={styles.body}>{item.body}</p>}
                    {item.media && <MediaPlaceholderView media={item.media} variant="work" />}
                  </li>
                ))}
              </ol>
            </section>
          );
        }

        return (
          <section key={`${entry.slug}-two-column-${index}`} className={styles.section}>
            {section.title && <h2 className={styles.sectionTitle}>{section.title}</h2>}
            <div className={styles.twoColumn}>
              <div className={styles.columnStack}>
                {section.left.map((item, nestedIndex) =>
                  renderSimpleSection(entry.slug, item, `${index}-left-${nestedIndex}`)
                )}
              </div>
              <div className={styles.columnStack}>
                {section.right.map((item, nestedIndex) =>
                  renderSimpleSection(entry.slug, item, `${index}-right-${nestedIndex}`)
                )}
              </div>
            </div>
          </section>
        );
      })}
    </article>
  );
}
