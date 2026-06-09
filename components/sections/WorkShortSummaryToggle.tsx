"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "@/components/sections/work-short-summary-toggle.module.css";
import type { WorkCaseShortSummary } from "@/lib/content/types";

interface WorkShortSummaryToggleProps {
  children: ReactNode;
  shortSummary?: WorkCaseShortSummary;
}

type DisplayMode = "full" | "short";

const TRANSITION_DURATION_MS = 700;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function WorkShortSummaryToggle({ children, shortSummary }: WorkShortSummaryToggleProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("full");
  const [isCollapsing, setIsCollapsing] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  if (!shortSummary) {
    return <>{children}</>;
  }

  const targetMode: DisplayMode = displayMode === "full" ? "short" : "full";
  const label = displayMode === "full" ? "Коротко" : "Полностью";

  function handleToggle() {
    if (isCollapsing) {
      return;
    }

    if (prefersReducedMotion()) {
      setDisplayMode(targetMode);
      return;
    }

    setIsCollapsing(true);
    transitionTimerRef.current = window.setTimeout(() => {
      setDisplayMode(targetMode);
      setIsCollapsing(false);
      transitionTimerRef.current = null;
    }, TRANSITION_DURATION_MS);
  }

  return (
    <div className={styles.root}>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.toggleButton}
          aria-pressed={displayMode === "short"}
          aria-label={displayMode === "full" ? "Показать короткую версию кейса" : "Показать полный кейс"}
          disabled={isCollapsing}
          onClick={handleToggle}
        >
          <span className={styles.icon} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span>{label}</span>
        </button>
      </div>

      <div className={styles.filterHost} aria-hidden="true">
        <svg width="0" height="0" focusable="false">
          <filter id="case-summary-wave-filter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.02 0.18"
              numOctaves="1"
              seed="9"
              result="waveNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="waveNoise"
              scale="5"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>
      </div>

      <div className={styles.contentShell} data-collapsing={isCollapsing ? "true" : "false"}>
        <div className={styles.waveLayer} aria-hidden="true" />
        {displayMode === "full" ? (
          children
        ) : (
          <section className={styles.shortSummary} aria-label="Короткая версия кейса">
            {shortSummary.title ? <h1 data-page-reveal="">{shortSummary.title}</h1> : null}
            <ul>
              {shortSummary.items.map((item) => (
                <li key={item} data-page-reveal="">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
