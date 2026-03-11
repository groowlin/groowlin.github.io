"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { homeWorkEntries, siteIdentity } from "@/lib/content";
import { itemRevealVariants, pageRevealVariants } from "@/components/motion/MotionPage";
import { MediaPlaceholderView } from "@/components/media/MediaPlaceholder";
import styles from "@/components/home/home-showcase.module.css";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function HomeShowcase() {
  const [canHover, setCanHover] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [highlightRect, setHighlightRect] = useState<Rect | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [shift, setShift] = useState({ x: 0, y: 0 });
  const [origin, setOrigin] = useState({ ox: 50, oy: 50 });

  const listWrapRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const entry = homeWorkEntries[previewIndex];

    return {
      kind: entry.preview.kind,
      aspectRatio: entry.preview.aspectRatio,
      posterToken: entry.preview.token
    } as const;
  }, [previewIndex]);

  function openIndex(index: number) {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setActiveIndex(index);
    setPreviewIndex(index);
    syncHighlight(index);
  }

  function closeIndex() {
    closeTimerRef.current = setTimeout(() => {
      setActiveIndex(null);
      setTilt({ rx: 0, ry: 0 });
      setShift({ x: 0, y: 0 });
      setOrigin({ ox: 50, oy: 50 });
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
      setOrigin({ ox: 30 + 40 * ox, oy: 30 + 40 * oy });
    }

    nx = Math.max(-1, Math.min(1, nx));
    ny = Math.max(-1, Math.min(1, ny));

    setTilt({ rx: -ny * 1.25, ry: nx * 0.85 });
    setShift({ x: nx * 12, y: ny * 8 });
  }

  return (
    <motion.div className={styles.root} initial="initial" animate="visible" variants={pageRevealVariants}>
      <motion.div className={styles.intro} variants={itemRevealVariants}>
        <h1 className={styles.name}>{siteIdentity.name}</h1>
        <h2 className={styles.role}>{siteIdentity.role}</h2>
      </motion.div>

      <motion.div
        className={styles.listWrap}
        ref={listWrapRef}
        onMouseMove={onMouseMove}
        onMouseLeave={closeIndex}
        variants={itemRevealVariants}
      >
        <AnimatePresence>
          {highlightRect && activeIndex !== null && (
            <motion.div
              className={styles.glass}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                top: highlightRect.top,
                left: highlightRect.left,
                width: highlightRect.width,
                height: highlightRect.height,
                rotateX: tilt.rx,
                rotateY: tilt.ry,
                x: shift.x,
                y: shift.y
              }}
              exit={{ opacity: 0 }}
              transition={{
                top: { type: "spring", duration: 0.6, bounce: 0.15 },
                left: { type: "spring", duration: 0.6, bounce: 0.15 },
                width: { type: "spring", duration: 0.6, bounce: 0 },
                height: { type: "spring", duration: 0.6, bounce: 0 },
                rotateX: { type: "spring", duration: 0.45, bounce: 0.06 },
                rotateY: { type: "spring", duration: 0.45, bounce: 0.06 },
                x: { type: "spring", duration: 0.6, bounce: 0.15 },
                y: { type: "spring", duration: 0.6, bounce: 0.15 },
                opacity: { duration: 0.28 }
              }}
              style={{ transformOrigin: `${origin.ox}% ${origin.oy}%` }}
            >
              <span className={styles.glassHighlight} style={{ ["--lgy" as string]: `${origin.oy}%` }} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className={styles.list}>
          {homeWorkEntries.map((entry, index) => (
            <motion.span key={entry.href} variants={itemRevealVariants}>
              <Link
                href={entry.href}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                className={styles.item}
                onMouseEnter={() => openIndex(index)}
                onFocus={() => openIndex(index)}
                onBlur={closeIndex}
              >
                <span>{entry.label}</span>
                <span className={styles.itemMeta}>
                  {entry.year} - {entry.subtitle}
                </span>
              </Link>
            </motion.span>
          ))}
        </div>
      </motion.div>

      <AnimatePresence>
        {canHover && previewMedia && previewIndex !== null && (
          <motion.aside
            className={styles.previewPane}
            initial={{ opacity: 0, filter: "blur(10px)", scale: 0.97 }}
            animate={{ opacity: 1, filter: "blur(0)", scale: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)", scale: 0.97 }}
            transition={{ type: "spring", duration: 0.6, bounce: 0 }}
          >
            <MediaPlaceholderView media={previewMedia} className={styles.previewCard} />
          </motion.aside>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
