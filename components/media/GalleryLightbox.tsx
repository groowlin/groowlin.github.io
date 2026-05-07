"use client";

import { type CSSProperties, type HTMLAttributes, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, useSpring } from "framer-motion";
import Image from "next/image";
import { createPortal } from "react-dom";
import { MdxMediaBlock } from "@/components/motion/MdxMotionComponents";
import { MediaPlaceholderView } from "@/components/media/MediaPlaceholder";
import type { MediaPlaceholder } from "@/lib/content/types";
import styles from "@/components/media/gallery-lightbox.module.css";

interface GalleryMediaItem extends MediaPlaceholder {
  openable?: boolean;
}

interface GalleryLightboxProps extends HTMLAttributes<HTMLDivElement> {
  items: GalleryMediaItem[];
  variant?: "default" | "work";
}

interface Rect {
  height: number;
  width: number;
  x: number;
  y: number;
}

interface LightboxGeometry {
  sourceRect: Rect;
  targetRect: Rect;
}

type LightboxPhase = "opening" | "open" | "closing";

function getGalleryRowSizes(itemCount: number) {
  if (itemCount <= 0) {
    return [];
  }

  if (itemCount <= 3) {
    return [itemCount];
  }

  const rows = Math.ceil(itemCount / 3);
  const sizes = Array.from({ length: rows }, () => 2);
  let remaining = itemCount - rows * 2;

  for (let index = sizes.length - 1; index >= 0 && remaining > 0; index -= 1) {
    sizes[index] += 1;
    remaining -= 1;
  }

  return sizes;
}

function getMediaOpenLabel(item: MediaPlaceholder, index: number) {
  const mediaType = item.kind === "video" ? "video" : "image";
  return `Open ${mediaType} ${index + 1} fullscreen`;
}

function focusWithoutScroll(target: HTMLElement | null) {
  target?.focus({ preventScroll: true });
}

function parseAspectRatio(input?: string) {
  if (!input) {
    return null;
  }

  const [rawWidth, rawHeight] = input.split("/").map((value) => Number(value.trim()));
  if (!Number.isFinite(rawWidth) || !Number.isFinite(rawHeight) || rawHeight === 0) {
    return null;
  }

  return rawWidth / rawHeight;
}

function getMediaRatio(item: GalleryMediaItem) {
  if (typeof item.intrinsicWidth === "number" && typeof item.intrinsicHeight === "number" && item.intrinsicHeight > 0) {
    return item.intrinsicWidth / item.intrinsicHeight;
  }

  return parseAspectRatio(item.aspectRatio) ?? 1;
}

function getModalTargetRect(item: GalleryMediaItem): Rect {
  const isMobile = window.innerWidth <= 767;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const horizontalPadding = isMobile ? 16 : 32;
  const maxInline = Math.min(viewportWidth - horizontalPadding * 2, 1312);
  const maxBlock = viewportHeight - (isMobile ? 96 : 144);
  const ratio = getMediaRatio(item);

  let width = maxInline;
  let height = width / ratio;

  if (height > maxBlock) {
    height = maxBlock;
    width = height * ratio;
  }

  return {
    x: (viewportWidth - width) / 2,
    y: (viewportHeight - height) / 2,
    width,
    height
  };
}

function toRect(value: DOMRect): Rect {
  return {
    x: value.left,
    y: value.top,
    width: value.width,
    height: value.height
  };
}

export function GalleryLightbox({ items, variant = "default", className, style, ...props }: GalleryLightboxProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [canTrackPointer, setCanTrackPointer] = useState(false);
  const [geometry, setGeometry] = useState<LightboxGeometry | null>(null);
  const [phase, setPhase] = useState<LightboxPhase>("opening");
  const [animatedRadius, setAnimatedRadius] = useState(20);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastPointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const scrollPositionRef = useRef<{ x: number; y: number } | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const pointerX = useSpring(0, { stiffness: 260, damping: 19, mass: 1.35 });
  const pointerY = useSpring(0, { stiffness: 260, damping: 19, mass: 1.35 });

  const rows = useMemo(() => {
    const rowSizes = getGalleryRowSizes(items.length);

    return rowSizes.reduce<{ offset: number; rows: GalleryMediaItem[][] }>(
      (accumulator, size) => {
        const nextOffset = accumulator.offset + size;
        return {
          offset: nextOffset,
          rows: [...accumulator.rows, items.slice(accumulator.offset, nextOffset)]
        };
      },
      { offset: 0, rows: [] }
    ).rows;
  }, [items]);

  const activeItem = activeIndex === null ? null : items[activeIndex] ?? null;
  const portalTarget = typeof document === "undefined" ? null : document.body;
  const isClosing = phase === "closing";

  const completeClose = useCallback(() => {
    setGeometry(null);
    setActiveIndex(null);
    setPhase("opening");
    setAnimatedRadius(20);
  }, []);

  const close = useCallback(() => {
    if (prefersReducedMotion) {
      completeClose();
      return;
    }

    setPhase((currentPhase) => {
      if (currentPhase === "closing") {
        return currentPhase;
      }

      return "closing";
    });
  }, [completeClose, prefersReducedMotion]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(pointer: fine)");
    const syncPointerCapability = () => {
      setCanTrackPointer(mediaQuery.matches);
    };

    syncPointerCapability();
    mediaQuery.addEventListener("change", syncPointerCapability);

    return () => {
      mediaQuery.removeEventListener("change", syncPointerCapability);
    };
  }, []);

  useEffect(() => {
    if (activeIndex === null) {
      return undefined;
    }

    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    scrollPositionRef.current = { x: window.scrollX, y: window.scrollY };

    const root = document.documentElement;
    const previousRootOverflow = root.style.overflow;
    const previousRootScrollbarGutter = root.style.scrollbarGutter;
    const previousOverflow = document.body.style.overflow;

    root.style.overflow = "hidden";
    root.style.scrollbarGutter = "stable";
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      const initialPointerPosition = lastPointerPositionRef.current ?? {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      };

      pointerX.jump(initialPointerPosition.x);
      pointerY.jump(initialPointerPosition.y);

      if (canTrackPointer) {
        focusWithoutScroll(dialogRef.current);
        return;
      }

      focusWithoutScroll(closeButtonRef.current);
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      root.style.overflow = previousRootOverflow;
      root.style.scrollbarGutter = previousRootScrollbarGutter;
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      focusWithoutScroll(restoreFocusRef.current);

      const scrollPosition = scrollPositionRef.current;
      if (scrollPosition) {
        window.scrollTo(scrollPosition.x, scrollPosition.y);
      }
    };
  }, [activeIndex, canTrackPointer, close, pointerX, pointerY]);

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <div
        {...props}
        className={[styles.gallery, className].filter(Boolean).join(" ")}
        style={
          {
            ...style,
            ["--media-bleed-offset" as string]: "0px"
          } satisfies CSSProperties
        }
      >
        {rows.map((rowItems, rowIndex) => (
          <div key={`gallery-row-${rowIndex}`} className={styles.row} data-columns={rowItems.length}>
            {rowItems.map((item, itemIndex) => {
              const absoluteIndex = rows
                .slice(0, rowIndex)
                .reduce((count, currentRow) => count + currentRow.length, 0) + itemIndex;
              const isActiveTrigger = activeIndex === absoluteIndex;

              return (
                <MdxMediaBlock key={`gallery-item-${rowIndex}-${itemIndex}`} className={styles.item}>
                  {item.openable === false ? (
                    <MediaPlaceholderView media={item} variant={variant} />
                  ) : (
                    <button
                      type="button"
                      className={[styles.trigger, isActiveTrigger && styles.triggerHidden].filter(Boolean).join(" ")}
                      onClick={(event) => {
                        const nextPointerPosition = { x: event.clientX, y: event.clientY };
                        const sourceRect = toRect(event.currentTarget.getBoundingClientRect());

                        lastPointerPositionRef.current = nextPointerPosition;
                        setGeometry({
                          sourceRect,
                          targetRect: getModalTargetRect(item)
                        });
                        setPhase("opening");
                        setAnimatedRadius(20);
                        setActiveIndex(absoluteIndex);
                      }}
                      aria-haspopup="dialog"
                      aria-label={getMediaOpenLabel(item, absoluteIndex)}
                    >
                      <MediaPlaceholderView media={item} variant={variant} />
                    </button>
                  )}
                </MdxMediaBlock>
              );
            })}
          </div>
        ))}
      </div>

      {portalTarget && activeItem && geometry
        ? createPortal(
            <div
              className={[styles.backdrop, canTrackPointer && styles.backdropTracked].filter(Boolean).join(" ")}
              onClick={() => {
                close();
              }}
              onPointerMove={(event) => {
                if (!canTrackPointer) {
                  return;
                }

                lastPointerPositionRef.current = { x: event.clientX, y: event.clientY };
                pointerX.set(event.clientX);
                pointerY.set(event.clientY);
              }}
            >
              <motion.div
                aria-hidden="true"
                className={styles.backdropVisual}
                initial={prefersReducedMotion ? false : { opacity: 0, backdropFilter: "blur(0px)" }}
                animate={
                  isClosing
                    ? { opacity: 0, backdropFilter: "blur(0px)" }
                    : { opacity: 1, backdropFilter: "blur(20px)" }
                }
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.22, ease: "easeOut" }}
              />

              <div
                ref={dialogRef}
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-label={getMediaOpenLabel(activeItem, activeIndex ?? 0)}
                tabIndex={-1}
              >
                {canTrackPointer ? (
                  <motion.button
                    ref={closeButtonRef}
                    type="button"
                    className={[styles.closeButton, styles.closeButtonFloating].join(" ")}
                    onClick={() => {
                      close();
                    }}
                    aria-label="Close fullscreen media"
                    style={{ x: pointerX, y: pointerY }}
                  >
                    <Image
                      src="/media/system/cursor_close.svg"
                      alt=""
                      aria-hidden="true"
                      width={36}
                      height={36}
                      className={styles.closeIcon}
                    />
                  </motion.button>
                ) : (
                  <button
                    ref={closeButtonRef}
                    type="button"
                    className={styles.closeButton}
                    onClick={() => {
                      close();
                    }}
                    aria-label="Close fullscreen media"
                  >
                    <Image
                      src="/media/system/cursor_close.svg"
                      alt=""
                      aria-hidden="true"
                      width={36}
                      height={36}
                      className={styles.closeIcon}
                    />
                  </button>
                )}

                <div className={styles.panel}>
                  <motion.div
                    className={styles.animatedMediaShell}
                    initial={
                      prefersReducedMotion
                        ? false
                        : {
                            x: geometry.sourceRect.x,
                            y: geometry.sourceRect.y,
                            width: geometry.sourceRect.width,
                            height: geometry.sourceRect.height,
                            borderRadius: 20
                          }
                    }
                    animate={{
                      x: isClosing ? geometry.sourceRect.x : geometry.targetRect.x,
                      y: isClosing ? geometry.sourceRect.y : geometry.targetRect.y,
                      width: isClosing ? geometry.sourceRect.width : geometry.targetRect.width,
                      height: isClosing ? geometry.sourceRect.height : geometry.targetRect.height,
                      borderRadius: animatedRadius
                    }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : {
                            type: "spring",
                            stiffness: 238,
                            damping: 20,
                            mass: 1.08
                          }
                    }
                    style={{ ["--lightbox-animated-radius" as string]: `${animatedRadius}px` } satisfies CSSProperties}
                    onUpdate={(latest) => {
                      if (!geometry) {
                        return;
                      }

                      const currentWidth =
                        typeof latest.width === "number"
                          ? latest.width
                          : isClosing
                            ? geometry.sourceRect.width
                            : geometry.targetRect.width;
                      const progress = Math.max(
                        0,
                        Math.min(
                          1,
                          (currentWidth - geometry.sourceRect.width) /
                            Math.max(geometry.targetRect.width - geometry.sourceRect.width, 1)
                        )
                      );
                      const nextRadius = 20 + progress * 20;

                      setAnimatedRadius((currentRadius) =>
                        Math.abs(currentRadius - nextRadius) < 0.1 ? currentRadius : nextRadius
                      );
                    }}
                    onAnimationComplete={() => {
                      if (prefersReducedMotion) {
                        return;
                      }

                      if (phase === "opening") {
                        setPhase("open");
                        return;
                      }

                      if (phase === "closing") {
                        completeClose();
                      }
                    }}
                  >
                    <MediaPlaceholderView
                      media={activeItem}
                      variant={variant}
                      presentation="modal"
                      fit="contain"
                      className={styles.animatedModalMedia}
                      showCaption={false}
                    />
                  </motion.div>

                  {activeItem.caption ? <p className={styles.caption}>{activeItem.caption}</p> : null}
                </div>
              </div>
            </div>,
            portalTarget
          )
        : null}
    </>
  );
}
