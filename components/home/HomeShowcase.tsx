"use client";

import Link from "next/link";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { createPortal } from "react-dom";
import { itemRevealVariants, pageRevealVariants } from "@/components/motion/MotionPage";
import { MediaPlaceholderView } from "@/components/media/MediaPlaceholder";
import { type HomeWorkEntry, type SiteHeaderContent } from "@/lib/content/types";
import styles from "@/components/home/home-showcase.module.css";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PREVIEW_OFFSET_FALLBACK = 60;
const ACTIVE_TEXT_SHIFT_SCALE = 0.18;
const TEXT_ENTER_EASE_IN_MS = 170;

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

interface HomeShowcaseProps {
  entries: HomeWorkEntry[];
  header: SiteHeaderContent;
}

export function HomeShowcase({ entries, header }: HomeShowcaseProps) {
  const [canHover, setCanHover] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [enteringIndex, setEnteringIndex] = useState<number | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewLeft, setPreviewLeft] = useState<number | null>(null);
  const [highlightRect, setHighlightRect] = useState<Rect | null>(null);

  const listWrapRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterTextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
      if (enterTextTimerRef.current) {
        clearTimeout(enterTextTimerRef.current);
      }
    },
    []
  );

  const previewMedia = useMemo(() => {
    if (previewIndex === null) return null;
    const entry = entries[previewIndex];

    return {
      kind: entry.preview.kind,
      src: entry.preview.src,
      aspectRatio: entry.preview.src ? entry.preview.aspectRatio : "2 / 1",
      placeholderToken: entry.preview.placeholderToken
    } as const;
  }, [previewIndex, entries]);

  const portalTarget = typeof document === "undefined" ? null : document.body;

  function openIndex(index: number) {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (activeIndex !== index) {
      setEnteringIndex(index);
      if (enterTextTimerRef.current) {
        clearTimeout(enterTextTimerRef.current);
      }
      enterTextTimerRef.current = setTimeout(() => {
        setEnteringIndex((current) => (current === index ? null : current));
      }, TEXT_ENTER_EASE_IN_MS);
    }

    setActiveIndex(index);
    setPreviewIndex(index);
    syncHighlight(index);
    syncPreviewPosition();
  }

  function closeIndex() {
    closeTimerRef.current = setTimeout(() => {
      setActiveIndex(null);
      setEnteringIndex(null);
      setPreviewIndex(null);
    }, 380);
  }

  function onMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!canHover) return;

    const wrap = listWrapRef.current;
    if (!wrap) return;

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
    <motion.div className={styles.root} initial="initial" animate="visible" variants={pageRevealVariants}>
      <motion.div className={styles.intro} variants={itemRevealVariants}>
        <h1 className={styles.name}>{header.identity.name}</h1>
        <p className={styles.role}>{header.identity.role}</p>
      </motion.div>

      <motion.nav className={styles.metaNav} variants={itemRevealVariants} aria-label="Meta navigation">
        {header.metaNav.map((item) => (
          <Link key={item.href} className={styles.metaLink} href={item.href}>
            {item.label}
          </Link>
        ))}
      </motion.nav>

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
        variants={itemRevealVariants}
      >
        <AnimatePresence>
          {highlightRect && activeIndex !== null && (
            <motion.div
              className={styles.glass}
              initial={{
                opacity: 0,
                // filter: "blur(10px)",
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
          {entries.map((entry, index) => (
            <motion.span key={entry.href} variants={itemRevealVariants}>
              <Link
                href={entry.href}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                className={[
                  styles.item,
                  activeIndex === index ? styles.itemActive : "",
                  enteringIndex === index ? styles.itemEntering : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                onMouseEnter={() => openIndex(index)}
                onFocus={() => openIndex(index)}
                onBlur={closeIndex}
              >
                <span className={styles.itemContent}>
                  <span className={styles.itemLabel}>{entry.label}</span>
                  <span className={styles.itemMeta}>
                    {entry.year} · {entry.category}
                  </span>
                </span>
              </Link>
            </motion.span>
          ))}
        </div>
      </motion.div>

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
    </motion.div>
  );
}
