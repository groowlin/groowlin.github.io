"use client";

import {
  type CSSProperties,
  type HTMLAttributes,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { animate, motion, useAnimationControls, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import Image from "next/image";
import { createPortal } from "react-dom";
import { MdxMediaBlock } from "@/components/motion/MdxMotionComponents";
import { MediaPlaceholderView } from "@/components/media/MediaPlaceholder";
import { LightboxImageLayers, type OpeningImageSource } from "@/components/media/LightboxImageLayers";
import {
  DEFAULT_LIGHTBOX_CONTEXT_MOTION,
  LightboxMotionDebugPanel,
  type LightboxContextMotionSettings
} from "@/components/media/LightboxMotionDebugPanel";
import { getLightboxContext, type LightboxContext } from "@/components/media/lightbox-context";
import { useGalleryLightboxScope } from "@/components/media/GalleryLightboxScope";
import { ScrollArrowHead } from "@/components/navigation/ScrollArrowHead";
import { ProgressiveBlur, type ProgressiveBlurLayer } from "@/components/design-system/ProgressiveBlur";
import { TopCardArrow } from "@/components/navigation/TopCard";
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
  sourceRadius: number;
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
  sourceRadius: number;
}

type LightboxPhase = "opening" | "open";

interface ScopedItemEntry {
  item: GalleryMediaItem;
  localIndex: number;
  registrationId: string;
}
const preloadedImageSources = new Set<string>();
const pendingImagePreloads = new Map<string, Promise<boolean>>();
const VIDEO_FRAME_TOLERANCE_SECONDS = 1 / 60;
const THUMBNAIL_TRANSITION_DURATION_MS = 200;
const MOBILE_ZOOM_MAX = 4;
const LIGHTBOX_PROGRESSIVE_BLUR_LAYERS = [
  { blur: 0, maskStart: 0, maskEnd: 20 },
  { blur: 8, maskStart: 8, maskEnd: 35 },
  { blur: 16, maskStart: 20, maskEnd: 50 }
] as const satisfies readonly ProgressiveBlurLayer[];

function getContextTitleArcPoint(progress: number, offsetX: number, offsetY: number) {
  const inverse = 1 - progress;
  const inverseSquared = inverse * inverse;
  const progressSquared = progress * progress;

  // The horizontal departure and vertical arrival keep both measured title positions intact.
  return {
    x: offsetX * (inverseSquared * inverse + 3 * inverseSquared * progress * 0.35),
    y: offsetY * (inverseSquared * inverse + 3 * inverseSquared * progress
      + 3 * inverse * progressSquared * 0.65)
  };
}

function getTouchDistance(first: { clientX: number; clientY: number }, second: { clientX: number; clientY: number }) {
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
}

function getThumbnailTransitionProgress(progress: number) {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  let lowerBound = 0;
  let upperBound = 1;
  let parameter = clampedProgress;

  for (let iteration = 0; iteration < 12; iteration += 1) {
    parameter = (lowerBound + upperBound) / 2;
    const inverseParameter = 1 - parameter;
    const bezierX =
      3 * inverseParameter * inverseParameter * parameter * 0.25 +
      3 * inverseParameter * parameter * parameter * 0.25 +
      parameter * parameter * parameter;

    if (bezierX < clampedProgress) {
      lowerBound = parameter;
    } else {
      upperBound = parameter;
    }
  }

  const inverseParameter = 1 - parameter;
  return (
    3 * inverseParameter * inverseParameter * parameter * 0.1 +
    3 * inverseParameter * parameter * parameter +
    parameter * parameter * parameter
  );
}

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
    return Promise.resolve(false);
  }

  if (preloadedImageSources.has(src)) {
    return Promise.resolve(true);
  }

  if (pendingImagePreloads.has(src)) {
    return pendingImagePreloads.get(src) ?? Promise.resolve(false);
  }

  const preloadPromise = new Promise<boolean>((resolve) => {
    const image = new window.Image();
    image.decoding = "async";
    let settled = false;

    const finish = (ready: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      pendingImagePreloads.delete(src);
      if (ready) {
        preloadedImageSources.add(src);
      }
      resolve(ready);
    };

    const decode = async () => {
      if (image.naturalWidth <= 0) {
        finish(false);
        return;
      }

      if (typeof image.decode !== "function") {
        finish(true);
        return;
      }

      try {
        await image.decode();
        finish(image.naturalWidth > 0);
      } catch {
        finish(false);
      }
    };

    image.onload = () => void decode();
    image.onerror = () => finish(false);

    image.src = src;

    if (image.complete) {
      window.queueMicrotask(() => {
        if (image.naturalWidth > 0) {
          void decode();
        } else {
          finish(false);
        }
      });
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
  const horizontalPadding = isMobile ? 0 : 32;
  const maxInline = Math.min(viewportWidth - horizontalPadding * 2, 1312);
  const maxBlock = isMobile ? viewportHeight : viewportHeight - 144;
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

function isRectVisible(rect: Rect) {
  return rect.width > 0 && rect.height > 0 && rect.x + rect.width > 0 && rect.y + rect.height > 0 && rect.x < window.innerWidth && rect.y < window.innerHeight;
}

export function GalleryLightbox({ items, variant = "default", className, style, ...props }: GalleryLightboxProps) {
  const registrationId = useId();
  const galleryScope = useGalleryLightboxScope();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [canTrackPointer, setCanTrackPointer] = useState(false);
  const [geometry, setGeometry] = useState<LightboxGeometry | null>(null);
  const [closingVisual, setClosingVisual] = useState<ClosingVisualState | null>(null);
  const [phase, setPhase] = useState<LightboxPhase>("opening");
  const [openingImageSource, setOpeningImageSource] = useState<OpeningImageSource | null>(null);
  const [animatedRadius, setAnimatedRadius] = useState(20);
  const [closingAnimatedRadius, setClosingAnimatedRadius] = useState(20);
  const [fullAssetRevision, setFullAssetRevision] = useState(0);
  const [modalVideoStartTime, setModalVideoStartTime] = useState<number | undefined>(undefined);
  const [modalVideoReady, setModalVideoReady] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [controlsReady, setControlsReady] = useState(false);
  const [caseContext, setCaseContext] = useState<LightboxContext | null>(null);
  const [pointerOverControls, setPointerOverControls] = useState(false);
  const [pointerOverActionContext, setPointerOverActionContext] = useState(false);
  const [contextInformerGate, setContextInformerGate] = useState<"close" | "informer">("close");
  const [contextInformerDimensions, setContextInformerDimensions] = useState<{ width: number; height: number } | null>(null);
  const [contextExpanded, setContextExpanded] = useState(false);
  const [contextCompactWidth, setContextCompactWidth] = useState<number | null>(null);
  const [contextCompactRadius, setContextCompactRadius] = useState<number | null>(null);
  const [contextNavigationInstant, setContextNavigationInstant] = useState(false);
  const [contextMotion, setContextMotion] = useState<LightboxContextMotionSettings>(DEFAULT_LIGHTBOX_CONTEXT_MOTION);
  const contextTitleOffsetX = useMotionValue(0);
  const contextTitleOffsetY = useMotionValue(0);
  const contextTitleProgress = useMotionValue(0);
  const contextTitleX = useTransform(
    [contextTitleProgress, contextTitleOffsetX, contextTitleOffsetY],
    ([progress, x, y]) => getContextTitleArcPoint(Number(progress), Number(x), Number(y)).x
  );
  const contextTitleY = useTransform(
    [contextTitleProgress, contextTitleOffsetX, contextTitleOffsetY],
    ([progress, x, y]) => getContextTitleArcPoint(Number(progress), Number(x), Number(y)).y
  );
  const [mobileZoomScale, setMobileZoomScale] = useState(1);
  const [mobileZoomOrigin, setMobileZoomOrigin] = useState({ x: 50, y: 50 });
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const contextInformerContentRef = useRef<HTMLSpanElement | null>(null);
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
  const shouldRestoreFocusRef = useRef(false);
  const scrollPositionRef = useRef<{ x: number; y: number } | null>(null);
  const lightboxTouchStartRef = useRef<{ x: number; y: number; onMedia: boolean } | null>(null);
  const suppressBackdropClickRef = useRef(false);
  const mobileZoomScaleRef = useRef(1);
  const pinchGestureRef = useRef<{ distance: number; scale: number } | null>(null);
  const lastImageTapRef = useRef<{ at: number; x: number; y: number } | null>(null);
  const controlsTimerRef = useRef<number | null>(null);
  const controlsRevealTimerRef = useRef<number | null>(null);
  const contextPointerInsideRef = useRef(false);
  const contextFocusInsideRef = useRef(false);
  const contextCompactSizerRef = useRef<HTMLSpanElement | null>(null);
  const contextExpandedContentRef = useRef<HTMLSpanElement | null>(null);
  const contextInstantFrameRef = useRef<number | null>(null);
  const contextMeasuredMetricsRef = useRef<{ width: number; radius: number; x: number; y: number } | null>(null);
  const closeSuppressionRegionsRef = useRef(new Set<string>());
  const pendingContextDestinationRef = useRef<LightboxContext["destination"] | null>(null);
  const thumbnailTrackRef = useRef<HTMLDivElement | null>(null);
  const thumbnailOccupiedRegionRef = useRef<HTMLDivElement | null>(null);
  const thumbnailRefs = useRef(new Map<number, HTMLButtonElement | null>());
  const thumbnailCenterAnimationFrameRef = useRef<number | null>(null);
  const thumbnailProgrammaticReleaseFrameRef = useRef<number | null>(null);
  const thumbnailScrollFrameRef = useRef<number | null>(null);
  const thumbnailScrollEndTimerRef = useRef<number | null>(null);
  const skipThumbnailCenteringIndexRef = useRef<number | null>(null);
  const thumbnailTouchActiveRef = useRef(false);
  const programmaticThumbnailScrollRef = useRef(false);
  const [isThumbnailCentering, setIsThumbnailCentering] = useState(false);
  const activeIndexRef = useRef<number | null>(null);
  const navigationTargetIndexRef = useRef<number | null>(null);
  const navigationRequestRevisionRef = useRef(0);
  const prefersReducedMotion = useReducedMotion();
  const previousNavigationPressControls = useAnimationControls();
  const nextNavigationPressControls = useAnimationControls();
  const navigationPressRevisionRef = useRef({ previous: 0, next: 0 });
  const pointerX = useSpring(0, { stiffness: 260, damping: 19, mass: 1.35 });
  const pointerY = useSpring(0, { stiffness: 260, damping: 19, mass: 1.35 });
  const informerPointerX = useSpring(0, {
    stiffness: contextMotion.informerStiffness,
    damping: contextMotion.informerDamping,
    mass: contextMotion.informerMass
  });
  const informerPointerY = useSpring(0, {
    stiffness: contextMotion.informerStiffness,
    damping: contextMotion.informerDamping,
    mass: contextMotion.informerMass
  });

  const updateCloseSuppression = useCallback((region: string, active: boolean) => {
    const regions = closeSuppressionRegionsRef.current;
    if (active) {
      regions.add(region);
      if (controlsTimerRef.current !== null) {
        window.clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = null;
      }
      setControlsVisible(true);
    } else {
      regions.delete(region);
    }
    setPointerOverControls(regions.size > 0);
  }, []);

  const clearCloseSuppression = useCallback(() => {
    closeSuppressionRegionsRef.current.clear();
    setPointerOverControls(false);
    setPointerOverActionContext(false);
  }, []);
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

  const registerWithScope = galleryScope?.register;

  useLayoutEffect(() => {
    if (!registerWithScope) {
      return undefined;
    }

    return registerWithScope({
      id: registrationId,
      items,
      triggerRefs,
      mediaRefs: triggerMediaRefs
    });
  }, [items, registerWithScope, registrationId]);

  const scopedItems = useMemo<ScopedItemEntry[]>(() => {
    const registrations = galleryScope?.registrations ?? [{ id: registrationId, items }];

    return registrations.flatMap((registration) => registration.items.flatMap((item, localIndex) =>
      item.openable === false ? [] : [{ item, localIndex, registrationId: registration.id }]
    ));
  }, [galleryScope?.registrations, items, registrationId]);

  const activeEntry = activeIndex === null ? null : scopedItems[activeIndex] ?? null;
  const galleryItems = useMemo(() => scopedItems.map((entry) => entry.item), [scopedItems]);

  const getRegistration = useCallback((id: string) => {
    if (!galleryScope) {
      return id === registrationId ? { id: registrationId, items, triggerRefs, mediaRefs: triggerMediaRefs } : null;
    }

    return galleryScope.getRegistration(id);
  }, [galleryScope, items, registrationId]);

  const getGlobalIndex = useCallback((localIndex: number) => scopedItems.findIndex((entry) =>
    entry.registrationId === registrationId && entry.localIndex === localIndex
  ), [registrationId, scopedItems]);

  const activeItem = activeEntry?.item ?? null;
  const holdContextInstant = useCallback(() => {
    if (contextInstantFrameRef.current !== null) window.cancelAnimationFrame(contextInstantFrameRef.current);
    setContextNavigationInstant(true);
    contextInstantFrameRef.current = window.requestAnimationFrame(() => {
      contextInstantFrameRef.current = window.requestAnimationFrame(() => {
        contextInstantFrameRef.current = null;
        setContextNavigationInstant(false);
      });
    });
  }, []);
  const updateCaseContext = useCallback((index: number) => {
    holdContextInstant();
    const entry = scopedItems[index];
    const trigger = entry ? getRegistration(entry.registrationId)?.triggerRefs.current.get(entry.localIndex) : null;
    if (!isMobileViewport) setContextExpanded(contextPointerInsideRef.current || contextFocusInsideRef.current);
    setCaseContext(trigger ? getLightboxContext(trigger, { caption: entry.item.caption }) : null);
  }, [getRegistration, holdContextInstant, isMobileViewport, scopedItems]);
  const measureContextCompactWidth = useCallback(() => {
    const sizer = contextCompactSizerRef.current;
    const rect = sizer?.getBoundingClientRect();
    if (!rect || !sizer) return;
    const expandedContent = contextExpandedContentRef.current;
    const previous = contextMeasuredMetricsRef.current;
    let x = previous?.x ?? 0;
    let y = previous?.y ?? 0;
    if (expandedContent) {
      const compactStyle = getComputedStyle(sizer);
      const expandedStyle = getComputedStyle(expandedContent);
      const expandedRect = expandedContent.getBoundingClientRect();
      x = rect.left + parseFloat(compactStyle.paddingLeft) + parseFloat(compactStyle.borderLeftWidth)
        - expandedRect.left - parseFloat(expandedStyle.paddingLeft);
      y = rect.top + parseFloat(compactStyle.paddingTop) + parseFloat(compactStyle.borderTopWidth)
        - expandedRect.top - parseFloat(expandedStyle.paddingTop);
      if (isMobileViewport) {
        // Both layers are bottom anchored. Use their intrinsic sizes rather
        // than the glass's in-flight animated bounds when measuring the arc.
        const cardStyle = expandedContent.closest('[data-lightbox-context-card="true"]');
        const bottomBorder = cardStyle ? parseFloat(getComputedStyle(cardStyle).borderBottomWidth) : 0;
        x = (expandedContent.offsetWidth - rect.width) / 2
          + parseFloat(compactStyle.paddingLeft) + parseFloat(compactStyle.borderLeftWidth)
          - parseFloat(expandedStyle.paddingLeft);
        y = expandedContent.offsetHeight - rect.height + bottomBorder
          + parseFloat(compactStyle.paddingTop) + parseFloat(compactStyle.borderTopWidth)
          - parseFloat(expandedStyle.paddingTop);
      }
    }
    const next = { width: rect.width, radius: rect.height / 2, x, y };
    if (previous
      && Math.abs(next.width - previous.width) < 0.25
      && Math.abs(next.radius - previous.radius) < 0.25
      && Math.abs(next.x - previous.x) < 0.25
      && Math.abs(next.y - previous.y) < 0.25) return;
    contextMeasuredMetricsRef.current = next;
    holdContextInstant();
    if (rect.width) setContextCompactWidth(next.width);
    if (rect.height) setContextCompactRadius(next.radius);
    contextTitleOffsetX.set(next.x);
    contextTitleOffsetY.set(next.y);
  }, [contextTitleOffsetX, contextTitleOffsetY, holdContextInstant, isMobileViewport]);
  const attachContextCompactSizer = useCallback((node: HTMLSpanElement | null) => {
    contextCompactSizerRef.current = node;
    if (node) queueMicrotask(measureContextCompactWidth);
  }, [measureContextCompactWidth]);
  useLayoutEffect(() => {
    const sizer = contextCompactSizerRef.current;
    if (!sizer || !caseContext?.action) return undefined;
    const observer = new ResizeObserver(measureContextCompactWidth);
    observer.observe(sizer);
    queueMicrotask(measureContextCompactWidth);
    return () => {
      observer.disconnect();
    };
  }, [caseContext?.action, caseContext?.title, contextCompactWidth, measureContextCompactWidth]);
  useEffect(() => () => {
    if (contextInstantFrameRef.current !== null) window.cancelAnimationFrame(contextInstantFrameRef.current);
  }, []);
  const contextDebugEnabled = typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("lightboxDebug") === "1";
  const contextResizeSpring = {
    type: "spring" as const,
    stiffness: contextMotion.resizeStiffness,
    damping: contextMotion.resizeDamping,
    mass: contextMotion.resizeMass
  };
  const floatingCloseOpacityTransition = {
    type: "tween" as const,
    duration: 0.44,
    delay: 0.08,
    ease: [0.22, 1, 0.36, 1] as const
  };
  useLayoutEffect(() => {
    const target = contextExpanded ? 1 : 0;
    if (prefersReducedMotion || contextNavigationInstant) {
      contextTitleProgress.jump(target);
      return;
    }
    const animation = animate(contextTitleProgress, target, {
      type: "spring",
      stiffness: contextMotion.resizeStiffness,
      damping: contextMotion.resizeDamping,
      mass: contextMotion.resizeMass * 0.9
    });
    return () => animation.stop();
  }, [
    contextExpanded,
    contextMotion.resizeDamping,
    contextMotion.resizeMass,
    contextMotion.resizeStiffness,
    contextNavigationInstant,
    contextTitleProgress,
    prefersReducedMotion
  ]);
  const contextTitleTransition = prefersReducedMotion || contextNavigationInstant
    ? { duration: 0 }
    : {
        x: { type: "tween" as const, duration: 0.32, ease: "easeOut" as const },
        y: contextResizeSpring
      };
  const portalTarget = typeof document === "undefined" ? null : document.documentElement;
  const closingSourceIndex = closingVisual?.sourceIndex ?? null;
  const hasActiveMedia = activeIndex !== null;
  const openingGeometryComplete = Boolean(prefersReducedMotion) || phase === "open";
  const isLightboxMounted = activeIndex !== null || closingVisual !== null;
  const isVideoClosing = Boolean(
    closingVisual && activeItem?.kind === "video" && closingVisual.sourceIndex === activeIndex
  );
  const floatingCloseVisible = Boolean(
    controlsReady && controlsVisible && !isVideoClosing &&
    !pointerOverControls && contextInformerGate === "close"
  );
  const wantsContextInformer = Boolean(
    canTrackPointer && caseContext?.action && pointerOverActionContext &&
    controlsReady && controlsVisible && !isVideoClosing
  );
  const wantsContextInformerRef = useRef(wantsContextInformer);
  useLayoutEffect(() => {
    const content = contextInformerContentRef.current;
    if (!content || !canTrackPointer || !caseContext?.action) return undefined;

    const measure = () => {
      const width = content.offsetWidth;
      const height = content.offsetHeight;
      if (!width || !height) return;
      setContextInformerDimensions((current) => current
        && current.width === width
        && current.height === height
          ? current
          : { width, height });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    measure();
    return () => observer.disconnect();
  }, [canTrackPointer, caseContext?.action]);
  useLayoutEffect(() => {
    wantsContextInformerRef.current = wantsContextInformer;
    if (!canTrackPointer || !caseContext?.action) {
      setContextInformerGate("close");
      return;
    }
    if (wantsContextInformer && contextInformerGate === "close" && closeButtonRef.current
      && Number.parseFloat(window.getComputedStyle(closeButtonRef.current).opacity) === 0) {
      setContextInformerGate("informer");
    }
  }, [canTrackPointer, caseContext?.action, contextInformerGate, wantsContextInformer]);

  const isFullImageReady = useCallback((item: GalleryMediaItem | null) => {
    return Boolean(item?.kind === "image" && item.fullSrc && preloadedImageSources.has(item.fullSrc));
  }, []);

  const activeModalItem = useMemo(() => {
    const revision = fullAssetRevision;
    void revision;

    if (!activeItem || activeItem.kind !== "image" || !activeItem.fullSrc) {
      return activeItem;
    }

    if (!isFullImageReady(activeItem) || phase !== "open") {
      return {
        ...activeItem,
        fullSrc: undefined,
        fullIntrinsicWidth: undefined,
        fullIntrinsicHeight: undefined
      } satisfies GalleryMediaItem;
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

  const mediaTargetRect = geometry && isMobileViewport && activeModalItem?.kind === "image"
    ? {
        x: geometry.targetRect.x - geometry.targetRect.width * (mobileZoomOrigin.x / 100) * (mobileZoomScale - 1),
        y: geometry.targetRect.y - geometry.targetRect.height * (mobileZoomOrigin.y / 100) * (mobileZoomScale - 1),
        width: geometry.targetRect.width * mobileZoomScale,
        height: geometry.targetRect.height * mobileZoomScale
      }
    : geometry?.targetRect;

  const updateMobileZoom = useCallback((scale: number) => {
    const nextScale = Math.min(MOBILE_ZOOM_MAX, Math.max(1, scale));
    mobileZoomScaleRef.current = nextScale;
    setMobileZoomScale(nextScale);
  }, []);

  const updateMobileZoomOrigin = useCallback((clientX: number, clientY: number) => {
    const media = activeModalMediaRef.current;
    if (!media) {
      return;
    }
    const rect = media.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }
    setMobileZoomOrigin({
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
    });
  }, []);

  const resetControlsReveal = useCallback(() => {
    if (controlsRevealTimerRef.current !== null) {
      window.clearTimeout(controlsRevealTimerRef.current);
      controlsRevealTimerRef.current = null;
    }
    setControlsReady(false);
  }, []);

  const completeClose = useCallback(() => {
    clearCloseSuppression();
    setContextInformerGate("close");
    resetControlsReveal();
    contextPointerInsideRef.current = false;
    contextFocusInsideRef.current = false;
    setContextExpanded(false);
    setCaseContext(null);
    setGeometry(null);
    setActiveIndex(null);
    activeIndexRef.current = null;
    navigationTargetIndexRef.current = null;
    navigationRequestRevisionRef.current += 1;
    setIsThumbnailCentering(false);
    setPhase("opening");
    setOpeningImageSource(null);
    setAnimatedRadius(20);
    setModalVideoStartTime(undefined);
    setModalVideoReady(false);
    openingVideoSourceRef.current = null;
    updateMobileZoom(1);
    setMobileZoomOrigin({ x: 50, y: 50 });
    pinchGestureRef.current = null;
  }, [clearCloseSuppression, resetControlsReveal, updateMobileZoom]);

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
    const entry = scopedItems[index];
    const registration = entry ? getRegistration(entry.registrationId) : null;
    const triggerMedia = entry ? registration?.mediaRefs.current.get(entry.localIndex) : null;
    if (triggerMedia) {
      return toRect(triggerMedia.getBoundingClientRect());
    }

    const trigger = entry ? registration?.triggerRefs.current.get(entry.localIndex) : null;
    if (!trigger) {
      return null;
    }

    return toRect(trigger.getBoundingClientRect());
  }, [getRegistration, scopedItems]);

  const getCurrentSourceRadius = useCallback((index: number) => {
    const entry = scopedItems[index];
    const registration = entry ? getRegistration(entry.registrationId) : null;
    const sourceMedia = entry ? registration?.mediaRefs.current.get(entry.localIndex) : null;
    if (!sourceMedia) {
      return 0;
    }

    return Number.parseFloat(window.getComputedStyle(sourceMedia).borderTopLeftRadius) || 0;
  }, [getRegistration, scopedItems]);

  const close = useCallback(() => {
    clearCloseSuppression();
    resetControlsReveal();
    if (prefersReducedMotion) {
      completeClose();
      return;
    }

    let displayedItem = phase === "open" ? activeModalItem : openingModalItem ?? activeModalItem;
    if (displayedItem && displayedItem.kind !== "video") {
      const presentedImage = activeModalMediaRef.current?.querySelector<HTMLImageElement>('img[data-lightbox-image-active="true"]');
      if (!presentedImage) {
        completeClose();
        return;
      }
      displayedItem = {
        ...displayedItem,
        src: presentedImage.currentSrc || presentedImage.src,
        fullSrc: undefined,
        intrinsicWidth: presentedImage.naturalWidth,
        intrinsicHeight: presentedImage.naturalHeight,
        fullIntrinsicWidth: undefined,
        fullIntrinsicHeight: undefined
      };
    }

    if (activeIndex !== null && displayedItem && geometry) {
      if (displayedItem.kind === "video") {
        const activeRegistration = activeEntry ? getRegistration(activeEntry.registrationId) : null;
        const triggerVideo = activeEntry ? activeRegistration?.mediaRefs.current.get(activeEntry.localIndex)?.querySelector("video") : null;
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

      const sourceRect = getCurrentSourceRect(activeIndex);
      const canReturnToSource = Boolean(sourceRect && isRectVisible(sourceRect));
      const fallbackRect = phase === "open" ? mediaTargetRect ?? geometry.targetRect : activeVisualRectRef.current ?? geometry.targetRect;

      setClosingVisual({
        item: displayedItem,
        sourceIndex: activeIndex,
        targetRect: canReturnToSource && sourceRect ? sourceRect : fallbackRect,
        visualRect: fallbackRect,
        accumulatedScroll: 0,
        interrupted: false,
        forceDissolve: !canReturnToSource,
        lastScrollX: window.scrollX,
        lastScrollY: window.scrollY,
        startedAt: performance.now(),
        closeButtonFloating: canTrackPointer,
        closeButtonPosition: lastPointerPositionRef.current,
        sourceRadius: geometry.sourceRadius
      });
      setClosingAnimatedRadius(animatedRadius);
      closingVisualRectRef.current = fallbackRect;
    }

    if (displayedItem?.kind !== "video") {
      completeClose();
    }
  }, [
    activeIndex,
    activeEntry,
    activeModalItem,
    animatedRadius,
    canTrackPointer,
    clearCloseSuppression,
    completeClose,
    geometry,
    getCurrentSourceRect,
    getRegistration,
    mediaTargetRect,
    openingModalItem,
    phase,
    prefersReducedMotion,
    resetControlsReveal
  ]);

  const showControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimerRef.current !== null) {
      window.clearTimeout(controlsTimerRef.current);
    }
    if (contextPointerInsideRef.current || contextFocusInsideRef.current) {
      controlsTimerRef.current = null;
      return;
    }
    controlsTimerRef.current = window.setTimeout(() => {
      controlsTimerRef.current = null;
      if (contextPointerInsideRef.current || contextFocusInsideRef.current) return;
      setControlsVisible(false);
    }, 1000);
  }, []);

  useEffect(() => {
    if (!hasActiveMedia || isVideoClosing || controlsReady || !openingGeometryComplete) {
      return undefined;
    }

    // The opening gate belongs to the session, so media switches and pointer
    // activity cannot restart it or reveal controls before the geometry settles.
    controlsRevealTimerRef.current = window.setTimeout(() => {
      controlsRevealTimerRef.current = null;
      setControlsReady(true);
      showControlsTemporarily();
    }, 120);

    return () => {
      if (controlsRevealTimerRef.current !== null) {
        window.clearTimeout(controlsRevealTimerRef.current);
        controlsRevealTimerRef.current = null;
      }
    };
  }, [controlsReady, hasActiveMedia, isVideoClosing, openingGeometryComplete, showControlsTemporarily]);

  const centerThumbnail = useCallback((index: number) => {
    const track = thumbnailTrackRef.current;
    const occupiedRegion = thumbnailOccupiedRegionRef.current;
    const thumbnail = thumbnailRefs.current.get(index);
    if (!track || !occupiedRegion || !thumbnail) {
      return;
    }

    track.scrollLeft = occupiedRegion.offsetLeft + thumbnail.offsetLeft + thumbnail.offsetWidth / 2 - track.clientWidth / 2;
  }, []);

  const playNavigationPress = useCallback(async (direction: "previous" | "next") => {
    if (prefersReducedMotion) {
      return;
    }

    const controls = direction === "previous" ? previousNavigationPressControls : nextNavigationPressControls;
    const revision = navigationPressRevisionRef.current[direction] + 1;
    navigationPressRevisionRef.current[direction] = revision;
    controls.stop();
    controls.set({ scale: 1 });
    await controls.start({
      scale: 1.12,
      transition: { duration: 0.12, ease: [0.22, 1, 0.36, 1] }
    });

    if (navigationPressRevisionRef.current[direction] !== revision) {
      return;
    }

    await controls.start({
      scale: 1,
      transition: { type: "spring", stiffness: 260, damping: 24, mass: 0.85 }
    });
  }, [nextNavigationPressControls, prefersReducedMotion, previousNavigationPressControls]);

  const navigateTo = useCallback((nextIndex: number, options?: { centerThumbnail?: boolean }) => {
    const displayedIndex = activeIndexRef.current;
    if (phase !== "open" || displayedIndex === null || nextIndex < 0 || nextIndex >= galleryItems.length) {
      return;
    }

    navigationTargetIndexRef.current = nextIndex;
    navigationRequestRevisionRef.current += 1;

    if (nextIndex === displayedIndex) {
      return;
    }

    const nextItem = galleryItems[nextIndex];
    // Selection is synchronous. The actual image layers handle readiness;
    // a cold target stays empty without holding the previous image on screen.

    const shouldCenterThumbnail = options?.centerThumbnail !== false;
    if (shouldCenterThumbnail && !prefersReducedMotion) {
      setIsThumbnailCentering(true);
    } else {
      skipThumbnailCenteringIndexRef.current = nextIndex;
      setIsThumbnailCentering(false);
    }
    activeIndexRef.current = nextIndex;
    navigationTargetIndexRef.current = nextIndex;
    setOpeningImageSource(null);
    updateMobileZoom(1);
    setMobileZoomOrigin({ x: 50, y: 50 });
    pinchGestureRef.current = null;
    lastImageTapRef.current = null;
    videoSyncRevisionRef.current += 1;
    setPhase("open");
    setAnimatedRadius(40);
    setGeometry((current) => current ? {
      ...current,
      sourceRadius: getCurrentSourceRadius(nextIndex),
      targetRect: getModalTargetRect(nextItem)
    } : current);
    setModalVideoStartTime(undefined);
    setModalVideoReady(nextItem.kind !== "video");
    openingVideoSourceRef.current = null;
    updateCaseContext(nextIndex);
    setActiveIndex(nextIndex);
  }, [galleryItems, getCurrentSourceRadius, phase, prefersReducedMotion, updateCaseContext, updateMobileZoom]);

  const navigateBy = useCallback((delta: -1 | 1) => {
    const currentIndex = navigationTargetIndexRef.current ?? activeIndexRef.current;
    if (currentIndex === null) {
      return;
    }
    navigateTo(currentIndex + delta);
  }, [navigateTo]);

  const getNearestThumbnailIndex = useCallback(() => {
    const track = thumbnailTrackRef.current;
    if (!track) {
      return null;
    }

    const center = track.scrollLeft + track.clientWidth / 2;
    let nearestIndex: number | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    thumbnailRefs.current.forEach((thumbnail, index) => {
      if (!thumbnail) {
        return;
      }
      const occupiedOffset = thumbnailOccupiedRegionRef.current?.offsetLeft ?? 0;
      const distance = Math.abs(occupiedOffset + thumbnail.offsetLeft + thumbnail.offsetWidth / 2 - center);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    return nearestIndex;
  }, []);

  const settleMobileThumbnailScroll = useCallback(() => {
    if (thumbnailScrollEndTimerRef.current !== null) {
      window.clearTimeout(thumbnailScrollEndTimerRef.current);
    }
    thumbnailScrollEndTimerRef.current = window.setTimeout(() => {
      thumbnailScrollEndTimerRef.current = null;
      if (thumbnailTouchActiveRef.current || programmaticThumbnailScrollRef.current) {
        return;
      }
      const nearestIndex = getNearestThumbnailIndex();
      if (nearestIndex !== null && nearestIndex !== activeIndexRef.current) {
        navigateTo(nearestIndex, { centerThumbnail: false });
      }
    }, 140);
  }, [getNearestThumbnailIndex, navigateTo]);

  useEffect(() => () => {
    if (controlsTimerRef.current !== null) {
      window.clearTimeout(controlsTimerRef.current);
    }
    if (thumbnailCenterAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(thumbnailCenterAnimationFrameRef.current);
    }
    if (thumbnailProgrammaticReleaseFrameRef.current !== null) {
      window.cancelAnimationFrame(thumbnailProgrammaticReleaseFrameRef.current);
    }
    if (thumbnailScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(thumbnailScrollFrameRef.current);
    }
    if (thumbnailScrollEndTimerRef.current !== null) {
      window.clearTimeout(thumbnailScrollEndTimerRef.current);
    }
  }, []);

  useLayoutEffect(() => {
    if (activeIndex === null || galleryItems.length <= 1) {
      return undefined;
    }

    if (skipThumbnailCenteringIndexRef.current === activeIndex) {
      skipThumbnailCenteringIndexRef.current = null;
      programmaticThumbnailScrollRef.current = false;
      return undefined;
    }

    if (thumbnailCenterAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(thumbnailCenterAnimationFrameRef.current);
      thumbnailCenterAnimationFrameRef.current = null;
    }
    if (thumbnailProgrammaticReleaseFrameRef.current !== null) {
      window.cancelAnimationFrame(thumbnailProgrammaticReleaseFrameRef.current);
      thumbnailProgrammaticReleaseFrameRef.current = null;
    }
    programmaticThumbnailScrollRef.current = true;

    if (prefersReducedMotion) {
      centerThumbnail(activeIndex);
      thumbnailProgrammaticReleaseFrameRef.current = window.requestAnimationFrame(() => {
        programmaticThumbnailScrollRef.current = false;
        thumbnailProgrammaticReleaseFrameRef.current = null;
      });
      return undefined;
    }

    const track = thumbnailTrackRef.current;
    const thumbnail = thumbnailRefs.current.get(activeIndex);
    if (!track || !thumbnail) {
      programmaticThumbnailScrollRef.current = false;
      return undefined;
    }

    const startedAt = performance.now();
    const startScrollLeft = track.scrollLeft;
    const travelDuration = THUMBNAIL_TRANSITION_DURATION_MS;
    const followThumbnail = (timestamp: number) => {
      const elapsed = timestamp - startedAt;
      const progress = Math.min(elapsed / travelDuration, 1);
      const easedProgress = getThumbnailTransitionProgress(progress);
      const occupiedOffset = thumbnailOccupiedRegionRef.current?.offsetLeft ?? 0;
      const liveTarget = occupiedOffset + thumbnail.offsetLeft + thumbnail.offsetWidth / 2 - track.clientWidth / 2;
      track.scrollLeft = startScrollLeft + (liveTarget - startScrollLeft) * easedProgress;

      if (elapsed < Math.max(travelDuration, THUMBNAIL_TRANSITION_DURATION_MS)) {
        thumbnailCenterAnimationFrameRef.current = window.requestAnimationFrame(followThumbnail);
        return;
      }

      thumbnailCenterAnimationFrameRef.current = null;
      track.scrollLeft = occupiedOffset + thumbnail.offsetLeft + thumbnail.offsetWidth / 2 - track.clientWidth / 2;
      setIsThumbnailCentering(false);
      thumbnailProgrammaticReleaseFrameRef.current = window.requestAnimationFrame(() => {
        programmaticThumbnailScrollRef.current = false;
        thumbnailProgrammaticReleaseFrameRef.current = null;
      });
    };

    thumbnailCenterAnimationFrameRef.current = window.requestAnimationFrame(followThumbnail);

    return () => {
      if (thumbnailCenterAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(thumbnailCenterAnimationFrameRef.current);
        thumbnailCenterAnimationFrameRef.current = null;
      }
    };
  }, [activeIndex, centerThumbnail, galleryItems, prefersReducedMotion]);

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
    if (!isLightboxMounted) {
      return undefined;
    }

    const root = document.documentElement;
    const body = document.body;
    const previousBodyWidth = body.getBoundingClientRect().width;
    const previousRootOverflow = root.style.overflow;
    const previousRootScrollbarGutter = root.style.scrollbarGutter;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPaddingRight = body.style.paddingRight;
    const computedBodyPaddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;

    root.style.scrollbarGutter = "auto";
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    // A stable gutter can reserve space even when the page has no scrollbar.
    const bodyWidthExpansion = Math.max(0, body.getBoundingClientRect().width - previousBodyWidth);
    if (bodyWidthExpansion > 0) {
      body.style.paddingRight = `${computedBodyPaddingRight + bodyWidthExpansion}px`;
    }

    return () => {
      root.style.overflow = previousRootOverflow;
      root.style.scrollbarGutter = previousRootScrollbarGutter;
      body.style.overflow = previousBodyOverflow;
      body.style.paddingRight = previousBodyPaddingRight;
    };
  }, [isLightboxMounted]);

  useEffect(() => {
    if (!isLightboxMounted) {
      return undefined;
    }

    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    scrollPositionRef.current = { x: window.scrollX, y: window.scrollY };

    const frame = window.requestAnimationFrame(() => {
      const initialPointerPosition = lastPointerPositionRef.current ?? {
        x: document.documentElement.clientWidth / 2,
        y: window.innerHeight / 2
      };

      pointerX.jump(initialPointerPosition.x);
      pointerY.jump(initialPointerPosition.y);
      informerPointerX.jump(initialPointerPosition.x);
      informerPointerY.jump(initialPointerPosition.y);

      if (canTrackPointer) {
        focusWithoutScroll(dialogRef.current);
        return;
      }

      focusWithoutScroll(closeButtonRef.current);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      if (pendingContextDestinationRef.current) return;
      if (shouldRestoreFocusRef.current) {
        focusWithoutScroll(restoreFocusRef.current);
      }
      const position = scrollPositionRef.current;
      if (position) window.scrollTo(position.x, position.y);
    };
  }, [isLightboxMounted, canTrackPointer, pointerX, pointerY, informerPointerX, informerPointerY]);

  useEffect(() => {
    if (isLightboxMounted || !pendingContextDestinationRef.current) return;
    const destination = pendingContextDestinationRef.current;
    pendingContextDestinationRef.current = null;
    const frame = window.requestAnimationFrame(() => {
      if (destination.kind === "page-top") {
        window.scrollTo({
          top: 0,
          behavior: prefersReducedMotion ? "instant" : "smooth"
        });
        return;
      }
      const { target } = destination;
      if (!target.isConnected) return;
      const hadTabIndex = target.hasAttribute("tabindex");
      if (!hadTabIndex) target.tabIndex = -1;
      focusWithoutScroll(target);
      if (!hadTabIndex) target.removeAttribute("tabindex");
      window.scrollTo({
        top: Math.max(0, window.scrollY + target.getBoundingClientRect().top - window.innerHeight * 0.25),
        behavior: prefersReducedMotion ? "instant" : "smooth"
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isLightboxMounted, prefersReducedMotion]);

  useEffect(() => {
    if (!hasActiveMedia) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        shouldRestoreFocusRef.current = false;
        navigateBy(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        shouldRestoreFocusRef.current = false;
        navigateBy(1);
      } else if (event.key === "Tab") {
        shouldRestoreFocusRef.current = true;
        showControlsTemporarily();
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
      informerPointerX.set(event.clientX);
      informerPointerY.set(event.clientY);
      showControlsTemporarily();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [hasActiveMedia, canTrackPointer, close, navigateBy, pointerX, pointerY, informerPointerX, informerPointerY, showControlsTemporarily]);

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

    const preloadableItems = galleryItems.filter((item) => item.kind === "image" && item.fullSrc);
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
  }, [galleryItems]);

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
        data-lightbox-gallery=""
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
              const globalIndex = getGlobalIndex(absoluteIndex);
              const isActiveTrigger = globalIndex >= 0 && activeIndex === globalIndex;
              const isClosingSourceTrigger = globalIndex >= 0 && closingSourceIndex === globalIndex;
              const isClosingHandoffTrigger = isClosingSourceTrigger && closingVisual?.forceDissolve;

              return (
                <MdxMediaBlock key={`gallery-item-${rowIndex}-${itemIndex}`} className={styles.item}>
                  {item.openable === false ? (
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
                        shouldRestoreFocusRef.current = event.detail === 0;
                        resetControlsReveal();
                        pendingContextDestinationRef.current = null;
                        contextPointerInsideRef.current = false;
                        contextFocusInsideRef.current = false;
                        contextMeasuredMetricsRef.current = null;
                        setContextCompactWidth(null);
                        setContextCompactRadius(null);
                        contextTitleOffsetX.set(0);
                        contextTitleOffsetY.set(0);
                        clearCloseSuppression();
                        videoSyncRevisionRef.current += 1;
                        const nextPointerPosition = { x: event.clientX, y: event.clientY };
                        const sourceRect = getCurrentSourceRect(globalIndex) ?? toRect(event.currentTarget.getBoundingClientRect());
                        const sourceVideo = triggerMediaRefs.current.get(absoluteIndex)?.querySelector("video");
                        const sourceImage = item.kind === "image"
                          ? triggerMediaRefs.current.get(absoluteIndex)?.querySelector("img")
                          : null;
                        setOpeningImageSource(sourceImage?.complete && sourceImage.naturalWidth > 0
                          ? {
                              index: globalIndex,
                              src: sourceImage.currentSrc || sourceImage.src,
                              width: sourceImage.naturalWidth,
                              height: sourceImage.naturalHeight
                            }
                          : null);
                        lastPointerPositionRef.current = nextPointerPosition;
                        setClosingVisual(null);
                        setClosingAnimatedRadius(20);
                        setGeometry({
                          sourceRect,
                          sourceRadius: getCurrentSourceRadius(globalIndex),
                          targetRect: getModalTargetRect(item)
                        });
                        updateMobileZoom(1);
                        setMobileZoomOrigin({ x: 50, y: 50 });
                        setPhase(prefersReducedMotion ? "open" : "opening");
                        setAnimatedRadius(prefersReducedMotion ? 40 : 20);
                        setModalVideoStartTime(sourceVideo?.currentTime);
                        setModalVideoReady(item.kind !== "video");
                        openingVideoSourceRef.current = item.kind === "video" ? sourceVideo ?? null : null;
                        showControlsTemporarily();
                        if (!prefersReducedMotion) {
                          setIsThumbnailCentering(true);
                        }
                        navigationRequestRevisionRef.current += 1;
                        navigationTargetIndexRef.current = globalIndex;
                        activeIndexRef.current = globalIndex;
                        updateCaseContext(globalIndex);
                        setActiveIndex(globalIndex);
                        trackMetricaGoal("image_fullscreen_open", {
                          page_path: getCurrentPath(),
                          image_index: globalIndex + 1,
                          media_kind: item.kind,
                          gallery_variant: variant
                        });
                      }}
                      aria-haspopup="dialog"
                      aria-label={getMediaOpenLabel(item, globalIndex)}
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

      {portalTarget && activeModalItem && geometry && activeIndex !== null
        ? createPortal(
            <div
              className={[styles.backdrop, canTrackPointer && styles.backdropTracked].filter(Boolean).join(" ")}
              style={isVideoClosing ? { pointerEvents: "none" } : undefined}
              onClick={(event) => {
                if (suppressBackdropClickRef.current) {
                  suppressBackdropClickRef.current = false;
                  return;
                }
                if (isMobileViewport && contextExpanded) {
                  contextFocusInsideRef.current = false;
                  setContextExpanded(false);
                  return;
                }
                close();
              }}
              onTouchStart={(event) => {
                if (!isMobileViewport) {
                  lightboxTouchStartRef.current = null;
                  return;
                }

                const onMedia = event.target instanceof Element
                  && Boolean(event.target.closest('[data-lightbox-media="true"]'));
                if (activeModalItem.kind === "image" && onMedia && event.touches.length === 2) {
                  const firstTouch = event.touches[0];
                  const secondTouch = event.touches[1];
                  pinchGestureRef.current = {
                    distance: getTouchDistance(firstTouch, secondTouch),
                    scale: mobileZoomScaleRef.current
                  };
                  updateMobileZoomOrigin(
                    (firstTouch.clientX + secondTouch.clientX) / 2,
                    (firstTouch.clientY + secondTouch.clientY) / 2
                  );
                  suppressBackdropClickRef.current = true;
                  lightboxTouchStartRef.current = null;
                  return;
                }

                if (event.touches.length !== 1) {
                  lightboxTouchStartRef.current = null;
                  return;
                }
                const touch = event.touches[0];
                lightboxTouchStartRef.current = { x: touch.clientX, y: touch.clientY, onMedia };
              }}
              onTouchMove={(event) => {
                const pinch = pinchGestureRef.current;
                if (!isMobileViewport || activeModalItem.kind !== "image" || !pinch || event.touches.length !== 2) {
                  return;
                }
                const distance = getTouchDistance(event.touches[0], event.touches[1]);
                if (pinch.distance > 0) {
                  updateMobileZoom(pinch.scale * (distance / pinch.distance));
                }
              }}
              onTouchEnd={(event) => {
                if (pinchGestureRef.current) {
                  if (event.touches.length < 2) {
                    pinchGestureRef.current = null;
                  }
                  lightboxTouchStartRef.current = null;
                  suppressBackdropClickRef.current = true;
                  return;
                }

                const start = lightboxTouchStartRef.current;
                lightboxTouchStartRef.current = null;
                if (!isMobileViewport || !start || event.changedTouches.length !== 1) {
                  return;
                }

                const touch = event.changedTouches[0];
                const deltaX = touch.clientX - start.x;
                const deltaY = touch.clientY - start.y;
                const mediaBounds = activeModalMediaRef.current?.getBoundingClientRect();
                const relativeTapX = mediaBounds?.width ? (touch.clientX - mediaBounds.left) / mediaBounds.width : 0.5;
                if (
                  activeModalItem.kind === "image"
                  && start.onMedia
                  && (galleryItems.length <= 1 || (relativeTapX > 0.2 && relativeTapX < 0.8))
                  && Math.abs(deltaX) < 12
                  && Math.abs(deltaY) < 12
                ) {
                  const now = performance.now();
                  const previousTap = lastImageTapRef.current;
                  if (
                    previousTap
                    && now - previousTap.at <= 300
                    && Math.hypot(touch.clientX - previousTap.x, touch.clientY - previousTap.y) <= 32
                  ) {
                    updateMobileZoomOrigin(touch.clientX, touch.clientY);
                    updateMobileZoom(mobileZoomScaleRef.current > 1 ? 1 : 2);
                    lastImageTapRef.current = null;
                    suppressBackdropClickRef.current = true;
                    return;
                  }
                  lastImageTapRef.current = { at: now, x: touch.clientX, y: touch.clientY };
                } else {
                  lastImageTapRef.current = null;
                }

                if (mobileZoomScaleRef.current > 1) {
                  return;
                }
                if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) {
                  return;
                }

                suppressBackdropClickRef.current = true;
                navigateBy(deltaX < 0 ? 1 : -1);
              }}
              onTouchCancel={() => {
                lightboxTouchStartRef.current = null;
                pinchGestureRef.current = null;
              }}
              onPointerMove={(event) => {
                if (!canTrackPointer) {
                  return;
                }

                lastPointerPositionRef.current = { x: event.clientX, y: event.clientY };
                pointerX.set(event.clientX);
                pointerY.set(event.clientY);
              }}
              onPointerDown={showControlsTemporarily}
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

              {contextDebugEnabled && caseContext?.action ? (
                <LightboxMotionDebugPanel settings={contextMotion} onChange={setContextMotion} />
              ) : null}

              <div
                ref={dialogRef}
                className={styles.dialog}
                data-has-context={caseContext && galleryItems.length > 1 ? "true" : undefined}
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
                    onClick={(event) => {
                      event.stopPropagation();
                      close();
                    }}
                    aria-label="Close fullscreen media"
                    style={{ x: pointerX, y: pointerY }}
                    initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.75 }}
                    animate={{
                      opacity: floatingCloseVisible ? 1 : 0,
                      scale: floatingCloseVisible ? 1 : 0.75
                    }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : {
                            opacity: floatingCloseOpacityTransition,
                            scale: contextResizeSpring
                          }
                    }
                    onAnimationComplete={(definition) => {
                      if (typeof definition === "object" && "opacity" in definition && definition.opacity === 0
                        && wantsContextInformerRef.current) {
                        setContextInformerGate((current) => current === "close" ? "informer" : current);
                      }
                    }}
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
                    onClick={(event) => {
                      event.stopPropagation();
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
                        : { duration: 0.44, delay: 0.08, ease: [0.22, 1, 0.36, 1] }
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

                {canTrackPointer && caseContext?.action ? (
                  <motion.span
                    className={styles.contextInformerPositioner}
                    style={{
                      x: informerPointerX,
                      y: informerPointerY,
                      top: contextInformerDimensions ? contextInformerDimensions.height / 3 : 0
                    }}
                    aria-hidden="true"
                  >
                    <motion.span
                      className={styles.contextInformer}
                      style={{
                        height: contextInformerDimensions?.height,
                        transformOrigin: "0 0"
                      }}
                      initial={false}
                      animate={{
                        opacity: contextInformerDimensions && contextInformerGate === "informer" && wantsContextInformer ? 1 : 0,
                        scale: contextInformerDimensions && contextInformerGate === "informer" && wantsContextInformer ? 1 : 0.5,
                        width: contextInformerDimensions
                          ? contextInformerGate === "informer" && wantsContextInformer
                            ? contextInformerDimensions.width
                            : contextInformerDimensions.height
                          : 0
                      }}
                      transition={prefersReducedMotion ? { duration: 0 } : {
                        opacity: { duration: 0.44, ease: [0.22, 1, 0.36, 1] },
                        scale: contextResizeSpring,
                        width: contextResizeSpring
                      }}
                      onAnimationComplete={(definition) => {
                        if (typeof definition === "object" && "opacity" in definition && definition.opacity === 0
                          && !wantsContextInformerRef.current) {
                          setContextInformerGate((current) => current === "informer" ? "close" : current);
                        }
                      }}
                    >
                      <span ref={contextInformerContentRef} className={styles.contextInformerContent}>
                        Показать в кейсе
                      </span>
                    </motion.span>
                  </motion.span>
                ) : null}

                {galleryItems.length > 1 ? (
                  <motion.div
                    className={[styles.galleryControls, !controlsReady && styles.galleryControlsHidden]
                      .filter(Boolean)
                      .join(" ")}
                    initial={false}
                    animate={{ opacity: controlsReady && (isMobileViewport || controlsVisible) ? 1 : 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: "easeOut" }}
                    inert={!controlsReady}
                    aria-hidden={!controlsReady || undefined}
                    onFocusCapture={showControlsTemporarily}
                  >
                    {!isMobileViewport ? (
                      <>
                        <button
                          type="button"
                          className={[styles.navigationArrow, styles.navigationArrowPrevious].join(" ")}
                          disabled={phase !== "open" || activeIndex === 0}
                          aria-disabled={phase !== "open" || activeIndex === 0}
                          data-disabled={phase !== "open" || activeIndex === 0 ? "true" : undefined}
                          tabIndex={phase !== "open" || activeIndex === 0 ? -1 : undefined}
                          onPointerEnter={() => updateCloseSuppression("previous", true)}
                          onPointerLeave={() => updateCloseSuppression("previous", false)}
                          onPointerDown={(event) => {
                            if (event.pointerType !== "touch") {
                              event.preventDefault();
                            }
                            if (activeIndex !== 0) {
                              void playNavigationPress("previous");
                            }
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (activeIndex === 0) {
                              return;
                            }
                            if (event.detail === 0) {
                              void playNavigationPress("previous");
                            }
                            navigateBy(-1);
                          }}
                          aria-label="Previous media"
                        >
                          <TopCardArrow positioned={false} className={styles.navigationArrowGlyph} />
                          <span className={styles.navigationArrowActiveGlyph} aria-hidden="true">
                            <motion.span
                              className={styles.navigationArrowPressTarget}
                              initial={false}
                              animate={previousNavigationPressControls}
                            >
                              <svg className={styles.navigationArrowActiveIcon} fill="none" viewBox="0 0 36 36">
                                <ScrollArrowHead
                                  backgroundClassName={styles.navigationArrowActiveBackground}
                                  headClassName={styles.navigationArrowActiveHead}
                                />
                              </svg>
                            </motion.span>
                          </span>
                        </button>
                        <button
                          type="button"
                          className={[styles.navigationArrow, styles.navigationArrowNext].join(" ")}
                          disabled={phase !== "open" || activeIndex === galleryItems.length - 1}
                          aria-disabled={phase !== "open" || activeIndex === galleryItems.length - 1}
                          data-disabled={phase !== "open" || activeIndex === galleryItems.length - 1 ? "true" : undefined}
                          tabIndex={phase !== "open" || activeIndex === galleryItems.length - 1 ? -1 : undefined}
                          onPointerEnter={() => updateCloseSuppression("next", true)}
                          onPointerLeave={() => updateCloseSuppression("next", false)}
                          onPointerDown={(event) => {
                            if (event.pointerType !== "touch") {
                              event.preventDefault();
                            }
                            if (activeIndex !== galleryItems.length - 1) {
                              void playNavigationPress("next");
                            }
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (activeIndex === galleryItems.length - 1) {
                              return;
                            }
                            if (event.detail === 0) {
                              void playNavigationPress("next");
                            }
                            navigateBy(1);
                          }}
                          aria-label="Next media"
                        >
                          <TopCardArrow positioned={false} className={styles.navigationArrowGlyph} />
                          <span className={styles.navigationArrowActiveGlyph} aria-hidden="true">
                            <motion.span
                              className={styles.navigationArrowPressTarget}
                              initial={false}
                              animate={nextNavigationPressControls}
                            >
                              <svg className={styles.navigationArrowActiveIcon} fill="none" viewBox="0 0 36 36">
                                <ScrollArrowHead
                                  backgroundClassName={styles.navigationArrowActiveBackground}
                                  headClassName={styles.navigationArrowActiveHead}
                                />
                              </svg>
                            </motion.span>
                          </span>
                        </button>
                      </>
                    ) : null}
                    <div className={styles.thumbnailBackdrop} aria-hidden="true" />
                    <div
                      ref={thumbnailTrackRef}
                      className={styles.thumbnailTrack}
                      style={{
                        ["--thumbnail-first-slot-ratio" as string]: activeIndex === 0 ? getMediaRatio(galleryItems[0]) : 1,
                        ["--thumbnail-last-slot-ratio" as string]: activeIndex === galleryItems.length - 1
                          ? getMediaRatio(galleryItems[galleryItems.length - 1])
                          : 1,
                        ["--thumbnail-transition-duration" as string]: `${THUMBNAIL_TRANSITION_DURATION_MS}ms`
                      } as CSSProperties}
                      data-centering={isThumbnailCentering ? "true" : undefined}
                      onTouchStart={(event) => {
                        event.stopPropagation();
                        thumbnailTouchActiveRef.current = true;
                        programmaticThumbnailScrollRef.current = false;
                        if (thumbnailScrollEndTimerRef.current !== null) {
                          window.clearTimeout(thumbnailScrollEndTimerRef.current);
                          thumbnailScrollEndTimerRef.current = null;
                        }
                        if (thumbnailCenterAnimationFrameRef.current !== null) {
                          window.cancelAnimationFrame(thumbnailCenterAnimationFrameRef.current);
                          thumbnailCenterAnimationFrameRef.current = null;
                        }
                        if (thumbnailProgrammaticReleaseFrameRef.current !== null) {
                          window.cancelAnimationFrame(thumbnailProgrammaticReleaseFrameRef.current);
                          thumbnailProgrammaticReleaseFrameRef.current = null;
                        }
                        setIsThumbnailCentering(false);
                        showControlsTemporarily();
                      }}
                      onTouchEnd={(event) => {
                        event.stopPropagation();
                        thumbnailTouchActiveRef.current = false;
                        settleMobileThumbnailScroll();
                      }}
                      onTouchCancel={(event) => {
                        event.stopPropagation();
                        thumbnailTouchActiveRef.current = false;
                        settleMobileThumbnailScroll();
                      }}
                      onScroll={() => {
                        if (!programmaticThumbnailScrollRef.current) {
                          showControlsTemporarily();
                        }
                        if (isMobileViewport && !programmaticThumbnailScrollRef.current) {
                          if (thumbnailScrollFrameRef.current === null) {
                            thumbnailScrollFrameRef.current = window.requestAnimationFrame(() => {
                              thumbnailScrollFrameRef.current = null;
                              const nearestIndex = getNearestThumbnailIndex();
                              if (nearestIndex !== null && nearestIndex !== activeIndexRef.current) {
                                navigateTo(nearestIndex, { centerThumbnail: false });
                              }
                            });
                          }
                          settleMobileThumbnailScroll();
                        }
                      }}
                    >
                      <div
                        ref={thumbnailOccupiedRegionRef}
                        className={styles.thumbnailOccupiedRegion}
                        role="list"
                        onPointerEnter={() => updateCloseSuppression("rail", true)}
                        onPointerLeave={() => updateCloseSuppression("rail", false)}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {galleryItems.map((item, index) => {
                          const isActive = index === activeIndex;
                          const ratio = getMediaRatio(item);
                          return (
                            <button
                              key={`${item.src ?? item.placeholderToken ?? "media"}-${index}`}
                              type="button"
                              role="listitem"
                              className={styles.thumbnail}
                              style={{ ["--thumbnail-ratio" as string]: ratio } as CSSProperties}
                              aria-current={isActive ? "true" : undefined}
                              tabIndex={0}
                              aria-label={`Open ${item.kind} ${index + 1}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                navigateTo(index);
                              }}
                              ref={(node) => {
                                thumbnailRefs.current.set(index, node);
                              }}
                            >
                              <span
                                className={[styles.thumbnailCrop, isActive && styles.thumbnailCropActive]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                <span className={styles.thumbnailAssetFrame} aria-hidden="true">
                                  {item.kind === "video" ? (
                                    <video className={styles.thumbnailAsset} src={item.src} muted preload="metadata" />
                                  ) : item.src ? (
                                    <Image className={styles.thumbnailAsset} src={item.src} alt="" fill sizes="96px" draggable={false} />
                                  ) : (
                                    <span className={styles.thumbnailFallback} />
                                  )}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                ) : null}

                {caseContext?.action ? (
                  <motion.div
                    className={styles.contextCardPositioner}
                    data-has-rail={galleryItems.length > 1 ? "true" : undefined}
                    data-hidden={!controlsReady || (!isMobileViewport && !controlsVisible) ? "true" : undefined}
                    style={{
                      "--context-compact-radius": contextCompactRadius === null ? undefined : `${contextCompactRadius}px`,
                      "--context-compact-width": contextCompactWidth === null ? undefined : `${contextCompactWidth}px`,
                      "--context-title-duration": `${contextMotion.titleDuration}s`,
                      "--context-radius-duration": `${contextMotion.radiusDuration}s`
                    } as CSSProperties}
                    initial={false}
                    animate={{ opacity: controlsReady && (isMobileViewport || controlsVisible) ? 1 : 0 }}
                    transition={{ duration: prefersReducedMotion || contextNavigationInstant ? 0 : 0.4, ease: "easeOut" }}
                    inert={!controlsReady}
                    aria-hidden={!controlsReady || undefined}
                    onPointerEnter={(event) => {
                      if (isMobileViewport || event.pointerType === "touch") return;
                      measureContextCompactWidth();
                      contextPointerInsideRef.current = true;
                      updateCloseSuppression("context", true);
                      setPointerOverActionContext(true);
                      setContextExpanded(true);
                      showControlsTemporarily();
                    }}
                    onPointerLeave={(event) => {
                      if (isMobileViewport || event.pointerType === "touch") return;
                      contextPointerInsideRef.current = false;
                      updateCloseSuppression("context", false);
                      setPointerOverActionContext(false);
                      setContextExpanded(contextFocusInsideRef.current);
                      showControlsTemporarily();
                    }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <span ref={attachContextCompactSizer} className={styles.contextCompactSizer} aria-hidden="true">
                      {caseContext.title}
                    </span>
                    <div className={styles.contextCardAnchor}>
                    {contextCompactWidth !== null ? (
                    <motion.div
                      className={styles.contextCard}
                      data-lightbox-context-card="true"
                      data-expanded={contextExpanded ? "true" : undefined}
                      data-instant={contextNavigationInstant ? "true" : undefined}
                      initial={false}
                      animate={contextCompactWidth === null ? undefined : {
                        width: contextExpanded ? 560 : contextCompactWidth,
                        paddingTop: contextExpanded ? "var(--space-lg)" : "var(--space-sm)",
                        paddingBottom: contextExpanded ? "var(--space-lg)" : "var(--space-sm)"
                      }}
                      transition={prefersReducedMotion || contextNavigationInstant ? { duration: 0 } : contextResizeSpring}
                      onFocus={() => {
                        if (isMobileViewport) return;
                        measureContextCompactWidth();
                        contextFocusInsideRef.current = true;
                        setContextExpanded(true);
                        showControlsTemporarily();
                      }}
                      onBlur={(event) => {
                        if (isMobileViewport) return;
                        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
                        contextFocusInsideRef.current = false;
                        setContextExpanded(contextPointerInsideRef.current);
                        showControlsTemporarily();
                      }}
                      onTouchStart={(event) => {
                        lightboxTouchStartRef.current = null;
                        event.stopPropagation();
                      }}
                      onTouchMove={(event) => event.stopPropagation()}
                      onTouchEnd={(event) => event.stopPropagation()}
                    >
                      {isMobileViewport ? <button
                        type="button"
                        className={styles.contextToggle}
                        aria-label={caseContext.title}
                        aria-expanded={contextExpanded}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!contextExpanded) measureContextCompactWidth();
                          if (contextExpanded) contextFocusInsideRef.current = false;
                          setContextExpanded((expanded) => !expanded);
                        }}
                      /> : <a
                        href={caseContext.href}
                        className={styles.contextToggle}
                        aria-label="Показать медиа в кейсе"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          pendingContextDestinationRef.current = caseContext.destination;
                          close();
                        }}
                      />}
                      <span className={styles.contextGeometry} aria-hidden="true">
                        <motion.span
                          className={styles.contextGeometryTitle}
                          initial={false}
                          animate={{ height: contextExpanded ? "auto" : "var(--line-height-caption)" }}
                          transition={prefersReducedMotion || contextNavigationInstant ? { duration: 0 } : contextResizeSpring}
                        >
                          {caseContext.title}
                        </motion.span>
                        {caseContext.body || isMobileViewport ? (
                          <motion.span
                            className={styles.contextGeometryDetails}
                            initial={false}
                            animate={{ height: contextExpanded ? "auto" : 0 }}
                            transition={contextTitleTransition}
                          >
                            {caseContext.body ? <span className={styles.contextBody}>{caseContext.body}</span> : null}
                            {isMobileViewport ? <span className={styles.contextAction}>Показать в кейсе</span> : null}
                          </motion.span>
                        ) : null}
                      </span>
                      <span className={styles.contextContentLayer}>
                        <span ref={contextExpandedContentRef} className={styles.contextExpandedContent}>
                          <motion.span
                            className={[styles.contextTitle, styles.contextCompactTitle].join(" ")}
                            aria-hidden={contextExpanded}
                            style={{ x: contextTitleX, y: contextTitleY }}
                          >
                            {caseContext.title}
                          </motion.span>
                          <motion.span
                            className={[styles.contextTitle, styles.contextExpandedTitle].join(" ")}
                            aria-hidden={!contextExpanded}
                            style={{ x: contextTitleX, y: contextTitleY }}
                          >
                            {caseContext.title}
                          </motion.span>
                          {caseContext.body ? (
                            <motion.span
                              className={styles.contextBody}
                              initial={false}
                              animate={{
                                opacity: contextExpanded ? 1 : 0,
                                y: contextExpanded ? 0 : contextMotion.textTravel
                              }}
                              transition={prefersReducedMotion || contextNavigationInstant ? { duration: 0 } : {
                                opacity: { duration: contextMotion.fadeDuration, delay: contextExpanded ? contextMotion.fadeDelay : 0 },
                                y: { ...contextResizeSpring, delay: contextExpanded ? contextMotion.textDelay : 0 }
                              }}
                            >
                              {caseContext.body}
                            </motion.span>
                          ) : null}
                          {isMobileViewport ? (
                            <motion.button
                              type="button"
                              className={styles.contextAction}
                              disabled={!contextExpanded}
                              tabIndex={contextExpanded ? 0 : -1}
                              aria-hidden={!contextExpanded}
                              initial={false}
                              animate={{
                                opacity: contextExpanded ? 1 : 0,
                                y: contextExpanded ? 0 : contextMotion.textTravel
                              }}
                              transition={prefersReducedMotion || contextNavigationInstant ? { duration: 0 } : {
                                opacity: { duration: contextMotion.fadeDuration, delay: contextExpanded ? contextMotion.fadeDelay + 0.08 : 0 },
                                y: { ...contextResizeSpring, delay: contextExpanded ? contextMotion.textDelay + 0.08 : 0 }
                              }}
                              onClick={(event) => {
                                event.stopPropagation();
                                pendingContextDestinationRef.current = caseContext.destination;
                                close();
                              }}
                            >
                              Показать в кейсе
                            </motion.button>
                          ) : null}
                        </span>
                      </span>
                    </motion.div>
                    ) : null}
                    </div>
                  </motion.div>
                ) : caseContext ? (
                  <motion.div
                    className={styles.contextCardPositioner}
                    data-has-rail={galleryItems.length > 1 ? "true" : undefined}
                    data-hidden={!controlsReady || (!isMobileViewport && !controlsVisible) ? "true" : undefined}
                    initial={false}
                    animate={{ opacity: controlsReady && (isMobileViewport || controlsVisible) ? 1 : 0 }}
                    transition={{ duration: prefersReducedMotion || contextNavigationInstant ? 0 : 0.4, ease: "easeOut" }}
                    inert={!controlsReady}
                    aria-hidden={!controlsReady || undefined}
                    onPointerEnter={() => {
                      contextPointerInsideRef.current = true;
                      updateCloseSuppression("context", true);
                      showControlsTemporarily();
                    }}
                    onPointerLeave={() => {
                      contextPointerInsideRef.current = false;
                      updateCloseSuppression("context", false);
                      showControlsTemporarily();
                    }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <aside className={[styles.contextCard, styles.contextCardStatic].join(" ")} aria-label="Подпись к медиа">
                      <div className={styles.contextTitle}>{caseContext.title}</div>
                    </aside>
                  </motion.div>
                ) : null}

                <div className={styles.panel}>
                  <motion.div
                    className={styles.animatedMediaShell}
                    data-instant={phase === "open" && !isVideoClosing ? "true" : undefined}
                    initial={
                      prefersReducedMotion || phase === "open"
                        ? false
                        : {
                            x: geometry.sourceRect.x,
                            y: geometry.sourceRect.y,
                            width: geometry.sourceRect.width,
                            height: geometry.sourceRect.height,
                            borderRadius: isMobileViewport ? geometry.sourceRadius : 20
                          }
                    }
                    animate={{
                      x: isVideoClosing
                        ? closingVisual?.targetRect.x
                        : (mediaTargetRect ?? geometry.targetRect).x,
                      y: isVideoClosing
                        ? closingVisual?.targetRect.y
                        : (mediaTargetRect ?? geometry.targetRect).y,
                      width: isVideoClosing
                        ? closingVisual?.targetRect.width
                        : (mediaTargetRect ?? geometry.targetRect).width,
                      height: isVideoClosing
                        ? closingVisual?.targetRect.height
                        : (mediaTargetRect ?? geometry.targetRect).height,
                      borderRadius: isMobileViewport ? geometry.sourceRadius : isVideoClosing ? 20 : animatedRadius,
                      opacity: isVideoClosing && closingVisual?.forceDissolve ? 0 : 1,
                      filter: isVideoClosing && closingVisual?.forceDissolve ? "blur(18px)" : "blur(0px)"
                    }}
                    transition={
                      prefersReducedMotion || (phase === "open" && !isVideoClosing)
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
                        ["--lightbox-x" as string]: `${(mediaTargetRect ?? geometry.targetRect).x}px`,
                        ["--lightbox-y" as string]: `${(mediaTargetRect ?? geometry.targetRect).y}px`,
                        ["--lightbox-width" as string]: `${(mediaTargetRect ?? geometry.targetRect).width}px`,
                        ["--lightbox-height" as string]: `${(mediaTargetRect ?? geometry.targetRect).height}px`,
                        ["--lightbox-animated-radius" as string]: `${isMobileViewport ? geometry.sourceRadius : animatedRadius}px`
                      } satisfies CSSProperties
                    }
                    onUpdate={(latest) => {
                      if (!geometry) {
                        return;
                      }
                      if (phase === "open" && !isVideoClosing) {
                        activeVisualRectRef.current = mediaTargetRect ?? geometry.targetRect;
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
                        setAnimatedRadius(40);
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
                    <div
                      className={styles.mediaLayer}
                      data-lightbox-media="true"
                      onClick={(event) => {
                        if (isMobileViewport) {
                          event.stopPropagation();
                          if (event.target instanceof Element
                            && event.target.closest('button, a, input, select, textarea, [role="button"], video[controls]')) return;
                          if (suppressBackdropClickRef.current) {
                            suppressBackdropClickRef.current = false;
                            return;
                          }
                          const rect = event.currentTarget.getBoundingClientRect();
                          const relativeX = (event.clientX - rect.left) / rect.width;
                          if (galleryItems.length > 1 && relativeX <= 0.2) {
                            navigateBy(-1);
                          } else if (galleryItems.length > 1 && relativeX >= 0.8) {
                            navigateBy(1);
                          } else if (contextExpanded) {
                            contextFocusInsideRef.current = false;
                            setContextExpanded(false);
                          }
                        }
                      }}
                    >
                        <div
                          className={styles.mobileZoomSurface}
                        >
                          <div ref={activeModalMediaRef} className={styles.modalAssets}>
                            <LightboxImageLayers
                              items={galleryItems}
                              activeIndex={activeIndex}
                              revealFull={phase === "open" || Boolean(prefersReducedMotion)}
                              openingSource={openingImageSource}
                            />
                            {activeModalItem.kind === "video" ? (
                              <div className={styles.modalVideo} style={{ opacity: modalVideoReady ? 1 : 0 }}>
                                <MediaPlaceholderView
                                  key={activeIndex}
                                  media={activeModalItem}
                                  variant={variant}
                                  presentation="modal"
                                  fit="contain"
                                  className={styles.animatedModalMedia}
                                  showCaption={false}
                                  progressiveVideo
                                  revealFullVideo={phase === "open" || Boolean(prefersReducedMotion)}
                                  videoStartTime={modalVideoStartTime}
                                  onVideoReady={() => setModalVideoReady(true)}
                                />
                              </div>
                            ) : null}
                          </div>
                        </div>
                    </div>
                    {phase === "opening" && activeModalItem.kind === "video" && !modalVideoReady && (
                      <canvas
                        ref={openingVideoFrameRef}
                        className={styles.openingVideoFrame}
                        aria-hidden="true"
                      />
                    )}
                  </motion.div>
                </div>
                {galleryItems.length > 1 ? (
                  <motion.div
                    className={styles.lightboxProgressiveBlur}
                    initial={false}
                    animate={{ "--lightbox-blur-visibility": controlsReady && (isMobileViewport || controlsVisible) ? 1 : 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: "easeOut" }}
                    aria-hidden="true"
                  >
                    <ProgressiveBlur direction="top-to-bottom" layers={LIGHTBOX_PROGRESSIVE_BLUR_LAYERS} />
                  </motion.div>
                ) : null}
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
                    animate={{ opacity: 0, scale: 0.75 }}
                    transition={{
                      opacity: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
                      scale: contextResizeSpring
                    }}
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
                    transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
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
                      borderRadius: isMobileViewport ? closingVisual.sourceRadius : closingAnimatedRadius,
                      opacity: 1,
                      filter: "blur(0px)"
                    }}
                    animate={{
                      x: closingVisual.targetRect.x,
                      y: closingVisual.targetRect.y,
                      width: closingVisual.targetRect.width,
                      height: closingVisual.targetRect.height,
                      borderRadius: isMobileViewport ? closingVisual.sourceRadius : closingAnimatedRadius,
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
                    style={{
                      ["--lightbox-animated-radius" as string]: `${isMobileViewport ? closingVisual.sourceRadius : closingAnimatedRadius}px`
                    } satisfies CSSProperties}
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
