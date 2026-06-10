"use client";

import Image from "next/image";
import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { GalleryLightbox } from "@/components/media/GalleryLightbox";
import styles from "@/components/sections/work-short-summary-toggle.module.css";
import type { WorkCaseShortSummary } from "@/lib/content/types";

interface WorkShortSummaryProviderProps {
  children: ReactNode;
  shortSummary?: WorkCaseShortSummary;
}

interface WorkShortSummaryContentProps {
  children: ReactNode;
}

interface WorkShortSummaryButtonProps {
  className?: string;
}

type DisplayMode = "full" | "short";
const ICON_SIZE = 36;

interface WorkShortSummaryContextValue {
  displayMode: DisplayMode;
  shortSummary?: WorkCaseShortSummary;
  toggleDisplayMode: () => void;
}

const WorkShortSummaryContext = createContext<WorkShortSummaryContextValue | null>(null);

function useWorkShortSummary() {
  return useContext(WorkShortSummaryContext);
}

function useIsHydrated() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
}

function renderLineBreaks(text: string) {
  return text.split("\n").map((line, index, lines) => (
    <span key={`${line}-${index}`}>
      {line.endsWith(":") ? <span className={styles.shortLabel}>{line}</span> : line}
      {index < lines.length - 1 ? <br /> : null}
    </span>
  ));
}

export function WorkShortSummaryProvider({ children, shortSummary }: WorkShortSummaryProviderProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("full");

  function toggleDisplayMode() {
    setDisplayMode((currentMode) => (currentMode === "full" ? "short" : "full"));

    if (window.matchMedia("(max-width: 768px)").matches) {
      window.requestAnimationFrame(() => {
        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      });
    }
  }

  return (
    <WorkShortSummaryContext.Provider value={{ displayMode, shortSummary, toggleDisplayMode }}>
      {children}
    </WorkShortSummaryContext.Provider>
  );
}

export function WorkShortSummaryButton({ className }: WorkShortSummaryButtonProps) {
  const context = useWorkShortSummary();
  const isHydrated = useIsHydrated();

  if (!context?.shortSummary) {
    return null;
  }

  const { displayMode, toggleDisplayMode } = context;
  const iconSrc = displayMode === "full" ? "/media/system/read-fast.svg" : "/media/system/read-detailed.svg";
  const ariaLabel = displayMode === "full" ? "Показать короткую версию кейса" : "Показать полный кейс";

  return (
    <>
      <button
        type="button"
        className={[styles.toggleButton, styles.inlineButton, className].filter(Boolean).join(" ")}
        aria-pressed={displayMode === "short"}
        aria-label={ariaLabel}
        onClick={toggleDisplayMode}
      >
        <span className={styles.buttonContent}>
          <Image className={styles.icon} src={iconSrc} width={ICON_SIZE} height={ICON_SIZE} alt="" aria-hidden="true" />
        </span>
      </button>
      {isHydrated
        ? createPortal(
            <button
              type="button"
              className={[styles.toggleButton, styles.mobileFloatingButton].join(" ")}
              aria-pressed={displayMode === "short"}
              aria-label={ariaLabel}
              onClick={toggleDisplayMode}
            >
              <span className={styles.buttonContent}>
                <Image className={styles.icon} src={iconSrc} width={ICON_SIZE} height={ICON_SIZE} alt="" aria-hidden="true" />
              </span>
            </button>,
            document.body
          )
        : null}
    </>
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
          <div className={styles.shortText}>
            {shortSummary.paragraphs.map((paragraph) => (
              <p key={paragraph} data-page-reveal="">
                {renderLineBreaks(paragraph)}
              </p>
            ))}
          </div>
          {shortSummary.media && shortSummary.media.length > 0 ? (
            <>
              <br />
              <GalleryLightbox items={shortSummary.media} variant="work" />
            </>
          ) : null}
        </section>
      )}
    </div>
  );
}
