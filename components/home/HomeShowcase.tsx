"use client";

import Link from "next/link";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { createPortal } from "react-dom";
import { PageRevealSequence } from "@/components/motion/PageRevealSequence";
import { MediaPlaceholderView } from "@/components/media/MediaPlaceholder";
import { getCaseSlugFromHref, getCurrentPath, trackMetricaGoal } from "@/lib/analytics/yandex-metrica";
import { type HomeShowcaseSection, type HomeWorkEntry } from "@/lib/content/types";
import shellStyles from "@/components/shell/site-shell.module.css";
import styles from "@/components/home/home-showcase.module.css";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface SectionEntry {
  entry: HomeWorkEntry;
  index: number;
}

interface IndexedHomeSection {
  title?: string;
  items: SectionEntry[];
}

const PREVIEW_OFFSET_FALLBACK = 60;
const ACTIVE_TEXT_SHIFT_SCALE = 0.18;
const ITEM_HOVER_ZONE_PAD_X = 18;
const HOME_SCROLL_HAPTIC_QUERY = "(hover: none) and (pointer: coarse)";
const HOME_SCROLL_HAPTIC_REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const HOME_SCROLL_HAPTIC_DURATION_MS = 6;
const HOME_SCROLL_HAPTIC_MIN_INTERVAL_MS = 100;
const VIEWPORT_CENTER_RATIO = 0.5;

type VibratingNavigator = Navigator & {
  vibrate?: (pattern: number | number[]) => boolean;
};

function getExternalLinkProps(href: string) {
  return /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i.test(href) ? { target: "_blank", rel: "noopener noreferrer" } : {};
}

function getRootCssNumberVar(name: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
}

function getSoftShift(value: number, power: number) {
  const normalized = Math.max(-1, Math.min(1, value));
  return Math.sign(normalized) * (1 - (1 - Math.abs(normalized)) ** (1 / Math.max(1, power)));
}

function getNavigatorVibrate() {
  if (typeof navigator === "undefined") return null;
  const vibrate = (navigator as VibratingNavigator).vibrate;
  return typeof vibrate === "function" ? vibrate.bind(navigator) : null;
}

interface HomeShowcaseProps {
  title: string;
  subtitle?: string;
  sections: HomeShowcaseSection[];
}

export function HomeShowcase({ title, subtitle, sections }: HomeShowcaseProps) {
  const [canHover, setCanHover] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewLeft, setPreviewLeft] = useState<number | null>(null);
  const [highlightRect, setHighlightRect] = useState<Rect | null>(null);

  const listWrapRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTrackedPreviewOpen = useRef(false);
  const scrollHapticFrameRef = useRef<number | null>(null);
  const scrollHapticLastIndexRef = useRef<number | null>(null);
  const scrollHapticLastTimeRef = useRef(0);
  const hasTouchScrollIntentRef = useRef(false);

  const shiftXRaw = useMotionValue(0);
  const shiftYRaw = useMotionValue(0);
  const tiltXRaw = useMotionValue(0);
  const tiltYRaw = useMotionValue(0);
  const originXRaw = useMotionValue(50);
  const originYRaw = useMotionValue(50);

  const shiftX = useSpring(shiftXRaw, { stiffness: 420, damping: 34, mass: 0.6 });
  const shiftY = useSpring(shiftYRaw, { stiffness: 420, damping: 34, mass: 0.6 });
  const tiltX = useSpring(tiltXRaw, { stiffness: 360, damping: 30, mass: 0.65 });
  const tiltY = useSpring(tiltYRaw, { stiffness: 360, damping: 30, mass: 0.65 });
  const originX = useSpring(originXRaw, { stiffness: 460, damping: 42, mass: 0.74 });
  const originY = useSpring(originYRaw, { stiffness: 460, damping: 42, mass: 0.74 });

  const highlightTransformOrigin = useMotionTemplate`${originX}% ${originY}%`;
  const listShiftXVar = useMotionTemplate`${shiftX}px`;
  const listShiftYVar = useMotionTemplate`${shiftY}px`;
  const highlightYVar = useMotionTemplate`${originY}%`;

  const indexedSections = useMemo<IndexedHomeSection[]>(() => {
    let currentIndex = 0;

    return sections
      .map((section) => ({
        title: section.title,
        items: section.items.map((entry) => ({
          entry,
          index: currentIndex++
        }))
      }))
      .filter((section) => section.items.length > 0);
  }, [sections]);

  const displayEntries = useMemo(
    () => indexedSections.flatMap((section) => section.items.map((item) => item.entry)),
    [indexedSections]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(any-hover: hover)");
    const update = () => setCanHover(media.matches);

    update();
    media.addEventListener("change", update);

    return () => {
      media.removeEventListener("change", update);
    };
  }, []);

  const syncHighlight = useCallback((index: number) => {
    const container = listWrapRef.current;
    const item = itemRefs.current[index];
    if (!container || !item) return;

    const c = container.getBoundingClientRect();
    const r = item.getBoundingClientRect();

    setHighlightRect({
      top: r.top - c.top,
      left: r.left - c.left,
      width: r.width,
      height: r.height
    });
  }, []);

  const syncPreviewPosition = useCallback(() => {
    const list = listWrapRef.current;
    if (!list) return;
    const rect = list.getBoundingClientRect();
    const offset = getRootCssNumberVar("--layout-preview-offset-x", PREVIEW_OFFSET_FALLBACK);
    setPreviewLeft(rect.right + offset);
  }, []);

  const getViewportCenterItemIndex = useCallback(() => {
    if (typeof window === "undefined") return null;

    const centerY = window.innerHeight * VIEWPORT_CENTER_RATIO;
    let nearestIndex: number | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < itemRefs.current.length; index += 1) {
      const item = itemRefs.current[index];
      if (!item) continue;

      const rect = item.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        continue;
      }

      const itemCenterY = rect.top + rect.height / 2;
      const distance = Math.abs(centerY - itemCenterY);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }

    return nearestIndex;
  }, []);

  useEffect(() => {
    if (activeIndex === null) return;

    const onResize = () => syncHighlight(activeIndex);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);

    onResize();

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [activeIndex, syncHighlight]);

  useEffect(() => {
    if (!canHover) return;

    const onLayoutChange = () => syncPreviewPosition();
    onLayoutChange();

    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("scroll", onLayoutChange, true);

    return () => {
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("scroll", onLayoutChange, true);
    };
  }, [canHover, syncPreviewPosition]);

  useEffect(() => {
    if (typeof window === "undefined" || displayEntries.length === 0) return;

    const vibrate = getNavigatorVibrate();
    if (!vibrate) return;

    const mobileQuery = window.matchMedia(HOME_SCROLL_HAPTIC_QUERY);
    const reducedMotionQuery = window.matchMedia(HOME_SCROLL_HAPTIC_REDUCED_MOTION_QUERY);

    const isEnabled = () => mobileQuery.matches && !reducedMotionQuery.matches;
    const resetScrollHaptics = () => {
      scrollHapticLastIndexRef.current = null;
      hasTouchScrollIntentRef.current = false;
    };

    const triggerScrollHaptic = () => {
      if (!isEnabled() || !hasTouchScrollIntentRef.current) return;

      const nextIndex = getViewportCenterItemIndex();
      if (nextIndex === null) return;

      if (scrollHapticLastIndexRef.current === null) {
        scrollHapticLastIndexRef.current = nextIndex;
        return;
      }

      if (scrollHapticLastIndexRef.current === nextIndex) return;
      scrollHapticLastIndexRef.current = nextIndex;

      const now = performance.now();
      if (now - scrollHapticLastTimeRef.current < HOME_SCROLL_HAPTIC_MIN_INTERVAL_MS) return;

      scrollHapticLastTimeRef.current = now;
      vibrate(HOME_SCROLL_HAPTIC_DURATION_MS);
    };

    const scheduleScrollHaptic = () => {
      if (scrollHapticFrameRef.current !== null) return;

      scrollHapticFrameRef.current = window.requestAnimationFrame(() => {
        scrollHapticFrameRef.current = null;
        triggerScrollHaptic();
      });
    };

    const markTouchScrollIntent = () => {
      hasTouchScrollIntentRef.current = true;
      scrollHapticLastIndexRef.current = getViewportCenterItemIndex();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        resetScrollHaptics();
      }
    };

    window.addEventListener("touchstart", markTouchScrollIntent, { passive: true });
    window.addEventListener("touchmove", scheduleScrollHaptic, { passive: true });
    window.addEventListener("scroll", scheduleScrollHaptic, { passive: true });
    window.addEventListener("resize", resetScrollHaptics);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    mobileQuery.addEventListener("change", resetScrollHaptics);
    reducedMotionQuery.addEventListener("change", resetScrollHaptics);

    return () => {
      if (scrollHapticFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollHapticFrameRef.current);
        scrollHapticFrameRef.current = null;
      }

      window.removeEventListener("touchstart", markTouchScrollIntent);
      window.removeEventListener("touchmove", scheduleScrollHaptic);
      window.removeEventListener("scroll", scheduleScrollHaptic);
      window.removeEventListener("resize", resetScrollHaptics);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      mobileQuery.removeEventListener("change", resetScrollHaptics);
      reducedMotionQuery.removeEventListener("change", resetScrollHaptics);
    };
  }, [displayEntries.length, getViewportCenterItemIndex]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    },
    []
  );

  const previewMedia = useMemo(() => {
    if (previewIndex === null) return null;
    const entry = displayEntries[previewIndex];

    if (!entry) {
      return null;
    }

    return {
      kind: entry.preview.kind,
      src: entry.preview.src,
      aspectRatio: entry.preview.src ? entry.preview.aspectRatio : "2 / 1",
      placeholderToken: entry.preview.placeholderToken,
      intrinsicWidth: entry.preview.intrinsicWidth,
      intrinsicHeight: entry.preview.intrinsicHeight,
      srcSet: entry.preview.srcSet,
      fullSrc: entry.preview.fullSrc,
      fullIntrinsicWidth: entry.preview.fullIntrinsicWidth,
      fullIntrinsicHeight: entry.preview.fullIntrinsicHeight,
      videoSources: entry.preview.videoSources,
      fullVideoSources: entry.preview.fullVideoSources
    } as const;
  }, [previewIndex, displayEntries]);

  const portalTarget = typeof document === "undefined" ? null : document.body;

  const cancelCloseIndex = useCallback(() => {
    if (!closeTimerRef.current) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const isCursorInsideItemHoverZone = useCallback(
    (index: number, clientX: number, clientY: number) => {
      const item = itemRefs.current[index];
      if (!item) return false;

      const rect = item.getBoundingClientRect();
      return (
        clientX >= rect.left - ITEM_HOVER_ZONE_PAD_X &&
        clientX <= rect.right + ITEM_HOVER_ZONE_PAD_X &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
    },
    []
  );

  const findHoveredItemIndex = useCallback(
    (clientX: number, clientY: number) => {
      for (let index = 0; index < itemRefs.current.length; index += 1) {
        if (isCursorInsideItemHoverZone(index, clientX, clientY)) {
          return index;
        }
      }
      return null;
    },
    [isCursorInsideItemHoverZone]
  );

  function openIndex(index: number) {
    cancelCloseIndex();

    const nextEntry = displayEntries[index];
    if (nextEntry) {
      if (!hasTrackedPreviewOpen.current) {
        hasTrackedPreviewOpen.current = true;
        trackMetricaGoal("home_preview_open", {
          case_slug: getCaseSlugFromHref(nextEntry.href),
          case_title: nextEntry.label,
          page_path: getCurrentPath()
        });
      } else if (activeIndex !== null && activeIndex !== index) {
        const previousEntry = displayEntries[activeIndex];
        trackMetricaGoal("home_preview_change", {
          case_slug: getCaseSlugFromHref(nextEntry.href),
          previous_case_slug: previousEntry ? getCaseSlugFromHref(previousEntry.href) : null,
          case_title: nextEntry.label,
          page_path: getCurrentPath()
        });
      }
    }

    setActiveIndex(index);
    setPreviewIndex(index);
    syncHighlight(index);
    syncPreviewPosition();
  }

  function closeIndex() {
    if (activeIndex === null && previewIndex === null) return;
    if (closeTimerRef.current) return;
    closeTimerRef.current = setTimeout(() => {
      setActiveIndex(null);
      setPreviewIndex(null);
      closeTimerRef.current = null;
    }, 380);
  }

  function onMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!canHover) return;

    const wrap = listWrapRef.current;
    if (!wrap) return;

    const hoveredIndex = findHoveredItemIndex(event.clientX, event.clientY);
    if (hoveredIndex === null) {
      closeIndex();
      return;
    }

    cancelCloseIndex();
    if (hoveredIndex !== activeIndex) {
      openIndex(hoveredIndex);
    }

    const bounds = wrap.getBoundingClientRect();

    let nx = 0;
    let ny = 0;

    if (highlightRect) {
      const cardX = bounds.left + highlightRect.left;
      const cardY = bounds.top + highlightRect.top;
      const tx = Math.max(1, highlightRect.width);
      const ty = Math.max(1, highlightRect.height);

      nx = (event.clientX - (cardX + tx / 2)) / (tx / 2);
      ny = (event.clientY - (cardY + ty / 2)) / (ty / 2);

      const ox = Math.max(0, Math.min(1, (event.clientX - cardX) / tx));
      const oy = Math.max(0, Math.min(1, (event.clientY - cardY) / ty));
      originXRaw.set(30 + 40 * ox);
      originYRaw.set(30 + 40 * oy);
    } else {
      originXRaw.set(50);
      originYRaw.set(50);
    }

    nx = Math.max(-1, Math.min(1, nx));
    ny = Math.max(-1, Math.min(1, ny));

    tiltXRaw.set(-ny * 1.25);
    tiltYRaw.set(nx * 0.85);
    shiftXRaw.set(12 * getSoftShift(nx, 2));
    shiftYRaw.set(8 * getSoftShift(ny, 2));
  }

  return (
    <div className={styles.root}>
      <div className={styles.leftColumn}>
        <div className={styles.heroStack}>
          <PageRevealSequence className={styles.revealStack}>
            <header className={[shellStyles.headerBlock, shellStyles.compensated].join(" ")}>
              <h1 className={shellStyles.title} data-page-reveal="">
                {title}
              </h1>
              {subtitle ? (
                <p
                  className={[shellStyles.subtitle, shellStyles.subtitleStrong, shellStyles.subtitleWorkMeta].join(" ")}
                  data-page-reveal=""
                >
                  {subtitle}
                </p>
              ) : null}
            </header>

            <motion.div
              className={styles.listWrap}
              ref={listWrapRef}
              onMouseMove={onMouseMove}
              style={
                {
                  ["--item-shift-x" as string]: listShiftXVar,
                  ["--item-shift-y" as string]: listShiftYVar,
                  ["--item-shift-scale" as string]: ACTIVE_TEXT_SHIFT_SCALE
                } as unknown as CSSProperties
              }
              onMouseLeave={() => {
                tiltXRaw.set(0);
                tiltYRaw.set(0);
                shiftXRaw.set(0);
                shiftYRaw.set(0);
                originXRaw.set(50);
                originYRaw.set(50);
                closeIndex();
              }}
            >
              <AnimatePresence>
                {highlightRect && activeIndex !== null && (
                  <motion.div
                    className={styles.glass}
                    initial={{
                      opacity: 0,
                      scale: 0.1,
                      top: highlightRect.top,
                      left: highlightRect.left,
                      width: highlightRect.width,
                      height: highlightRect.height
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      top: highlightRect.top,
                      left: highlightRect.left,
                      width: highlightRect.width,
                      height: highlightRect.height
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      top: { type: "spring", duration: 0.6, bounce: 0.15 },
                      left: { type: "spring", duration: 0.6, bounce: 0.15 },
                      width: { type: "spring", duration: 0.6, bounce: 0 },
                      height: { type: "spring", duration: 0.6, bounce: 0 },
                      opacity: { duration: 0.28 }
                    }}
                    style={{
                      transformOrigin: highlightTransformOrigin,
                      rotateX: tiltX,
                      rotateY: tiltY,
                      x: shiftX,
                      y: shiftY
                    }}
                  >
                    <span
                      className={styles.glassHighlight}
                      style={{ ["--lgy" as string]: highlightYVar } as unknown as CSSProperties}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={styles.list}>
                {indexedSections.map((section, sectionIndex) => (
                  <section
                    key={`${section.title ?? "untitled"}-${sectionIndex}`}
                    className={styles.section}
                    aria-label={section.title}
                  >
                    {section.title ? (
                      <h2 className={styles.sectionTitle} data-page-reveal="">
                        {section.title}
                      </h2>
                    ) : null}
                    <div className={styles.sectionList}>
                      {section.items.map(({ entry, index }) => (
                        <span key={entry.href} data-page-reveal="">
                          <Link
                            href={entry.href}
                            {...getExternalLinkProps(entry.href)}
                            ref={(node) => {
                              itemRefs.current[index] = node;
                            }}
                            className={[
                              styles.item,
                              activeIndex === index ? styles.itemActive : ""
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onMouseEnter={() => openIndex(index)}
                            onFocus={() => openIndex(index)}
                            onBlur={closeIndex}
                            onClick={() => {
                              trackMetricaGoal("click_case_card", {
                                case_slug: getCaseSlugFromHref(entry.href),
                                case_title: entry.label,
                                section_title: section.title,
                                page_path: getCurrentPath()
                              });
                            }}
                          >
                            <span className={styles.itemContent}>
                              <span className={styles.itemLabel}>{entry.label}</span>
                              <span className={styles.itemMeta}>
                                <span>{entry.subtitle}</span>
                              </span>
                            </span>
                          </Link>
                        </span>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </motion.div>
          </PageRevealSequence>
        </div>
      </div>

      {portalTarget &&
        createPortal(
          <AnimatePresence>
            {canHover && activeIndex !== null && previewMedia?.src && previewLeft !== null && (
              <motion.aside
                className={styles.previewPane}
                style={{ left: `${previewLeft}px` }}
                aria-label="Content area"
                initial={{ opacity: 0, filter: "blur(10px)" }}
                animate={{ opacity: 1, filter: "blur(0)" }}
                exit={{ opacity: 0, filter: "blur(10px)" }}
                transition={{ type: "spring", duration: 0.6, bounce: 0 }}
              >
                <div className={styles.contentArea}>
                  <div className={styles.previewStage}>
                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={previewIndex ?? -1}
                        className={styles.previewMediaFrame}
                        initial={{ opacity: 0, filter: "blur(10px)", scale: 0.97 }}
                        animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                        exit={{ opacity: 0, filter: "blur(10px)", scale: 0.97 }}
                        transition={{ type: "spring", duration: 0.6, bounce: 0 }}
                      >
                        <MediaPlaceholderView
                          media={previewMedia}
                          variant="homePreview"
                          className={styles.previewCard}
                          frame="square"
                          fit="contain"
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>,
          portalTarget
        )}
    </div>
  );
}
