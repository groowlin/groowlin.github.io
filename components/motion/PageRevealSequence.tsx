"use client";

import { useEffect, useRef } from "react";
import styles from "@/components/motion/page-reveal-sequence.module.css";

interface PageRevealSequenceProps {
  children: React.ReactNode;
  className?: string;
}

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function PageRevealSequence({ children, className }: PageRevealSequenceProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    root.dataset.state = "pending";

    const allTargets = Array.from(root.querySelectorAll("[data-page-reveal]")) as HTMLElement[];
    const targets = allTargets.filter((target) => !target.querySelector("[data-page-reveal]"));

    let frameId = 0;
    let timeoutId = 0;

    const prepareTargets = () => {
      let revealIndex = 0;

      targets.forEach((target) => {
        const rect = target.getBoundingClientRect();
        const isAboveViewport = rect.bottom <= 0;

        if (isAboveViewport) {
          target.dataset.pageRevealState = "instant";
          target.style.removeProperty("--page-reveal-index");
          return;
        }

        target.dataset.pageRevealState = "animate";
        target.style.setProperty("--page-reveal-index", String(revealIndex));
        revealIndex += 1;
      });

      root.dataset.state = "ready";
    };

    const queuePrepareTargets = () => {
      frameId = window.requestAnimationFrame(() => {
        frameId = window.requestAnimationFrame(() => {
          prepareTargets();
        });
      });
    };

    const onScrollRestored = () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("app:scroll-restored", onScrollRestored);
      queuePrepareTargets();
    };

    window.addEventListener("app:scroll-restored", onScrollRestored, { once: true });
    timeoutId = window.setTimeout(onScrollRestored, 250);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      window.removeEventListener("app:scroll-restored", onScrollRestored);
      delete root.dataset.state;
      targets.forEach((target) => {
        target.style.removeProperty("--page-reveal-index");
        delete target.dataset.pageRevealState;
      });
    };
  }, []);

  return (
    <div ref={rootRef} className={joinClassNames(styles.root, className)} data-state="pending">
      {children}
    </div>
  );
}
