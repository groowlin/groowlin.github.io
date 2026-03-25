import type { Metadata } from "next";
import { MotionItem } from "@/components/motion/MotionItem";
import { MotionPage } from "@/components/motion/MotionPage";
import { SiteShell } from "@/components/shell/SiteShell";
import { getContactLinks, getStaticPageContent } from "@/lib/content/site.server";
import styles from "@/app/page-content.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getStaticPageContent("connect");

  return {
    title: content.meta.title,
    description: content.meta.description,
    alternates: { canonical: content.meta.canonical }
  };
}

export default async function ConnectPage() {
  const [content, contacts] = await Promise.all([getStaticPageContent("connect"), getContactLinks()]);

  return (
    <SiteShell title={content.meta.title} showMetaNav={false}>
      <MotionPage className={styles.stack}>
        <MotionItem>
          <article className={styles.mdxContent}>{content.content}</article>
        </MotionItem>
        {contacts.length > 0 ? (
          <MotionItem>
            <section className={styles.list}>
              {contacts.map((item) => (
                <a key={`${item.label}-${item.href}`} href={item.href} className={styles.listLink}>
                  {item.label}
                </a>
              ))}
            </section>
          </MotionItem>
        ) : null}
      </MotionPage>
    </SiteShell>
  );
}
