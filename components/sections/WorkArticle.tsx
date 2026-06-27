import styles from "@/components/sections/work-article.module.css";
import { WorkArticleOutline } from "@/components/sections/WorkArticleOutline";
import { ScrollToTopButton } from "@/components/sections/ScrollToTopButton";
import { WorkShortSummaryContent } from "@/components/sections/WorkShortSummaryToggle";

interface WorkArticleProps {
  content: React.ReactNode;
  showOutline?: boolean;
}

export function WorkArticle({ content, showOutline = true }: WorkArticleProps) {
  return (
    <article className={styles.article}>
      {showOutline ? <WorkArticleOutline /> : null}
      <WorkShortSummaryContent>
        <div className={styles.mdxRoot} data-work-article-root="">
          {content}
        </div>
      </WorkShortSummaryContent>
      <ScrollToTopButton />
    </article>
  );
}
