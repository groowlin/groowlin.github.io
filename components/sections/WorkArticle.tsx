import styles from "@/components/sections/work-article.module.css";
import { WorkArticleOutline } from "@/components/sections/WorkArticleOutline";
import { ScrollToTopButton } from "@/components/sections/ScrollToTopButton";
import { WorkShortSummaryContent } from "@/components/sections/WorkShortSummaryToggle";

interface WorkArticleProps {
  content: React.ReactNode;
  shortAfterContent?: React.ReactNode;
  showOutline?: boolean;
}

export function WorkArticle({ content, shortAfterContent, showOutline = true }: WorkArticleProps) {
  return (
    <article className={styles.article}>
      {showOutline ? <WorkArticleOutline /> : null}
      <WorkShortSummaryContent shortAfterContent={shortAfterContent}>
        <div className={styles.mdxRoot} data-work-article-root="">
          {content}
        </div>
      </WorkShortSummaryContent>
      <ScrollToTopButton />
    </article>
  );
}
