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

    targets.forEach((target, index) => {
      target.style.setProperty("--page-reveal-index", String(index));
    });

    let frameId = 0;

    frameId = window.requestAnimationFrame(() => {
      root.dataset.state = "ready";
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      delete root.dataset.state;
      targets.forEach((target) => {
        target.style.removeProperty("--page-reveal-index");
      });
    };
  }, []);

  return (
    <div ref={rootRef} className={joinClassNames(styles.root, className)} data-state="pending">
      {children}
    </div>
  );
}
