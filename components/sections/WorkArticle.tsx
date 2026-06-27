import styles from "@/components/sections/work-article.module.css";
import { WorkArticleOutline } from "@/components/sections/WorkArticleOutline";
import { ScrollToTopButton } from "@/components/sections/ScrollToTopButton";
import { WorkShortSummaryContent } from "@/components/sections/WorkShortSummaryToggle";

interface WorkArticleProps {
  content: React.ReactNode;
}

export function WorkArticle({ content }: WorkArticleProps) {
  return (
    <article className={styles.article}>
      <WorkArticleOutline />
      <WorkShortSummaryContent>
        <div className={styles.mdxRoot} data-work-article-root="">
          {content}
        </div>
      </WorkShortSummaryContent>
      <ScrollToTopButton />
    </article>
  );
}
