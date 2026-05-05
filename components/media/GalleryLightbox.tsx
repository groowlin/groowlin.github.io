"use client";

import { type CSSProperties, type HTMLAttributes, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useSpring } from "framer-motion";
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

export function GalleryLightbox({ items, variant = "default", className, style, ...props }: GalleryLightboxProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [canTrackPointer, setCanTrackPointer] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastPointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
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

  const close = useCallback(() => {
    setActiveIndex(null);
  }, []);

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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      const initialPointerPosition = lastPointerPositionRef.current ?? {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      };

      pointerX.jump(initialPointerPosition.x);
      pointerY.jump(initialPointerPosition.y);

      if (canTrackPointer) {
        dialogRef.current?.focus();
        return;
      }

      closeButtonRef.current?.focus();
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
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      restoreFocusRef.current?.focus();
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

              return (
                <MdxMediaBlock key={`gallery-item-${rowIndex}-${itemIndex}`} className={styles.item}>
                  {item.openable === false ? (
                    <MediaPlaceholderView media={item} variant={variant} />
                  ) : (
                    <button
                      type="button"
                      className={styles.trigger}
                      onClick={(event) => {
                        lastPointerPositionRef.current = { x: event.clientX, y: event.clientY };
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

      {portalTarget && activeItem
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
                  <div className={styles.mediaFrame}>
                    <MediaPlaceholderView
                      media={activeItem}
                      variant={variant}
                      presentation="modal"
                      fit="contain"
                      className={styles.modalMedia}
                      showCaption={false}
                    />
                  </div>

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
