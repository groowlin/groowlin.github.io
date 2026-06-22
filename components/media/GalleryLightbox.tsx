"use client";

import { type CSSProperties, type HTMLAttributes, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, useSpring } from "framer-motion";
import Image from "next/image";
import { createPortal } from "react-dom";
import { MdxMediaBlock } from "@/components/motion/MdxMotionComponents";
import { MediaPlaceholderView } from "@/components/media/MediaPlaceholder";
import { getCurrentPath, trackMetricaGoal } from "@/lib/analytics/yandex-metrica";
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

interface ClosingVisualState {
  item: GalleryMediaItem;
  sourceIndex: number;
  targetRect: Rect;
  visualRect: Rect;
  accumulatedScroll: number;
  interrupted: boolean;
  forceDissolve: boolean;
  lastScrollX: number;
  lastScrollY: number;
  startedAt: number;
  closeButtonFloating: boolean;
  closeButtonPosition: { x: number; y: number } | null;
}

type LightboxPhase = "opening" | "open";
const preloadedImageSources = new Set<string>();
const pendingImagePreloads = new Map<string, Promise<void>>();
const VIDEO_FRAME_TOLERANCE_SECONDS = 1 / 60;

function getVideoTimelineDelta(firstTime: number, secondTime: number, duration: number) {
  const directDelta = Math.abs(firstTime - secondTime);
  return Number.isFinite(duration) && duration > 0 ? Math.min(directDelta, Math.abs(duration - directDelta)) : directDelta;
}

function waitForVideoSeek(element: HTMLVideoElement) {
  if (!element.seeking) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      element.removeEventListener("seeked", finish);
      window.clearTimeout(timeout);
      resolve();
    };
    const timeout = window.setTimeout(finish, 120);
    element.addEventListener("seeked", finish, { once: true });
  });
}

function waitForPresentedVideoFrame(element: HTMLVideoElement) {
  return new Promise<number>((resolve) => {
    if (typeof element.requestVideoFrameCallback !== "function") {
      window.requestAnimationFrame(() => resolve(element.currentTime));
      return;
    }

    let settled = false;
    const finish = (mediaTime: number) => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeout);
      resolve(mediaTime);
    };
    const timeout = window.setTimeout(() => finish(element.currentTime), 100);
    element.requestVideoFrameCallback((_now, metadata) => finish(metadata.mediaTime));
  });
}

async function synchronizePresentedVideo(
  target: HTMLVideoElement,
  reference: HTMLVideoElement,
  shouldContinue: () => boolean = () => true
) {
  if (!Number.isFinite(target.duration) || target.duration <= 0) {
    return;
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!shouldContinue()) {
      return;
    }

    target.currentTime = Math.min(
      reference.currentTime % target.duration,
      Math.max(target.duration - 0.05, 0)
    );
    await waitForVideoSeek(target);
    const mediaTime = await waitForPresentedVideoFrame(target);

    if (!shouldContinue()) {
      return;
    }

    if (
      getVideoTimelineDelta(mediaTime, reference.currentTime, target.duration) <=
      VIDEO_FRAME_TOLERANCE_SECONDS
    ) {
      return;
    }
  }
}

function preloadImageSource(src?: string) {
  if (!src || typeof window === "undefined") {
    return Promise.resolve();
  }

  if (preloadedImageSources.has(src) || pendingImagePreloads.has(src)) {
    return pendingImagePreloads.get(src) ?? Promise.resolve();
  }

  const preloadPromise = new Promise<void>((resolve) => {
    const image = new window.Image();
    image.decoding = "async";

    const markReady = () => {
      preloadedImageSources.add(src);
      pendingImagePreloads.delete(src);
      resolve();
    };

    image.onload = () => {
      if (typeof image.decode === "function") {
        image.decode().catch(() => undefined).finally(markReady);
        return;
      }

      markReady();
    };

    image.onerror = () => {
      pendingImagePreloads.delete(src);
      resolve();
    };

    image.src = src;

    if (image.complete) {
      markReady();
    }
  });

  pendingImagePreloads.set(src, preloadPromise);
  return preloadPromise;
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
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [canTrackPointer, setCanTrackPointer] = useState(false);
  const [geometry, setGeometry] = useState<LightboxGeometry | null>(null);
  const [closingVisual, setClosingVisual] = useState<ClosingVisualState | null>(null);
  const [phase, setPhase] = useState<LightboxPhase>("opening");
  const [animatedRadius, setAnimatedRadius] = useState(20);
  const [closingAnimatedRadius, setClosingAnimatedRadius] = useState(20);
  const [fullAssetRevision, setFullAssetRevision] = useState(0);
  const [modalVideoStartTime, setModalVideoStartTime] = useState<number | undefined>(undefined);
  const [modalVideoReady, setModalVideoReady] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const activeModalMediaRef = useRef<HTMLDivElement | null>(null);
  const openingVideoSourceRef = useRef<HTMLVideoElement | null>(null);
  const openingVideoFrameRef = useRef<HTMLCanvasElement | null>(null);
  const videoSyncRevisionRef = useRef(0);
  const triggerRefs = useRef(new Map<number, HTMLButtonElement | null>());
  const triggerMediaRefs = useRef(new Map<number, HTMLDivElement | null>());
  const activeVisualRectRef = useRef<Rect | null>(null);
  const closingVisualRectRef = useRef<Rect | null>(null);
  const lastPointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const scrollPositionRef = useRef<{ x: number; y: number } | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const pointerX = useSpring(0, { stiffness: 260, damping: 19, mass: 1.35 });
  const pointerY = useSpring(0, { stiffness: 260, damping: 19, mass: 1.35 });
  // Disabled for now: subtle tilt on open media. Kept commented because we may return to it.
  // const mediaTiltX = useSpring(0, { stiffness: 220, damping: 24, mass: 0.8 });
  // const mediaTiltY = useSpring(0, { stiffness: 220, damping: 24, mass: 0.8 });

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
  const portalTarget = typeof document === "undefined" ? null : document.documentElement;
  const closingSourceIndex = closingVisual?.sourceIndex ?? null;
  const isVideoClosing = Boolean(
    closingVisual && activeItem?.kind === "video" && closingVisual.sourceIndex === activeIndex
  );

  const isFullImageReady = useCallback((item: GalleryMediaItem | null) => {
    return Boolean(item?.kind === "image" && item.fullSrc && preloadedImageSources.has(item.fullSrc));
  }, []);

  const activeModalItem = useMemo(() => {
    const revision = fullAssetRevision;
    void revision;

    if (
      !activeItem ||
      activeItem.kind !== "image" ||
      !activeItem.fullSrc ||
      !isFullImageReady(activeItem) ||
      phase !== "open"
    ) {
      return activeItem;
    }

    return activeItem;
  }, [activeItem, fullAssetRevision, isFullImageReady, phase]);

  const openingModalItem = useMemo(() => {
    if (!activeItem || activeItem.kind !== "image" || !activeItem.fullSrc) {
      return activeItem;
    }

    return {
      ...activeItem,
      fullSrc: undefined,
      fullIntrinsicWidth: undefined,
      fullIntrinsicHeight: undefined
    } satisfies GalleryMediaItem;
  }, [activeItem]);

  const completeClose = useCallback(() => {
    setGeometry(null);
    setActiveIndex(null);
    setPhase("opening");
    setAnimatedRadius(20);
    setModalVideoStartTime(undefined);
    setModalVideoReady(false);
    openingVideoSourceRef.current = null;
  }, []);

  useLayoutEffect(() => {
    const sourceVideo = openingVideoSourceRef.current;
    const frameCanvas = openingVideoFrameRef.current;

    if (activeItem?.kind !== "video" || !sourceVideo || !frameCanvas) {
      return;
    }

    const frameWidth = sourceVideo.videoWidth || activeItem.intrinsicWidth || 1;
    const frameHeight = sourceVideo.videoHeight || activeItem.intrinsicHeight || 1;
    const context = frameCanvas.getContext("2d");

    if (!context) {
      frameCanvas.style.display = "none";
      return;
    }

    frameCanvas.width = frameWidth;
    frameCanvas.height = frameHeight;

    try {
      context.drawImage(sourceVideo, 0, 0, frameWidth, frameHeight);
    } catch {
      frameCanvas.style.display = "none";
    }
  }, [activeItem, modalVideoReady]);

  const getCurrentSourceRect = useCallback((index: number) => {
    const triggerMedia = triggerMediaRefs.current.get(index);
    if (triggerMedia) {
      return toRect(triggerMedia.getBoundingClientRect());
    }

    const trigger = triggerRefs.current.get(index);
    if (!trigger) {
      return null;
    }

    return toRect(trigger.getBoundingClientRect());
  }, []);

  const close = useCallback(() => {
    if (prefersReducedMotion) {
      completeClose();
      return;
    }

    const displayedItem = phase === "open" ? activeModalItem : openingModalItem ?? activeModalItem;

    if (activeIndex !== null && displayedItem && geometry) {
      if (displayedItem.kind === "video") {
        const triggerVideo = triggerMediaRefs.current.get(activeIndex)?.querySelector("video");
        const modalVideo =
          activeModalMediaRef.current?.querySelector<HTMLVideoElement>('video[data-video-active="true"]');

        if (triggerVideo && modalVideo) {
          const syncRevision = ++videoSyncRevisionRef.current;
          void synchronizePresentedVideo(
            triggerVideo,
            modalVideo,
            () => videoSyncRevisionRef.current === syncRevision
          );
        }
      }

      setClosingVisual({
        item: displayedItem,
        sourceIndex: activeIndex,
        targetRect: getCurrentSourceRect(activeIndex) ?? geometry.sourceRect,
        visualRect: activeVisualRectRef.current ?? geometry.targetRect,
        accumulatedScroll: 0,
        interrupted: false,
        forceDissolve: false,
        lastScrollX: window.scrollX,
        lastScrollY: window.scrollY,
        startedAt: performance.now(),
        closeButtonFloating: canTrackPointer,
        closeButtonPosition: lastPointerPositionRef.current
      });
      setClosingAnimatedRadius(animatedRadius);
      closingVisualRectRef.current = activeVisualRectRef.current ?? geometry.targetRect;
    }

    if (displayedItem?.kind !== "video") {
      completeClose();
    }
  }, [
    activeIndex,
    activeModalItem,
    animatedRadius,
    canTrackPointer,
    completeClose,
    geometry,
    getCurrentSourceRect,
    openingModalItem,
    phase,
    prefersReducedMotion
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const viewportQuery = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => {
      setIsMobileViewport(viewportQuery.matches);
    };

    syncViewport();
    viewportQuery.addEventListener("change", syncViewport);

    const mediaQuery = window.matchMedia("(pointer: fine)");
    const syncPointerCapability = () => {
      setCanTrackPointer(mediaQuery.matches);
    };

    syncPointerCapability();
    mediaQuery.addEventListener("change", syncPointerCapability);

    return () => {
      viewportQuery.removeEventListener("change", syncViewport);
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
        x: document.documentElement.clientWidth / 2,
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

    const onPointerMove = (event: PointerEvent) => {
      if (!canTrackPointer) {
        return;
      }

      lastPointerPositionRef.current = { x: event.clientX, y: event.clientY };
      pointerX.set(event.clientX);
      pointerY.set(event.clientY);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      root.style.overflow = previousRootOverflow;
      root.style.scrollbarGutter = previousRootScrollbarGutter;
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointermove", onPointerMove);
      focusWithoutScroll(restoreFocusRef.current);

      const scrollPosition = scrollPositionRef.current;
      if (scrollPosition) {
        window.scrollTo(scrollPosition.x, scrollPosition.y);
      }
    };
  }, [activeIndex, canTrackPointer, close, pointerX, pointerY]);

  // Disabled for now: reset hook for open-media tilt springs.
  // useEffect(() => {
  //   if (activeIndex !== null) {
  //     return undefined;
  //   }
  //
  //   mediaTiltX.jump(0);
  //   mediaTiltY.jump(0);
  //
  //   return undefined;
  // }, [activeIndex, mediaTiltX, mediaTiltY]);

  useEffect(() => {
    if (closingSourceIndex === null) {
      return undefined;
    }

    let frame = 0;

    const syncTargetRect = () => {
      const nextRect = getCurrentSourceRect(closingSourceIndex);
      setClosingVisual((currentVisual) => {
        if (!currentVisual || currentVisual.sourceIndex !== closingSourceIndex) {
          return currentVisual;
        }

        const nextScrollX = window.scrollX;
        const nextScrollY = window.scrollY;
        const scrollDelta =
          Math.abs(nextScrollX - currentVisual.lastScrollX) + Math.abs(nextScrollY - currentVisual.lastScrollY);
        const accumulatedScroll = currentVisual.accumulatedScroll + scrollDelta;
        const elapsedTime = performance.now() - currentVisual.startedAt;
        const interrupted = currentVisual.interrupted || accumulatedScroll >= 40;
        const shouldForceDissolve = currentVisual.forceDissolve || elapsedTime >= 4000;
        const currentRect = currentVisual.targetRect;
        const hasRectChanged = Boolean(
          nextRect &&
            (Math.abs(currentRect.x - nextRect.x) > 0.5 ||
              Math.abs(currentRect.y - nextRect.y) > 0.5 ||
              Math.abs(currentRect.width - nextRect.width) > 0.5 ||
              Math.abs(currentRect.height - nextRect.height) > 0.5)
        );
        const hasScrollChanged = scrollDelta > 0;

        if (shouldForceDissolve && !currentVisual.forceDissolve) {
          const frozenRect = closingVisualRectRef.current ?? currentVisual.targetRect;

          return {
            ...currentVisual,
            targetRect: frozenRect,
            visualRect: frozenRect,
            accumulatedScroll,
            interrupted: true,
            forceDissolve: true,
            lastScrollX: nextScrollX,
            lastScrollY: nextScrollY
          };
        }

        if (
          !hasRectChanged &&
          !hasScrollChanged &&
          interrupted === currentVisual.interrupted &&
          shouldForceDissolve === currentVisual.forceDissolve
        ) {
          return currentVisual;
        }

        return {
          ...currentVisual,
          targetRect: shouldForceDissolve ? currentVisual.targetRect : nextRect ?? currentVisual.targetRect,
          accumulatedScroll,
          interrupted,
          forceDissolve: shouldForceDissolve,
          lastScrollX: nextScrollX,
          lastScrollY: nextScrollY
        };
      });

      frame = window.requestAnimationFrame(syncTargetRect);
    };

    frame = window.requestAnimationFrame(syncTargetRect);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [closingSourceIndex, getCurrentSourceRect]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const preloadableItems = items.filter((item) => item.kind === "image" && item.openable !== false && item.fullSrc);
    if (preloadableItems.length === 0) {
      return undefined;
    }

    let cancelled = false;
    const schedule = window.requestIdleCallback
      ? window.requestIdleCallback(() => {
          if (cancelled) {
            return;
          }

          preloadableItems.forEach((item) => preloadImageSource(item.fullSrc));
        })
      : window.setTimeout(() => {
          if (cancelled) {
            return;
          }

          preloadableItems.forEach((item) => preloadImageSource(item.fullSrc));
        }, 120);

    return () => {
      cancelled = true;
      if (typeof schedule === "number") {
        window.clearTimeout(schedule);
        return;
      }

      window.cancelIdleCallback?.(schedule);
    };
  }, [items]);

  useEffect(() => {
    if (!activeItem || activeItem.kind !== "image" || !activeItem.fullSrc || isFullImageReady(activeItem)) {
      return undefined;
    }

    let cancelled = false;

    preloadImageSource(activeItem.fullSrc)?.finally(() => {
      if (!cancelled) {
        setFullAssetRevision((current) => current + 1);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeItem, isFullImageReady]);

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
              const isClosingSourceTrigger = closingSourceIndex === absoluteIndex;
              const isClosingHandoffTrigger = isClosingSourceTrigger && closingVisual?.forceDissolve;

              return (
                <MdxMediaBlock key={`gallery-item-${rowIndex}-${itemIndex}`} className={styles.item}>
                  {item.openable === false || isMobileViewport ? (
                    <MediaPlaceholderView media={item} variant={variant} />
                  ) : (
                    <button
                      ref={(node) => {
                        triggerRefs.current.set(absoluteIndex, node);
                      }}
                      type="button"
                      className={[
                        styles.trigger,
                        isActiveTrigger && !isVideoClosing && styles.triggerHidden
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onPointerEnter={() => {
                        preloadImageSource(item.fullSrc);
                      }}
                      onFocus={() => {
                        preloadImageSource(item.fullSrc);
                      }}
                      onClick={(event) => {
                        videoSyncRevisionRef.current += 1;
                        const nextPointerPosition = { x: event.clientX, y: event.clientY };
                        const sourceRect = getCurrentSourceRect(absoluteIndex) ?? toRect(event.currentTarget.getBoundingClientRect());
                        const sourceVideo = triggerMediaRefs.current.get(absoluteIndex)?.querySelector("video");
                        lastPointerPositionRef.current = nextPointerPosition;
                        setClosingVisual(null);
                        setClosingAnimatedRadius(20);
                        setGeometry({
                          sourceRect,
                          targetRect: getModalTargetRect(item)
                        });
                        setPhase("opening");
                        setAnimatedRadius(20);
                        setModalVideoStartTime(sourceVideo?.currentTime);
                        setModalVideoReady(item.kind !== "video");
                        openingVideoSourceRef.current = item.kind === "video" ? sourceVideo ?? null : null;
                        setActiveIndex(absoluteIndex);
                        trackMetricaGoal("image_fullscreen_open", {
                          page_path: getCurrentPath(),
                          image_index: absoluteIndex + 1,
                          media_kind: item.kind,
                          gallery_variant: variant
                        });
                      }}
                      aria-haspopup="dialog"
                      aria-label={getMediaOpenLabel(item, absoluteIndex)}
                    >
                      <MediaPlaceholderView
                        media={item}
                        variant={variant}
                        mediaRef={(node) => {
                          triggerMediaRefs.current.set(absoluteIndex, node);
                        }}
                        assetClassName={styles.triggerAsset}
                        appearance={isClosingSourceTrigger ? (isClosingHandoffTrigger ? "handoff" : "skeleton") : "default"}
                      />
                    </button>
                  )}
                </MdxMediaBlock>
              );
            })}
          </div>
        ))}
      </div>

      {portalTarget && activeModalItem && geometry
        ? createPortal(
            <div
              className={[styles.backdrop, canTrackPointer && styles.backdropTracked].filter(Boolean).join(" ")}
              style={isVideoClosing ? { pointerEvents: "none" } : undefined}
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
                  isVideoClosing
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
                aria-label={getMediaOpenLabel(activeModalItem, activeIndex ?? 0)}
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
                    initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.76 }}
                    animate={
                      isVideoClosing
                        ? { opacity: 0, scale: 0.88 }
                        : { opacity: 1, scale: 1 }
                    }
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { duration: 0.22, delay: 0.08, ease: [0.22, 1, 0.36, 1] }
                    }
                  >
                    <Image
                      src="/media/system/cursor_close.svg"
                      alt=""
                      aria-hidden="true"
                      width={36}
                      height={36}
                      draggable={false}
                      className={styles.closeIcon}
                    />
                  </motion.button>
                ) : (
                  <motion.button
                    ref={closeButtonRef}
                    type="button"
                    className={styles.closeButton}
                    onClick={() => {
                      close();
                    }}
                    aria-label="Close fullscreen media"
                    initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.76 }}
                    animate={
                      isVideoClosing
                        ? { opacity: 0, scale: 0.88 }
                        : { opacity: 1, scale: 1 }
                    }
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { duration: 0.22, delay: 0.08, ease: [0.22, 1, 0.36, 1] }
                    }
                  >
                    <Image
                      src="/media/system/cursor_close.svg"
                      alt=""
                      aria-hidden="true"
                      width={36}
                      height={36}
                      draggable={false}
                      className={styles.closeIcon}
                    />
                  </motion.button>
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
                      x: isVideoClosing
                        ? closingVisual?.targetRect.x
                        : geometry.targetRect.x,
                      y: isVideoClosing
                        ? closingVisual?.targetRect.y
                        : geometry.targetRect.y,
                      width: isVideoClosing
                        ? closingVisual?.targetRect.width
                        : geometry.targetRect.width,
                      height: isVideoClosing
                        ? closingVisual?.targetRect.height
                        : geometry.targetRect.height,
                      borderRadius: isVideoClosing ? 20 : animatedRadius
                    }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : {
                            // Previous version:
                            // type: "spring",
                            // stiffness: 238,
                            // damping: 20,
                            // mass: 1.08
                            duration: 0.28,
                            ease: [0.22, 1, 0.36, 1]
                          }
                    }
                    style={
                      {
                        ["--lightbox-animated-radius" as string]: `${animatedRadius}px`
                      } satisfies CSSProperties
                    }
                    onUpdate={(latest) => {
                      if (!geometry) {
                        return;
                      }

                      const currentWidth =
                        typeof latest.width === "number"
                          ? latest.width
                          : geometry.targetRect.width;
                      activeVisualRectRef.current = {
                        x: typeof latest.x === "number" ? latest.x : geometry.targetRect.x,
                        y: typeof latest.y === "number" ? latest.y : geometry.targetRect.y,
                        width: currentWidth,
                        height: typeof latest.height === "number" ? latest.height : geometry.targetRect.height
                      };
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
                      if (isVideoClosing) {
                        activeVisualRectRef.current = null;
                        closingVisualRectRef.current = null;
                        setClosingVisual(null);
                        setClosingAnimatedRadius(20);
                        completeClose();
                        return;
                      }

                      if (prefersReducedMotion) {
                        return;
                      }

                      if (phase === "opening") {
                        setPhase("open");
                      }
                    }}
                    // Disabled for now: pointer tilt on open media.
                    // onPointerMove={(event) => {
                    //   if (!canTrackPointer || phase !== "open") {
                    //     mediaTiltX.set(0);
                    //     mediaTiltY.set(0);
                    //     return;
                    //   }
                    //
                    //   const currentRect = activeVisualRectRef.current ?? geometry.targetRect;
                    //   if (!currentRect.width || !currentRect.height) {
                    //     mediaTiltX.set(0);
                    //     mediaTiltY.set(0);
                    //     return;
                    //   }
                    //
                    //   const relativeX = (event.clientX - currentRect.x) / currentRect.width;
                    //   const relativeY = (event.clientY - currentRect.y) / currentRect.height;
                    //   const clampedX = Math.max(0, Math.min(1, relativeX));
                    //   const clampedY = Math.max(0, Math.min(1, relativeY));
                    //   const maxTilt = 2.8;
                    //
                    //   mediaTiltY.set((clampedX - 0.5) * maxTilt * 2);
                    //   mediaTiltX.set((0.5 - clampedY) * maxTilt * 2);
                    // }}
                    // onPointerLeave={() => {
                    //   mediaTiltX.set(0);
                    //   mediaTiltY.set(0);
                    // }}
                  >
                    <MediaPlaceholderView
                      media={phase === "open" ? activeModalItem : openingModalItem ?? activeModalItem}
                      variant={variant}
                      presentation="modal"
                      fit="contain"
                      className={styles.animatedModalMedia}
                      showCaption={false}
                      mediaRef={activeModalMediaRef}
                      progressiveVideo
                      revealFullVideo={phase === "open" || Boolean(prefersReducedMotion)}
                      videoStartTime={modalVideoStartTime}
                      onVideoReady={() => setModalVideoReady(true)}
                    />
                    {activeModalItem.kind === "video" && !modalVideoReady && (
                      <canvas
                        ref={openingVideoFrameRef}
                        className={styles.openingVideoFrame}
                        aria-hidden="true"
                      />
                    )}
                  </motion.div>
                </div>
              </div>
            </div>,
            portalTarget
          )
        : null}

      {portalTarget && closingVisual && closingVisual.item.kind !== "video"
        ? createPortal(
            <div className={styles.backdrop} style={{ pointerEvents: "none" }}>
              <motion.div
                aria-hidden="true"
                className={styles.backdropVisual}
                initial={{ opacity: 1, backdropFilter: "blur(20px)" }}
                animate={{ opacity: 0, backdropFilter: "blur(0px)" }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              />

              <div className={styles.dialog} aria-hidden="true">
                {closingVisual.closeButtonFloating ? (
                  <motion.div
                    className={[styles.closeButton, styles.closeButtonFloating].join(" ")}
                    style={closingVisual.closeButtonPosition ? closingVisual.closeButtonPosition : undefined}
                    initial={{ opacity: 1, scale: 1 }}
                    animate={{ opacity: 0, scale: 0.88 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Image
                      src="/media/system/cursor_close.svg"
                      alt=""
                      aria-hidden="true"
                      width={36}
                      height={36}
                      draggable={false}
                      className={styles.closeIcon}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    className={styles.closeButton}
                    initial={{ opacity: 1, scale: 1 }}
                    animate={{ opacity: 0, scale: 0.88 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Image
                      src="/media/system/cursor_close.svg"
                      alt=""
                      aria-hidden="true"
                      width={36}
                      height={36}
                      draggable={false}
                      className={styles.closeIcon}
                    />
                  </motion.div>
                )}

                <div className={styles.panel}>
                  <motion.div
                    className={styles.animatedMediaShell}
                    initial={{
                      x: closingVisual.visualRect.x,
                      y: closingVisual.visualRect.y,
                      width: closingVisual.visualRect.width,
                      height: closingVisual.visualRect.height,
                      borderRadius: closingAnimatedRadius,
                      opacity: 1,
                      filter: "blur(0px)"
                    }}
                    animate={{
                      x: closingVisual.targetRect.x,
                      y: closingVisual.targetRect.y,
                      width: closingVisual.targetRect.width,
                      height: closingVisual.targetRect.height,
                      borderRadius: closingAnimatedRadius,
                      opacity: closingVisual.forceDissolve ? 0 : 1,
                      filter: closingVisual.forceDissolve ? "blur(18px)" : "blur(0px)"
                    }}
                    transition={{
                      ...(closingVisual.forceDissolve
                        ? {
                            duration: 0.22,
                            ease: [0.22, 1, 0.36, 1] as const
                          }
                        : closingVisual.interrupted
                        ? {
                            duration: 0.16,
                            ease: [0.22, 1, 0.36, 1] as const
                          }
                        : {
                            // Previous version:
                            // type: "spring" as const,
                            // stiffness: 238,
                            // damping: 22,
                            // mass: 1.08
                            duration: 0.24,
                            ease: [0.22, 1, 0.36, 1] as const
                          })
                    }}
                    style={{ ["--lightbox-animated-radius" as string]: `${closingAnimatedRadius}px` } satisfies CSSProperties}
                    onUpdate={(latest) => {
                      closingVisualRectRef.current = {
                        x: typeof latest.x === "number" ? latest.x : closingVisual.targetRect.x,
                        y: typeof latest.y === "number" ? latest.y : closingVisual.targetRect.y,
                        width: typeof latest.width === "number" ? latest.width : closingVisual.targetRect.width,
                        height: typeof latest.height === "number" ? latest.height : closingVisual.targetRect.height
                      };

                      if (closingVisual.forceDissolve) {
                        return;
                      }

                      const currentWidth =
                        typeof latest.width === "number"
                          ? latest.width
                          : closingVisual.targetRect.width;
                      const progress = Math.max(
                        0,
                        Math.min(
                          1,
                          (currentWidth - closingVisual.targetRect.width) /
                            Math.max(closingVisual.visualRect.width - closingVisual.targetRect.width, 1)
                        )
                      );
                      const nextRadius = 20 + progress * 20;

                      setClosingAnimatedRadius((currentRadius) =>
                        Math.abs(currentRadius - nextRadius) < 0.1 ? currentRadius : nextRadius
                      );
                    }}
                    onAnimationComplete={() => {
                      closingVisualRectRef.current = null;
                      setClosingVisual(null);
                      setClosingAnimatedRadius(20);
                    }}
                  >
                    <MediaPlaceholderView
                      media={closingVisual.item}
                      variant={variant}
                      presentation="modal"
                      fit="contain"
                      className={styles.animatedModalMedia}
                      showCaption={false}
                    />
                  </motion.div>
                </div>
              </div>
            </div>,
            portalTarget
          )
        : null}
    </>
  );
}
