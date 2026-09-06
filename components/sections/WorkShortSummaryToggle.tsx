"use client";

import Image from "next/image";
import {
  animate,
  motion,
  useAnimationControls,
  useMotionValue,
  useReducedMotion,
  useTransform,
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
  shortAfterContent?: ReactNode;
}

interface WorkShortSummaryButtonProps {
  className?: string;
}

type DisplayMode = "full" | "short";
const MOBILE_VIEWPORT_QUERY = "(max-width: 768px)";
const MOBILE_THUMB_GAP_PX = 8;
const MOBILE_THUMB_WIDTH_OFFSET_PX = 12;
const MOBILE_THUMB_NORMAL_HEIGHT_PX = 42;
const MOBILE_DRAG_BUBBLE_SIZE_PX = 120;
const MOBILE_DRAG_ACTIVATION_DELAY_MS = 360;
const MOBILE_POINTER_CANCEL_THRESHOLD_PX = 10;
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
const MOBILE_SHAPE_SETTLE_TRANSITION = {
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1]
} as const;
const MOBILE_THUMB_PRESS_SCALE_X = 0.96;
const MOBILE_THUMB_PRESS_SCALE_Y = 1.06;
const MOBILE_THUMB_SCALE_X_MIN = 0.88;
const MOBILE_THUMB_SCALE_X_MAX = 1;
const MOBILE_THUMB_SCALE_Y_MIN = 1;
const MOBILE_THUMB_SCALE_Y_MAX = 1.06;
const MOBILE_REVEAL_DELAY = 1;
const SHELL_COLOR = "#f5f5f5";
const SHELL_HOVER_COLOR = "#f0f3f6";
const SHELL_FLASH_COLOR = "#ffffff";
const SHELL_HOVER_ENTER_DURATION = 0.12;
const SHELL_HOVER_EXIT_DURATION = 0.32;
const DESKTOP_CONTROL_WIDTH_PX = 84;
const DESKTOP_THUMB_SIZE_PX = 36;
const DESKTOP_THUMB_INSET_PX = 2;

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

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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
  const mobilePressedModeRef = useRef<DisplayMode | null>(null);
  const isMobileDraggingRef = useRef(false);
  const mobilePointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const mobilePointerMovedAwayRef = useRef(false);
  const mobilePointerIdRef = useRef<number | null>(null);
  const mobileLongPressTimerRef = useRef<number | null>(null);
  const displayMode = context?.displayMode ?? "full";
  const displayModeRef = useRef<DisplayMode>(displayMode);
  const hasToggled = context?.hasToggled ?? false;
  const previousDisplayMode = useRef<DisplayMode>(displayMode);
  const isHoveredRef = useRef(false);
  const [isHovered, setIsHovered] = useState(false);
  const [mobileGeometry, setMobileGeometry] = useState({ controlWidth: 0, controlHeight: 44, maxX: 0, thumbWidth: 0 });
  const [isMobileDragging, setIsMobileDragging] = useState(false);
  const [isMobileDragExpanded, setIsMobileDragExpanded] = useState(false);
  const mobileShellControls = useAnimationControls();
  const desktopX = useMotionValue(0);
  const desktopThumbScaleX = useMotionValue(1);
  const desktopThumbScaleY = useMotionValue(1);
  const mobileX = useMotionValue(0);
  const mobileThumbScaleX = useMotionValue(1);
  const mobileThumbScaleY = useMotionValue(1);
  const mobileThumbVisualScaleX = useTransform(mobileThumbScaleX, (latestScaleX) =>
    clampValue(latestScaleX, MOBILE_THUMB_SCALE_X_MIN, MOBILE_THUMB_SCALE_X_MAX)
  );
  const mobileThumbVisualScaleY = useTransform(mobileThumbScaleY, (latestScaleY) =>
    clampValue(latestScaleY, MOBILE_THUMB_SCALE_Y_MIN, MOBILE_THUMB_SCALE_Y_MAX)
  );
  const setDisplayMode = context?.setDisplayMode ?? ((_mode: DisplayMode) => undefined);
  const toggleDisplayMode = context?.toggleDisplayMode ?? (() => undefined);
  const isShortMode = displayMode === "short";
  const options: Array<{ mode: DisplayMode; iconSrc: string; mobileLabel: string }> = [
    { mode: "full", iconSrc: "/media/system/read-full-compact.svg", mobileLabel: "Внимательно" },
    { mode: "short", iconSrc: "/media/system/read-short-compact.svg", mobileLabel: "Быстро" }
  ];
  const ariaLabel = displayMode === "full" ? "Показать короткую версию кейса" : "Показать полный кейс";
  const currentMobileThumbWidth = isMobileDragExpanded ? MOBILE_DRAG_BUBBLE_SIZE_PX : mobileGeometry.thumbWidth;
  const currentMobileThumbHeight = isMobileDragExpanded ? MOBILE_DRAG_BUBBLE_SIZE_PX : MOBILE_THUMB_NORMAL_HEIGHT_PX;
  const desktopMaskClipPath = useTransform([desktopX, desktopThumbScaleX], ([latestX, latestScaleX]) => {
    const x = typeof latestX === "number" ? latestX : 0;
    const scaleX = typeof latestScaleX === "number" ? latestScaleX : 1;
    const scaledThumbWidth = DESKTOP_THUMB_SIZE_PX * scaleX;
    const scaleOffset = (DESKTOP_THUMB_SIZE_PX - scaledThumbWidth) / 2;
    const left = x + DESKTOP_THUMB_INSET_PX + scaleOffset;
    const right = Math.max(DESKTOP_CONTROL_WIDTH_PX - left - scaledThumbWidth, 0);

    return `inset(${DESKTOP_THUMB_INSET_PX}px ${right}px ${DESKTOP_THUMB_INSET_PX}px ${left}px round 12px)`;
  });
  const mobileMaskClipPath = useTransform([mobileX, mobileThumbVisualScaleX], ([latestX, latestScaleX]) => {
    if (mobileGeometry.controlWidth === 0 || mobileGeometry.thumbWidth === 0) {
      return "inset(0 50% 0 0 round 999px)";
    }

    const x = typeof latestX === "number" ? latestX : 0;
    const scaleX = typeof latestScaleX === "number" ? latestScaleX : 1;
    const scaledThumbWidth = currentMobileThumbWidth * scaleX;
    const scaleOffset = (currentMobileThumbWidth - scaledThumbWidth) / 2;
    const left = x + 2 + scaleOffset;
    const right = Math.max(mobileGeometry.controlWidth - left - scaledThumbWidth, 0);
    const verticalInset = (mobileGeometry.controlHeight - currentMobileThumbHeight) / 2;

    return `inset(${verticalInset}px ${right}px ${verticalInset}px ${left}px round 999px)`;
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

      setMobileGeometry({ controlWidth: rect.width, controlHeight: rect.height, maxX, thumbWidth });
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
    const nextGeometry = { controlWidth: rect.width, controlHeight: rect.height, maxX, thumbWidth };

    setMobileGeometry(nextGeometry);
    return nextGeometry;
  }

  function clearMobileLongPressTimer() {
    if (mobileLongPressTimerRef.current !== null) {
      window.clearTimeout(mobileLongPressTimerRef.current);
      mobileLongPressTimerRef.current = null;
    }
  }

  function getMobileTargetX(mode: DisplayMode, width = currentMobileThumbWidth) {
    const geometry = getMobileThumbGeometry();
    const maxX = Math.max(geometry.controlWidth - 4 - width, 0);

    return mode === "short" ? maxX : 0;
  }

  function getMobileModeFromX(x: number, width = currentMobileThumbWidth): DisplayMode {
    return x + 2 + width / 2 > mobileGeometry.controlWidth / 2 ? "short" : "full";
  }

  function getMobileXFromPointer(clientX: number, width = currentMobileThumbWidth) {
    const control = mobileControlRef.current;

    if (!control) {
      return getMobileTargetX(displayMode, width);
    }

    const rect = control.getBoundingClientRect();
    const rawX = clientX - rect.left - 2 - width / 2;
    const maxX = Math.max(rect.width - 4 - width, 0);

    return clampValue(rawX, 0, maxX);
  }

  function resetMobilePointerState() {
    mobilePendingTapMode.current = null;
    mobilePressedModeRef.current = null;
    mobilePointerStartRef.current = null;
    mobilePointerMovedAwayRef.current = false;
    mobilePointerIdRef.current = null;
    clearMobileLongPressTimer();
  }

  function enterMobileDragMode() {
    const pointerStart = mobilePointerStartRef.current;

    if (!pointerStart || mobilePressedModeRef.current !== displayMode || isMobileDraggingRef.current) {
      return;
    }

    clearMobileLongPressTimer();
    isMobileDraggingRef.current = true;
    setIsMobileDragging(true);
    setIsMobileDragExpanded(true);
    mobilePendingTapMode.current = null;
    mobilePointerMovedAwayRef.current = false;
    mobileX.stop();
    settleMobileShape(true);
    void animate(mobileX, getMobileXFromPointer(pointerStart.x, MOBILE_DRAG_BUBBLE_SIZE_PX), MOBILE_SETTLE_SPRING);
  }

  function pressMobileShape({ immediate = false, scaleX = MOBILE_THUMB_PRESS_SCALE_X } = {}) {
    const nextShellShape = {
      scaleX: 0.99,
      scaleY: 1.045
    };

    mobileShellControls.stop();
    mobileThumbScaleX.stop();
    mobileThumbScaleY.stop();

    if (immediate) {
      mobileShellControls.set(nextShellShape);
      mobileThumbScaleX.set(scaleX);
      mobileThumbScaleY.set(MOBILE_THUMB_PRESS_SCALE_Y);
      return;
    }

    void mobileShellControls.start({
      ...nextShellShape,
      transition: MOBILE_PRESS_TRANSITION
    });
    void animate(mobileThumbScaleX, scaleX, MOBILE_PRESS_TRANSITION);
    void animate(mobileThumbScaleY, MOBILE_THUMB_PRESS_SCALE_Y, MOBILE_PRESS_TRANSITION);
  }

  function settleMobileShape(immediate = false) {
    mobileShellControls.stop();
    mobileThumbScaleX.stop();
    mobileThumbScaleY.stop();

    if (immediate) {
      mobileShellControls.set({
        scaleX: 1,
        scaleY: 1
      });
      mobileThumbScaleX.set(1);
      mobileThumbScaleY.set(1);
      return;
    }

    void mobileShellControls.start({
      scaleX: 1,
      scaleY: 1,
      transition: MOBILE_SHAPE_SETTLE_TRANSITION
    });
    void animate(mobileThumbScaleX, 1, MOBILE_SHAPE_SETTLE_TRANSITION);
    void animate(mobileThumbScaleY, 1, MOBILE_SHAPE_SETTLE_TRANSITION);
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
    mobilePressedModeRef.current = mode;
    mobilePendingTapMode.current = mode === displayMode ? null : mode;
    mobilePointerStartRef.current = { x: event.clientX, y: event.clientY };
    mobilePointerMovedAwayRef.current = false;
    mobilePointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    clearMobileLongPressTimer();

    if (mode === displayMode) {
      mobileLongPressTimerRef.current = window.setTimeout(() => {
        enterMobileDragMode();
      }, MOBILE_DRAG_ACTIVATION_DELAY_MS);
    }

    pressMobileShape();
  }

  function handleMobileTabPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const pointerStart = mobilePointerStartRef.current;

    if (!pointerStart || mobilePointerIdRef.current !== event.pointerId) {
      return;
    }

    if (isMobileDraggingRef.current && isMobileDragExpanded) {
      event.preventDefault();
      mobileX.set(getMobileXFromPointer(event.clientX, MOBILE_DRAG_BUBBLE_SIZE_PX));
      return;
    }

    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance < MOBILE_POINTER_CANCEL_THRESHOLD_PX) {
      return;
    }

    clearMobileLongPressTimer();
    mobilePointerMovedAwayRef.current = true;

    if (mobilePressedModeRef.current === displayMode) {
      settleMobileShape();
      return;
    }

    mobilePendingTapMode.current = null;
    animateMobileThumbTo(displayMode);
  }

  function handleMobileTabPointerUp(event: ReactPointerEvent<HTMLButtonElement>, mode: DisplayMode) {
    const pendingTapMode = mobilePendingTapMode.current;
    const wasDragging = isMobileDraggingRef.current;
    const movedAway = mobilePointerMovedAwayRef.current;

    if (mobilePointerIdRef.current === event.pointerId && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    clearMobileLongPressTimer();

    if (wasDragging) {
      const nextMode = getMobileModeFromX(mobileX.get(), MOBILE_DRAG_BUBBLE_SIZE_PX);

      isMobileDraggingRef.current = false;
      setIsMobileDragging(false);
      setIsMobileDragExpanded(false);
      resetMobilePointerState();
      mobileX.stop();
      void animate(mobileX, getMobileTargetX(nextMode, mobileGeometry.thumbWidth), MOBILE_SETTLE_SPRING);
      settleMobileShape();

      if (nextMode !== displayMode) {
        setDisplayMode(nextMode);
      }
      return;
    }

    resetMobilePointerState();

    if (mode === displayMode || movedAway) {
      animateMobileThumbTo(displayMode);
      settleMobileShape();
      return;
    }

    if (pendingTapMode === mode) {
      animateMobileThumbTo(mode);
      setDisplayMode(mode);
      return;
    }

    pressMobileShape({ immediate: true });
    animateMobileThumbTo(mode);
    setDisplayMode(mode);
  }

  function handleMobileTabPointerCancel(event: ReactPointerEvent<HTMLButtonElement>) {
    const wasDragging = isMobileDraggingRef.current;

    if (mobilePointerIdRef.current === event.pointerId && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    isMobileDraggingRef.current = false;
    setIsMobileDragging(false);
    setIsMobileDragExpanded(false);
    resetMobilePointerState();
    if (wasDragging) {
      mobileX.stop();
      void animate(mobileX, getMobileTargetX(displayMode, mobileGeometry.thumbWidth), MOBILE_SETTLE_SPRING);
      settleMobileShape();
      return;
    }

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
        style={{
          x: desktopX,
          scaleX: desktopThumbScaleX,
          scaleY: desktopThumbScaleY,
          transformOrigin: isShortMode ? "right center" : "left center"
        }}
        animate={thumbControls}
      />
      <motion.span className={styles.desktopActiveMask} style={{ clipPath: desktopMaskClipPath }} aria-hidden="true">
        <span className={styles.desktopActiveTrack}>
          {options.map((option) => (
            <span key={option.mode} className={[styles.segmentTab, option.mode === "full" ? styles.segmentTabFull : styles.segmentTabShort].filter(Boolean).join(" ")}>
              <Image className={styles.segmentIcon} src={option.iconSrc} width={20} height={20} alt="" aria-hidden="true" />
            </span>
          ))}
        </span>
      </motion.span>
      {options.map((option) => (
          <span
            key={option.mode}
            className={[styles.segmentTab, option.mode === "full" ? styles.segmentTabFull : styles.segmentTabShort].filter(Boolean).join(" ")}
            aria-hidden="true"
          >
            <Image className={styles.segmentIcon} src={option.iconSrc} width={20} height={20} alt="" aria-hidden="true" />
          </span>
      ))}
    </button>
  );

  const renderFloatingControl = () => (
    <>
      <span className={styles.mobileBottomBlend} aria-hidden="true" />
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
          initial={false}
          animate={{
            width: currentMobileThumbWidth,
            height: currentMobileThumbHeight,
            marginTop: currentMobileThumbHeight / -2
          }}
        transition={{
          width: MOBILE_SHAPE_SETTLE_TRANSITION,
          height: MOBILE_SHAPE_SETTLE_TRANSITION,
          marginTop: MOBILE_SHAPE_SETTLE_TRANSITION
        }}
          style={{ x: mobileX }}
          aria-hidden="true"
        >
          <motion.span className={styles.segmentThumbSurface} style={{ scaleX: mobileThumbVisualScaleX, scaleY: mobileThumbVisualScaleY }} />
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
              onPointerMove={handleMobileTabPointerMove}
              onPointerUp={(event) => handleMobileTabPointerUp(event, option.mode)}
              onPointerCancel={handleMobileTabPointerCancel}
            >
              <Image className={styles.segmentIcon} src={option.iconSrc} width={20} height={20} alt="" aria-hidden="true" />
              <span className={styles.segmentLabel}>{option.mobileLabel}</span>
            </motion.button>
          );
        })}
      </motion.div>
    </>
  );

  return (
    <>
      {isHydrated && isMobileViewport ? null : renderButton()}
      {isHydrated && isMobileViewport ? createPortal(renderFloatingControl(), document.body) : null}
    </>
  );
}

export function WorkShortSummaryContent({ children, shortAfterContent }: WorkShortSummaryContentProps) {
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
        {shortAfterContent}
      </section>
    );

  return <div className={styles.contentShell}>{hasToggled ? <PageRevealSequence key={displayMode}>{content}</PageRevealSequence> : content}</div>;
}
