import styles from "@/components/sections/work-article.module.css";

interface WorkArticleProps {
  content: React.ReactNode;
}

export function WorkArticle({ content }: WorkArticleProps) {
  return (
    <article className={styles.article}>
      <div className={styles.mdxRoot}>{content}</div>
    </article>
  );
}
