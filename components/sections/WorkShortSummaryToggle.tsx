"use client";

import Image from "next/image";
import {
  animate,
  motion,
  useAnimationControls,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo
} from "framer-motion";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";
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
const MOBILE_VIEWPORT_QUERY = "(max-width: 768px)";
const MOBILE_THUMB_GAP_PX = 8;
const MOBILE_THUMB_WIDTH_OFFSET_PX = 12;
const MOBILE_SETTLE_SPRING = {
  type: "spring",
  stiffness: 260,
  damping: 24,
  mass: 0.85
} as const;
const MOBILE_PRESS_TRANSITION = {
  duration: 0.12,
  ease: [0.22, 1, 0.36, 1]
} as const;
const MOBILE_REVEAL_DELAY = 1;
const SHELL_COLOR = "#f5f5f5";
const SHELL_HOVER_COLOR = "#f0f3f6";
const SHELL_FLASH_COLOR = "#ffffff";
const SHELL_HOVER_ENTER_DURATION = 0.12;
const SHELL_HOVER_EXIT_DURATION = 0.32;

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

function subscribeToMobileViewport(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia(MOBILE_VIEWPORT_QUERY);
  mediaQuery.addEventListener("change", callback);

  return () => mediaQuery.removeEventListener("change", callback);
}

function getMobileViewportSnapshot() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_VIEWPORT_QUERY).matches;
}

function getServerMobileViewportSnapshot() {
  return false;
}

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

    if (window.matchMedia(MOBILE_VIEWPORT_QUERY).matches) {
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
  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
  const isMobileViewport = useSyncExternalStore(subscribeToMobileViewport, getMobileViewportSnapshot, getServerMobileViewportSnapshot);
  const prefersReducedMotion = useReducedMotion();
  const shellControls = useAnimationControls();
  const thumbControls = useAnimationControls();
  const isFirstRender = useRef(true);
  const isShellAnimating = useRef(false);
  const mobileControlRef = useRef<HTMLDivElement | null>(null);
  const mobilePendingTapMode = useRef<DisplayMode | null>(null);
  const isMobileDraggingRef = useRef(false);
  const suppressMobileTapUntil = useRef(0);
  const displayMode = context?.displayMode ?? "full";
  const displayModeRef = useRef<DisplayMode>(displayMode);
  const hasToggled = context?.hasToggled ?? false;
  const previousDisplayMode = useRef<DisplayMode>(displayMode);
  const isHoveredRef = useRef(false);
  const [isHovered, setIsHovered] = useState(false);
  const [mobileGeometry, setMobileGeometry] = useState({ controlWidth: 0, maxX: 0, thumbWidth: 0 });
  const [isMobileDragging, setIsMobileDragging] = useState(false);
  const mobileDragControls = useDragControls();
  const mobileShellControls = useAnimationControls();
  const mobileThumbFeedbackControls = useAnimationControls();
  const mobileX = useMotionValue(0);
  const setDisplayMode = context?.setDisplayMode ?? ((_mode: DisplayMode) => undefined);
  const toggleDisplayMode = context?.toggleDisplayMode ?? (() => undefined);
  const isShortMode = displayMode === "short";
  const options: Array<{ mode: DisplayMode; iconSrc: string; mobileLabel: string }> = [
    { mode: "full", iconSrc: "/media/system/read-full-compact.svg", mobileLabel: "Внимательно" },
    { mode: "short", iconSrc: "/media/system/read-short-compact.svg", mobileLabel: "Быстро" }
  ];
  const ariaLabel = displayMode === "full" ? "Показать короткую версию кейса" : "Показать полный кейс";
  const mobileMaskClipPath = useTransform(mobileX, (latestX) => {
    if (mobileGeometry.controlWidth === 0 || mobileGeometry.thumbWidth === 0) {
      return "inset(0 50% 0 0 round 12px)";
    }

    const left = latestX + 2;
    const right = Math.max(mobileGeometry.controlWidth - left - mobileGeometry.thumbWidth, 0);

    return `inset(0px ${right}px 0px ${left}px round 12px)`;
  });
  const mobileControlStyle = {
    WebkitBackdropFilter: "blur(4px) saturate(180%)",
    backdropFilter: "blur(4px) saturate(180%)"
  } as CSSProperties;

  useEffect(() => {
    isHoveredRef.current = isHovered;
  }, [isHovered]);

  useEffect(() => {
    displayModeRef.current = displayMode;
  }, [displayMode]);

  useEffect(() => {
    if (!isHydrated || !isMobileViewport) {
      return undefined;
    }

    function syncMobileGeometry() {
      const control = mobileControlRef.current;

      if (!control) {
        return;
      }

      const rect = control.getBoundingClientRect();
      const thumbWidth = (rect.width - MOBILE_THUMB_WIDTH_OFFSET_PX) / 2;
      const maxX = thumbWidth + MOBILE_THUMB_GAP_PX;

      setMobileGeometry({ controlWidth: rect.width, maxX, thumbWidth });
      mobileX.set(displayModeRef.current === "short" ? maxX : 0);
    }

    syncMobileGeometry();
    window.addEventListener("resize", syncMobileGeometry);

    return () => {
      window.removeEventListener("resize", syncMobileGeometry);
    };
  }, [isHydrated, isMobileViewport, mobileX]);

  useEffect(() => {
    if (!isHydrated || !isMobileViewport || isMobileDraggingRef.current) {
      return;
    }

    animateMobileThumbTo(displayMode);
  }, [displayMode, isHydrated, isMobileViewport]);

  useEffect(() => {
    const targetX = isShortMode ? 44 : 0;
    const targetShellColor = isHoveredRef.current ? SHELL_HOVER_COLOR : SHELL_COLOR;
    const modeChanged = previousDisplayMode.current !== displayMode;
    previousDisplayMode.current = displayMode;

    if (prefersReducedMotion) {
      shellControls.set({ scaleX: 1, scaleY: 1, backgroundColor: targetShellColor });
      thumbControls.set({ x: targetX, scaleX: 1, scaleY: 1 });
      isFirstRender.current = false;
      return;
    }

    if (isFirstRender.current) {
      shellControls.set({ scaleX: 1, scaleY: 1, backgroundColor: targetShellColor });
      thumbControls.set({ x: targetX, scaleX: 1, scaleY: 1 });
      isFirstRender.current = false;
      return;
    }

    if (!modeChanged) {
      return;
    }

    isShellAnimating.current = true;

    void (async () => {
      await Promise.all([
        shellControls.start({
          scaleX: [1, 1.04, 0.985, 1.01, 1],
          scaleY: [1, 1.12, 1.03, 1],
          backgroundColor: [SHELL_COLOR, SHELL_FLASH_COLOR, targetShellColor],
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
        }),
        thumbControls.start({
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
        })
      ]);

      isShellAnimating.current = false;

      void shellControls.start({
        backgroundColor: isHoveredRef.current ? SHELL_HOVER_COLOR : SHELL_COLOR,
        transition: {
          duration: isHoveredRef.current ? SHELL_HOVER_ENTER_DURATION : SHELL_HOVER_EXIT_DURATION,
          ease: "easeInOut"
        }
      });
    })();
  }, [displayMode, isShortMode, prefersReducedMotion, shellControls, thumbControls]);

  useEffect(() => {
    if (isFirstRender.current || isShellAnimating.current) {
      return;
    }

    const targetShellColor = isHovered ? SHELL_HOVER_COLOR : SHELL_COLOR;

    if (prefersReducedMotion) {
      shellControls.set({ backgroundColor: targetShellColor });
      return;
    }

    void shellControls.start({
      backgroundColor: targetShellColor,
      transition: {
        duration: isHovered ? SHELL_HOVER_ENTER_DURATION : SHELL_HOVER_EXIT_DURATION,
        ease: "easeInOut"
      }
    });
  }, [isHovered, prefersReducedMotion, shellControls]);

  if (!context?.shortSummary) {
    return null;
  }

  function getMobileThumbGeometry() {
    const control = mobileControlRef.current;

    if (!control) {
      return mobileGeometry;
    }

    const rect = control.getBoundingClientRect();
    const thumbWidth = (rect.width - MOBILE_THUMB_WIDTH_OFFSET_PX) / 2;
    const maxX = thumbWidth + MOBILE_THUMB_GAP_PX;
    const nextGeometry = { controlWidth: rect.width, maxX, thumbWidth };

    setMobileGeometry(nextGeometry);
    return nextGeometry;
  }

  function getMobileTargetX(mode: DisplayMode) {
    const geometry = getMobileThumbGeometry();
    return mode === "short" ? geometry.maxX : 0;
  }

  function pressMobileShape({ immediate = false } = {}) {
    const nextShellShape = {
      scaleX: 0.982,
      scaleY: 1.09
    };
    const nextThumbShape = {
      scaleX: 0.9,
      scaleY: 1.14
    };

    mobileShellControls.stop();
    mobileThumbFeedbackControls.stop();

    if (immediate) {
      mobileShellControls.set(nextShellShape);
      mobileThumbFeedbackControls.set(nextThumbShape);
      return;
    }

    void mobileShellControls.start({
      ...nextShellShape,
      transition: MOBILE_PRESS_TRANSITION
    });
    void mobileThumbFeedbackControls.start({
      ...nextThumbShape,
      transition: MOBILE_PRESS_TRANSITION
    });
  }

  function settleMobileShape() {
    mobileShellControls.stop();
    mobileThumbFeedbackControls.stop();

    void mobileShellControls.start({
      scaleX: 1,
      scaleY: 1,
      transition: MOBILE_SETTLE_SPRING
    });
    void mobileThumbFeedbackControls.start({
      scaleX: 1,
      scaleY: 1,
      transition: MOBILE_SETTLE_SPRING
    });
  }

  function animateMobileThumbTo(mode: DisplayMode, settleShape = true) {
    mobileX.stop();
    void animate(mobileX, getMobileTargetX(mode), MOBILE_SETTLE_SPRING);

    if (settleShape) {
      settleMobileShape();
    }
  }

  function handleMobileTabPointerDown(event: ReactPointerEvent<HTMLButtonElement>, mode: DisplayMode) {
    getMobileThumbGeometry();

    if (mode === displayMode) {
      mobilePendingTapMode.current = null;
      pressMobileShape();
      mobileDragControls.start(event);
      return;
    }

    mobilePendingTapMode.current = mode;
    pressMobileShape({ immediate: true });
    animateMobileThumbTo(mode);
    setDisplayMode(mode);
  }

  function handleMobileDragStart() {
    isMobileDraggingRef.current = true;
    setIsMobileDragging(true);
    pressMobileShape();
  }

  function handleMobileDragEnd(_event: MouseEvent | TouchEvent | globalThis.PointerEvent, info: PanInfo) {
    isMobileDraggingRef.current = false;
    setIsMobileDragging(false);
    mobilePendingTapMode.current = null;
    suppressMobileTapUntil.current = performance.now() + 160;

    const geometry = getMobileThumbGeometry();
    const projectedX = mobileX.get() + info.velocity.x * 0.08;
    const nextMode: DisplayMode = projectedX > geometry.maxX / 2 ? "short" : "full";

    animateMobileThumbTo(nextMode);
    if (nextMode !== displayMode) {
      setDisplayMode(nextMode);
    }
  }

  function handleMobileTabPointerUp(mode: DisplayMode) {
    const pendingTapMode = mobilePendingTapMode.current;
    mobilePendingTapMode.current = null;

    if (isMobileDraggingRef.current || performance.now() < suppressMobileTapUntil.current) {
      return;
    }

    if (mode === displayMode) {
      settleMobileShape();
      return;
    }

    if (pendingTapMode === mode) {
      return;
    }

    pressMobileShape({ immediate: true });
    animateMobileThumbTo(mode);
    setDisplayMode(mode);
  }

  function handleMobileTabPointerCancel() {
    if (mobilePendingTapMode.current === null) {
      return;
    }

    mobilePendingTapMode.current = null;
    animateMobileThumbTo(displayMode);
  }

  const renderButton = () => (
    <button
      type="button"
      className={[styles.segmentedControl, className].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
      aria-pressed={displayMode === "short"}
      onClick={toggleDisplayMode}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") {
          setIsHovered(true);
        }
      }}
      onPointerLeave={() => setIsHovered(false)}
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

  const renderFloatingControl = () => (
    <motion.div
      ref={mobileControlRef}
      className={styles.floatingControl}
      data-display-mode={displayMode}
      data-has-toggled={hasToggled}
      data-is-dragging={isMobileDragging}
      role="group"
      aria-label={ariaLabel}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        opacity: { duration: 0.18, ease: "easeOut", delay: MOBILE_REVEAL_DELAY },
        y: { type: "spring", stiffness: 360, damping: 28, mass: 0.7, delay: MOBILE_REVEAL_DELAY },
        scale: { type: "spring", stiffness: 360, damping: 28, mass: 0.7, delay: MOBILE_REVEAL_DELAY }
      }}
    >
      <motion.span className={styles.mobileShellBackdrop} style={mobileControlStyle} animate={mobileShellControls} aria-hidden="true" />
      <motion.span
        className={styles.segmentThumb}
        drag="x"
        dragControls={mobileDragControls}
        dragConstraints={{ left: 0, right: mobileGeometry.maxX }}
        dragElastic={0.04}
        dragListener={false}
        dragMomentum={false}
        style={{ x: mobileX }}
        onDragStart={handleMobileDragStart}
        onDragEnd={handleMobileDragEnd}
        aria-hidden="true"
      >
        <motion.span className={styles.segmentThumbSurface} animate={mobileThumbFeedbackControls} />
      </motion.span>
      <motion.span className={styles.mobileActiveMask} style={{ clipPath: mobileMaskClipPath }} aria-hidden="true">
        <span className={styles.mobileActiveTrack}>
          {options.map((option) => (
            <span
              key={option.mode}
              className={[styles.segmentTab, option.mode === "full" ? styles.segmentTabFull : styles.segmentTabShort].filter(Boolean).join(" ")}
            >
              <Image className={styles.segmentIcon} src={option.iconSrc} width={20} height={20} alt="" aria-hidden="true" />
              <span className={styles.segmentLabel}>{option.mobileLabel}</span>
            </span>
          ))}
        </span>
      </motion.span>
      {options.map((option) => {
        const isSelected = displayMode === option.mode;

        return (
          <motion.button
            key={option.mode}
            type="button"
            className={[styles.segmentTab, option.mode === "full" ? styles.segmentTabFull : styles.segmentTabShort, isSelected ? styles.segmentTabSelected : ""]
              .filter(Boolean)
              .join(" ")}
            aria-pressed={isSelected}
            onPointerDown={(event) => handleMobileTabPointerDown(event, option.mode)}
            onPointerUp={() => handleMobileTabPointerUp(option.mode)}
            onPointerCancel={handleMobileTabPointerCancel}
          >
            <Image className={styles.segmentIcon} src={option.iconSrc} width={20} height={20} alt="" aria-hidden="true" />
            <span className={styles.segmentLabel}>{option.mobileLabel}</span>
          </motion.button>
        );
      })}
    </motion.div>
  );

  return (
    <>
      {isHydrated && isMobileViewport ? null : renderButton()}
      {isHydrated && isMobileViewport ? createPortal(renderFloatingControl(), document.body) : null}
    </>
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
