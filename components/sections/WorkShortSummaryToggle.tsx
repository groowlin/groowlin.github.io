"use client";

import Image from "next/image";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { GalleryLightbox } from "@/components/media/GalleryLightbox";
import { PageRevealSequence } from "@/components/motion/PageRevealSequence";
import { getCurrentPath, trackMetricaGoal } from "@/lib/analytics/yandex-metrica";
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
const SHELL_COLOR = "#f5f5f5";
const SHELL_FLASH_COLOR = "#ffffff";

const SHORT_SUMMARY_LABELS = new Set([
  "Проблема",
  "Решение",
  "Решения",
  "Ожидаемый эффект",
  "Задача",
  "Подход",
  "Что получилось",
  "Продуктовая задача",
  "Аналитика и развитие",
  "Автоматизация и AI"
]);

interface WorkShortSummaryContextValue {
  displayMode: DisplayMode;
  hasToggled: boolean;
  shortSummary?: WorkCaseShortSummary;
  setDisplayMode: (mode: DisplayMode) => void;
  toggleDisplayMode: () => void;
}

const WorkShortSummaryContext = createContext<WorkShortSummaryContextValue | null>(null);

function useWorkShortSummary() {
  return useContext(WorkShortSummaryContext);
}

export function useWorkShortSummaryState() {
  return useWorkShortSummary();
}

function renderLineBreaks(text: string) {
  return text.split("\n").map((line, index, lines) => (
    <span key={`${line}-${index}`}>
      {SHORT_SUMMARY_LABELS.has(line.trim().replace(/:$/, "")) ? <span className={styles.shortLabel}>{line}</span> : line}
      {index < lines.length - 1 ? <br /> : null}
    </span>
  ));
}

function getShortSummaryBlocks(paragraph: string) {
  return paragraph
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

export function WorkShortSummaryProvider({ children, shortSummary }: WorkShortSummaryProviderProps) {
  const [displayMode, setDisplayModeState] = useState<DisplayMode>("full");
  const [hasToggled, setHasToggled] = useState(false);

  function updateDisplayMode(nextMode: DisplayMode) {
    if (nextMode === displayMode) {
      return;
    }

    setHasToggled(true);
    setDisplayModeState(nextMode);
    trackMetricaGoal(nextMode === "short" ? "short_mode_toggle_on" : "short_mode_toggle_off", {
      page_path: getCurrentPath()
    });

    if (window.matchMedia("(max-width: 768px)").matches) {
      window.requestAnimationFrame(() => {
        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      });
    }
  }

  function toggleDisplayMode() {
    updateDisplayMode(displayMode === "full" ? "short" : "full");
  }

  return (
    <WorkShortSummaryContext.Provider value={{ displayMode, hasToggled, shortSummary, setDisplayMode: updateDisplayMode, toggleDisplayMode }}>
      {children}
    </WorkShortSummaryContext.Provider>
  );
}

export function WorkShortSummaryButton({ className }: WorkShortSummaryButtonProps) {
  const context = useWorkShortSummary();
  const prefersReducedMotion = useReducedMotion();
  const shellControls = useAnimationControls();
  const thumbControls = useAnimationControls();
  const isFirstRender = useRef(true);
  const displayMode = context?.displayMode ?? "full";
  const toggleDisplayMode = context?.toggleDisplayMode ?? (() => undefined);
  const isShortMode = displayMode === "short";
  const options: Array<{ mode: DisplayMode; iconSrc: string }> = [
    { mode: "full", iconSrc: "/media/system/read-full-compact.svg" },
    { mode: "short", iconSrc: "/media/system/read-short-compact.svg" }
  ];
  const ariaLabel = displayMode === "full" ? "Показать короткую версию кейса" : "Показать полный кейс";

  useEffect(() => {
    const targetX = isShortMode ? 44 : 0;

    if (prefersReducedMotion) {
      shellControls.set({ scaleX: 1, scaleY: 1, backgroundColor: SHELL_COLOR });
      thumbControls.set({ x: targetX, scaleX: 1, scaleY: 1 });
      isFirstRender.current = false;
      return;
    }

    if (isFirstRender.current) {
      shellControls.set({ scaleX: 1, scaleY: 1, backgroundColor: SHELL_COLOR });
      thumbControls.set({ x: targetX, scaleX: 1, scaleY: 1 });
      isFirstRender.current = false;
      return;
    }

    void shellControls.start({
      scaleX: [1, 1.04, 0.985, 1.01, 1],
      scaleY: [1, 1.12, 1.03, 1],
      backgroundColor: [SHELL_COLOR, SHELL_FLASH_COLOR, SHELL_COLOR],
      transition: {
        scaleX: {
          duration: 0.4,
          times: [0, 0.24, 0.6, 0.84, 1],
          ease: ["easeOut", "easeInOut", "easeOut", "easeInOut"]
        },
        scaleY: {
          duration: 0.36,
          times: [0, 0.32, 0.72, 1],
          ease: ["easeOut", "easeInOut", "easeOut"]
        },
        backgroundColor: {
          duration: 0.72,
          times: [0, 0.18, 1],
          ease: ["easeOut", "easeOut"]
        }
      }
    });

    void thumbControls.start({
      x: targetX,
      scaleX: [1, 1.45, 0.8, 1.12, 1],
      scaleY: [1, 0.74, 1.12, 0.96, 1],
      transition: {
        x: {
          type: "spring",
          stiffness: 270,
          damping: 11,
          mass: 0.56
        },
        scaleX: {
          duration: 0.56,
          times: [0, 0.18, 0.46, 0.76, 1],
          ease: ["easeOut", "easeInOut", "easeOut", "easeInOut"]
        },
        scaleY: {
          duration: 0.56,
          times: [0, 0.18, 0.46, 0.76, 1],
          ease: ["easeOut", "easeInOut", "easeOut", "easeInOut"]
        }
      }
    });
  }, [isShortMode, prefersReducedMotion, shellControls, thumbControls]);

  if (!context?.shortSummary) {
    return null;
  }

  return (
    <button
      type="button"
      className={[styles.segmentedControl, className].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
      aria-pressed={displayMode === "short"}
      onClick={toggleDisplayMode}
    >
      <motion.span
        className={styles.segmentShell}
        aria-hidden="true"
        initial={false}
        style={{ transformOrigin: isShortMode ? "right center" : "left center" }}
        animate={shellControls}
      />
      <motion.span
        className={styles.segmentThumb}
        aria-hidden="true"
        initial={false}
        style={{ transformOrigin: isShortMode ? "right center" : "left center" }}
        animate={thumbControls}
      />
      {options.map((option) => {
        const isSelected = displayMode === option.mode;

        return (
          <span
            key={option.mode}
            className={[styles.segmentTab, option.mode === "full" ? styles.segmentTabFull : styles.segmentTabShort, isSelected ? styles.segmentTabSelected : ""]
              .filter(Boolean)
              .join(" ")}
            aria-hidden="true"
          >
            <Image className={styles.segmentIcon} src={option.iconSrc} width={20} height={20} alt="" aria-hidden="true" />
          </span>
        );
      })}
    </button>
  );
}

export function WorkShortSummaryContent({ children }: WorkShortSummaryContentProps) {
  const context = useWorkShortSummary();

  if (!context?.shortSummary) {
    return <>{children}</>;
  }

  const { displayMode, hasToggled, shortSummary } = context;

  if (!shortSummary) {
    return <>{children}</>;
  }

  const content =
    displayMode === "full" ? (
      children
    ) : (
      <section className={styles.shortSummary} aria-label="Короткая версия кейса">
        <div className={styles.shortText}>
          {shortSummary.paragraphs.flatMap((paragraph) =>
            getShortSummaryBlocks(paragraph).map((block) => (
              <p key={block} data-page-reveal="">
                {renderLineBreaks(block)}
              </p>
            ))
          )}
        </div>
        {shortSummary.media && shortSummary.media.length > 0 ? (
          <>
            <br />
            <GalleryLightbox items={shortSummary.media} variant="work" />
          </>
        ) : null}
      </section>
    );

  return <div className={styles.contentShell}>{hasToggled ? <PageRevealSequence key={displayMode}>{content}</PageRevealSequence> : content}</div>;
}
