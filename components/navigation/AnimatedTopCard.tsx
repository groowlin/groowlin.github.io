"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { TopCard } from "@/components/navigation/TopCard";
import type { TopCardContent } from "@/lib/content/types";
import styles from "@/components/shell/site-shell.module.css";

interface AnimatedTopCardProps {
  card: TopCardContent;
  className?: string;
}

function getCardKey(card: TopCardContent) {
  return [card.variant, card.photo, card.title, card.subtitle, card.link, card.icons.join("|")].join("::");
}

export function AnimatedTopCard({ card, className }: AnimatedTopCardProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <TopCard card={card} className={className} />;
  }

  return (
    <div className={styles.topCardStage}>
      <AnimatePresence initial mode="sync">
        <motion.div
          key={getCardKey(card)}
          className={styles.topCardLayer}
          initial={{ opacity: 0.22, filter: "blur(18px)", scale: 0.985 }}
          animate={{
            opacity: 1,
            filter: "blur(0px)",
            scale: 1,
            transition: {
              duration: 1.24,
              delay: 0.08,
              ease: [0.22, 1, 0.36, 1]
            }
          }}
          exit={{
            opacity: 0.2,
            filter: "blur(16px)",
            scale: 1.01,
            transition: {
              duration: 0.68,
              ease: [0.4, 0, 0.2, 1]
            }
          }}
          style={{ willChange: "filter, opacity, transform" }}
        >
          <TopCard card={card} className={className} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
