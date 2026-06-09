"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import styles from "@/components/sections/work-short-summary-toggle.module.css";
import type { WorkCaseShortSummary } from "@/lib/content/types";

interface WorkShortSummaryProviderProps {
  children: ReactNode;
  shortSummary?: WorkCaseShortSummary;
}

interface WorkShortSummaryContentProps {
  children: ReactNode;
}

type DisplayMode = "full" | "short";

interface WorkShortSummaryContextValue {
  displayMode: DisplayMode;
  shortSummary?: WorkCaseShortSummary;
  toggleDisplayMode: () => void;
}

const WorkShortSummaryContext = createContext<WorkShortSummaryContextValue | null>(null);

function useWorkShortSummary() {
  return useContext(WorkShortSummaryContext);
}

export function WorkShortSummaryProvider({ children, shortSummary }: WorkShortSummaryProviderProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("full");

  function toggleDisplayMode() {
    setDisplayMode((currentMode) => (currentMode === "full" ? "short" : "full"));
  }

  return (
    <WorkShortSummaryContext.Provider value={{ displayMode, shortSummary, toggleDisplayMode }}>
      {children}
    </WorkShortSummaryContext.Provider>
  );
}

export function WorkShortSummaryButton() {
  const context = useWorkShortSummary();

  if (!context?.shortSummary) {
    return null;
  }

  const { displayMode, toggleDisplayMode } = context;
  const label = displayMode === "full" ? "Коротко" : "Полностью";

  return (
    <button
      type="button"
      className={styles.toggleButton}
      aria-pressed={displayMode === "short"}
      aria-label={displayMode === "full" ? "Показать короткую версию кейса" : "Показать полный кейс"}
      onClick={toggleDisplayMode}
    >
      <span className={styles.icon} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </span>
      <span>{label}</span>
    </button>
  );
}

export function WorkShortSummaryContent({ children }: WorkShortSummaryContentProps) {
  const context = useWorkShortSummary();

  if (!context?.shortSummary) {
    return <>{children}</>;
  }

  const { displayMode, shortSummary } = context;

  if (!shortSummary) {
    return <>{children}</>;
  }

  return (
    <div className={styles.contentShell}>
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
  );
}
