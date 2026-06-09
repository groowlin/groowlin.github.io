import styles from "@/components/sections/work-article.module.css";
import { ScrollToTopButton } from "@/components/sections/ScrollToTopButton";
import { WorkShortSummaryToggle } from "@/components/sections/WorkShortSummaryToggle";
import type { WorkCaseShortSummary } from "@/lib/content/types";

interface WorkArticleProps {
  content: React.ReactNode;
  shortSummary?: WorkCaseShortSummary;
}

export function WorkArticle({ content, shortSummary }: WorkArticleProps) {
  return (
    <article className={styles.article}>
      <WorkShortSummaryToggle shortSummary={shortSummary}>
        <div className={styles.mdxRoot}>{content}</div>
      </WorkShortSummaryToggle>
      <ScrollToTopButton />
    </article>
  );
}
