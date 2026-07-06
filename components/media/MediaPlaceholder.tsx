"use client";

import { type CSSProperties, type Ref, useEffect, useMemo, useRef, useState } from "react";
import { type MediaAssetSource, type MediaPlaceholder } from "@/lib/content/types";
import styles from "@/components/media/media-placeholder.module.css";

interface MediaPlaceholderProps {
  media: MediaPlaceholder;
  variant?: "default" | "work" | "homePreview";
  presentation?: "inline" | "modal";
  fit?: "fill" | "contain";
  frame?: "intrinsic" | "square";
  appearance?: "default" | "skeleton" | "handoff";
  mediaRef?: Ref<HTMLDivElement>;
  assetClassName?: string;
  className?: string;
  showCaption?: boolean;
  progressiveVideo?: boolean;
  progressiveVideoSession?: number;
  revealFullVideo?: boolean;
  videoStartTime?: number;
  videoSyncTime?: () => number | undefined;
  onVideoReady?: () => void;
}

function parseAspectRatio(input?: string) {
  if (!input) return null;
  const [rawWidth, rawHeight] = input.split("/").map((value) => Number(value.trim()));
  if (!Number.isFinite(rawWidth) || !Number.isFinite(rawHeight) || rawHeight === 0) return null;
  return rawWidth / rawHeight;
}

function toHomePreviewRatio(value: number) {
  return value >= 1 ? 2 : 0.5;
}

interface AssetLoadState {
  ready: boolean;
  revealed: boolean;
  src: string;
}

const VIDEO_FRAME_TOLERANCE_SECONDS = 1 / 60;

function getVideoTimelineDelta(firstTime: number, secondTime: number, duration: number) {
  const directDelta = Math.abs(firstTime - secondTime);
  return Number.isFinite(duration) && duration > 0 ? Math.min(directDelta, Math.abs(duration - directDelta)) : directDelta;
}

function onNextPresentedVideoFrame(element: HTMLVideoElement, callback: (mediaTime: number) => void) {
  if (typeof element.requestVideoFrameCallback !== "function") {
    window.requestAnimationFrame(() => callback(element.currentTime));
    return;
  }

  let settled = false;
  const timeout = window.setTimeout(() => {
    if (settled) {
      return;
    }

    settled = true;
    callback(element.currentTime);
  }, 100);

  element.requestVideoFrameCallback((_now, metadata) => {
    if (settled) {
      return;
    }

    settled = true;
    window.clearTimeout(timeout);
    callback(metadata.mediaTime);
  });
}

function getFallbackVideoSources(media: MediaPlaceholder): MediaAssetSource[] {
  return media.src ? [{ src: media.src, type: "" }] : [];
}

function parseRetinaSrc(srcSet?: string) {
  if (!srcSet) {
    return undefined;
  }

  const candidates = srcSet
    .split(",")
    .map((entry) => entry.trim())
    .map((entry) => {
      const [src, descriptor] = entry.split(/\s+/, 2);
      return { src, descriptor };
    });

  return candidates.find((candidate) => candidate.descriptor === "2x")?.src;
}

function preloadImageSource(src: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new window.Image();
    image.decoding = "async";
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
    image.src = src;

    if (image.complete && image.naturalWidth > 0) {
      resolve();
    }
  });
}

export function MediaPlaceholderView({
  media,
  variant = "default",
  presentation = "inline",
  fit = "fill",
  frame = "intrinsic",
  appearance = "default",
  mediaRef,
  assetClassName,
  className,
  showCaption = true,
  progressiveVideo = false,
  progressiveVideoSession = 0,
  revealFullVideo = false,
  videoStartTime,
  videoSyncTime,
  onVideoReady
}: MediaPlaceholderProps) {
  const hasSource = Boolean(media.src);
  const isWork = variant === "work";
  const isHomePreview = variant === "homePreview";
  const isModal = presentation === "modal";
  const isContentMedia = !isHomePreview && !isModal;
  const isSkeleton = appearance === "skeleton";
  const isHandoff = appearance === "handoff";
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const baseImageSrc = media.src;
  const retinaImageSrc = parseRetinaSrc(media.srcSet);
  const fullImageSrc = media.fullSrc;
  const isMobileInlineImage = media.kind === "image" && isContentMedia && !isModal && isMobileViewport;
  const mobileImageUpgradeQueue = useMemo(
    () => [retinaImageSrc, fullImageSrc].filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index),
    [fullImageSrc, retinaImageSrc]
  );
  const [displayedInlineImageSrc, setDisplayedInlineImageSrc] = useState(baseImageSrc);
  const imageSrc = isModal
    ? fullImageSrc ?? baseImageSrc
    : isMobileInlineImage
      ? displayedInlineImageSrc ?? baseImageSrc
      : baseImageSrc;
  const imageWidth =
    isModal && media.fullIntrinsicWidth
      ? media.fullIntrinsicWidth
      : isMobileInlineImage && imageSrc === fullImageSrc && media.fullIntrinsicWidth
        ? media.fullIntrinsicWidth
        : media.intrinsicWidth;
  const imageHeight =
    isModal && media.fullIntrinsicHeight
      ? media.fullIntrinsicHeight
      : isMobileInlineImage && imageSrc === fullImageSrc && media.fullIntrinsicHeight
        ? media.fullIntrinsicHeight
        : media.intrinsicHeight;
  const inlineVideoSources = media.videoSources?.length ? media.videoSources : getFallbackVideoSources(media);
  const modalVideoSources = media.fullVideoSources?.length ? media.fullVideoSources : inlineVideoSources;
  const videoSources = isModal ? modalVideoSources : inlineVideoSources;
  const hasProgressiveVideo = Boolean(
    media.kind === "video" && progressiveVideo && media.fullVideoSources?.length
  );
  const inlineVideoRef = useRef<HTMLVideoElement | null>(null);
  const fullVideoRef = useRef<HTMLVideoElement | null>(null);
  const inlineStartSyncKeyRef = useRef<string | null>(null);
  const inlineVideoReadyRef = useRef(false);
  const inlineFrameCheckPendingRef = useRef(false);
  const fullFrameCheckPendingRef = useRef(false);
  const [fullVideoReadySession, setFullVideoReadySession] = useState<number | null>(null);
  const fullVideoReady = fullVideoReadySession === progressiveVideoSession;
  const [intrinsicRatio, setIntrinsicRatio] = useState<number | null>(null);
  const currentSrc = media.kind === "video" ? videoSources.map((source) => source.src).join("|") : imageSrc ?? "";
  const [assetLoadState, setAssetLoadState] = useState<AssetLoadState>({
    ready: false,
    revealed: false,
    src: currentSrc
  });
  const isCurrentAssetReady = assetLoadState.src === currentSrc && assetLoadState.ready;
  const isCurrentAssetRevealed = assetLoadState.src === currentSrc && assetLoadState.revealed;
  const assetStateClass = isModal || isSkeleton || isHandoff ? null : isCurrentAssetRevealed ? styles.assetLoaded : styles.assetLoading;

  function markAssetReady() {
    setAssetLoadState((current) => {
      if (current.src === currentSrc && current.ready) {
        return current;
      }

      return {
        ready: true,
        revealed: false,
        src: currentSrc
      };
    });
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => {
      setIsMobileViewport(mediaQuery.matches);
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  useEffect(() => {
    setDisplayedInlineImageSrc(baseImageSrc);
  }, [baseImageSrc]);

  useEffect(() => {
    if (!isMobileInlineImage || !baseImageSrc || mobileImageUpgradeQueue.length === 0) {
      return undefined;
    }

    let cancelled = false;

    const promoteInlineImage = async () => {
      for (const candidateSrc of mobileImageUpgradeQueue) {
        try {
          await preloadImageSource(candidateSrc);
        } catch {
          continue;
        }

        if (cancelled) {
          return;
        }

        setDisplayedInlineImageSrc(candidateSrc);
      }
    };

    void promoteInlineImage();

    return () => {
      cancelled = true;
    };
  }, [baseImageSrc, isMobileInlineImage, mobileImageUpgradeQueue]);

  useEffect(() => {
    if (!isCurrentAssetReady || isCurrentAssetRevealed || isModal || isSkeleton || isHandoff) {
      return undefined;
    }

    let outerFrame = 0;
    let innerFrame = 0;

    outerFrame = window.requestAnimationFrame(() => {
      innerFrame = window.requestAnimationFrame(() => {
        setAssetLoadState((current) =>
          current.src === currentSrc && current.ready
            ? {
                ...current,
                revealed: true
              }
            : current
        );
      });
    });

    return () => {
      window.cancelAnimationFrame(outerFrame);
      window.cancelAnimationFrame(innerFrame);
    };
  }, [currentSrc, isCurrentAssetReady, isCurrentAssetRevealed, isHandoff, isModal, isSkeleton]);

  if (!hasSource) {
    return null;
  }

  function applyImageIntrinsicSize(element: HTMLImageElement) {
    const { naturalWidth, naturalHeight } = element;
    if (naturalHeight > 0) {
      setIntrinsicRatio(naturalWidth / naturalHeight);
    }
    markAssetReady();
  }

  function applyVideoIntrinsicSize(element: HTMLVideoElement) {
    const { videoWidth, videoHeight } = element;
    if (videoHeight > 0) {
      setIntrinsicRatio(videoWidth / videoHeight);
    }
  }

  function markVideoLoaded(element: HTMLVideoElement) {
    applyVideoIntrinsicSize(element);
    markAssetReady();
  }

  function syncVideoStartTime(element: HTMLVideoElement, reference?: HTMLVideoElement | null) {
    if (!Number.isFinite(element.duration) || element.duration <= 0) {
      return;
    }

    const requestedTime = reference?.currentTime ?? videoStartTime;
    if (!Number.isFinite(requestedTime)) {
      return;
    }

    const targetTime = Math.min((requestedTime as number) % element.duration, Math.max(element.duration - 0.05, 0));
    if (getVideoTimelineDelta(element.currentTime, targetTime, element.duration) > VIDEO_FRAME_TOLERANCE_SECONDS) {
      element.currentTime = targetTime;
    }
  }

  function syncProgressiveInlineStartTime(element: HTMLVideoElement) {
    const syncKey = `${progressiveVideoSession}:${inlineVideoSources.map((source) => source.src).join("|")}`;

    if (inlineStartSyncKeyRef.current === syncKey) {
      return;
    }

    if (!Number.isFinite(element.duration) || element.duration <= 0) {
      return;
    }

    syncVideoStartTime(element);
    inlineStartSyncKeyRef.current = syncKey;
  }

  function prepareFullVideo(element: HTMLVideoElement) {
    if (fullVideoReady) {
      return;
    }

    const inlineVideo = inlineVideoRef.current;
    syncVideoStartTime(element, inlineVideo);

    if (
      inlineVideo &&
      getVideoTimelineDelta(element.currentTime, inlineVideo.currentTime, element.duration) >
        VIDEO_FRAME_TOLERANCE_SECONDS
    ) {
      element.currentTime = inlineVideo.currentTime % element.duration;
      return;
    }

    if (fullFrameCheckPendingRef.current) {
      return;
    }

    fullFrameCheckPendingRef.current = true;
    onNextPresentedVideoFrame(element, (mediaTime) => {
      fullFrameCheckPendingRef.current = false;
      if (fullVideoRef.current !== element) {
        return;
      }
      const currentInlineVideo = inlineVideoRef.current;

      if (
        currentInlineVideo &&
        getVideoTimelineDelta(mediaTime, currentInlineVideo.currentTime, element.duration) >
          VIDEO_FRAME_TOLERANCE_SECONDS
      ) {
        element.currentTime = currentInlineVideo.currentTime % element.duration;
        return;
      }

      void element.play().catch(() => undefined);
      setFullVideoReadySession(progressiveVideoSession);
    });
  }

  function markProgressiveInlineReady(element: HTMLVideoElement) {
    markVideoLoaded(element);

    if (inlineVideoReadyRef.current) {
      return;
    }

    const requestedTime = videoSyncTime?.() ?? videoStartTime;
    if (Number.isFinite(requestedTime) && Number.isFinite(element.duration) && element.duration > 0) {
      const targetTime = Math.min((requestedTime as number) % element.duration, Math.max(element.duration - 0.05, 0));
      if (getVideoTimelineDelta(element.currentTime, targetTime, element.duration) > VIDEO_FRAME_TOLERANCE_SECONDS) {
        element.currentTime = targetTime;
        return;
      }
    }

    if (inlineFrameCheckPendingRef.current) {
      return;
    }

    inlineFrameCheckPendingRef.current = true;
    onNextPresentedVideoFrame(element, (mediaTime) => {
      inlineFrameCheckPendingRef.current = false;
      const currentRequestedTime = videoSyncTime?.() ?? videoStartTime;

      if (
        Number.isFinite(currentRequestedTime) &&
        getVideoTimelineDelta(mediaTime, currentRequestedTime as number, element.duration) >
          VIDEO_FRAME_TOLERANCE_SECONDS
      ) {
        element.currentTime = Math.min(
          (currentRequestedTime as number) % element.duration,
          Math.max(element.duration - 0.05, 0)
        );
        markProgressiveInlineReady(element);
        return;
      }

      inlineVideoReadyRef.current = true;
      onVideoReady?.();
    });
  }

  const declaredRatio = parseAspectRatio(media.aspectRatio);
  const rawRatio = intrinsicRatio ?? declaredRatio ?? (isHomePreview ? 2 : 1.6);
  const ratio = isHomePreview ? (hasSource ? toHomePreviewRatio(rawRatio) : 2) : rawRatio;
  const aspectRatioValue = isHomePreview
    ? ratio >= 1
      ? "2 / 1"
      : "1 / 2"
    : media.aspectRatio ?? `${ratio}`;

  const style = (aspectRatioValue ? { aspectRatio: aspectRatioValue } : {}) satisfies CSSProperties;

  let mediaStyle: CSSProperties =
    fit === "contain"
      ? {
          ...style,
          width: ratio >= 1 ? "100%" : "auto",
          height: ratio >= 1 ? "auto" : "100%",
          maxWidth: "100%",
          maxHeight: "100%"
        }
      : style;

  if (isHomePreview) {
    mediaStyle =
      ratio >= 1
        ? {
            ...mediaStyle,
            width: "min(100%, var(--home-preview-max-inline, 100%))",
            height: "auto",
            maxWidth: "100%",
            maxHeight: "100%"
          }
        : {
            ...mediaStyle,
            width: "auto",
            height: "min(100%, var(--home-preview-max-block, 100%))",
            maxWidth: "100%",
            maxHeight: "100%"
          };
  } else if (isModal) {
    mediaStyle =
      ratio >= 1
        ? {
            ...mediaStyle,
            width: "min(100%, var(--lightbox-media-max-inline, 100%))",
            height: "auto",
            maxWidth: "100%",
            maxHeight: "var(--lightbox-media-max-block, 100%)"
          }
        : {
            ...mediaStyle,
            width: "auto",
            height: "min(100%, var(--lightbox-media-max-block, 100%))",
            maxWidth: "var(--lightbox-media-max-inline, 100%)",
            maxHeight: "var(--lightbox-media-max-block, 100%)"
          };
  } else if (isWork) {
    mediaStyle = {
      ...mediaStyle,
      maxWidth: "100%",
      width: "100%",
      height: "auto",
      maxHeight: "none"
    };
  }

  const wrapperStyle: CSSProperties | undefined =
    isSkeleton
      ? ({
          ["--placeholder-bg" as string]: "transparent",
          ["--placeholder-border-width" as string]: "0px",
          ["--placeholder-border-color" as string]: "transparent"
        } as CSSProperties)
      : isWork
        ? ({
          ["--placeholder-bg" as string]: "transparent",
          ["--placeholder-border-width" as string]: "0px",
          ["--placeholder-border-color" as string]: "transparent"
        } as CSSProperties)
        : undefined;

  return (
    <div className={[styles.host, isContentMedia && styles.contentBleed].filter(Boolean).join(" ")}>
      <div
        className={[
          styles.wrapper,
          isWork && styles.workWrapper,
          isContentMedia && styles.contentMediaWrapper,
          frame === "square" && styles.squareFrame,
          className
        ]
          .filter(Boolean)
          .join(" ")}
        style={wrapperStyle}
      >
        <div
          ref={mediaRef}
          className={[styles.media, isWork && styles.workMedia].filter(Boolean).join(" ")}
          style={mediaStyle}
          aria-label={`${media.kind} media`}
        >
          {media.kind === "video" ? (
            <>
              <video
                className={[
                  styles.asset,
                  hasProgressiveVideo && styles.progressiveVideoAsset,
                  assetClassName,
                  isSkeleton && styles.assetSkeleton,
                  isHandoff && styles.assetHandoff,
                  assetStateClass
                ]
                  .filter(Boolean)
                  .join(" ")}
                width={media.intrinsicWidth}
                height={media.intrinsicHeight}
                autoPlay
                muted
                loop
                playsInline
                draggable={false}
                preload={hasProgressiveVideo ? "auto" : "metadata"}
                data-video-active={hasProgressiveVideo && fullVideoReady && revealFullVideo ? undefined : "true"}
                ref={(node) => {
                  inlineVideoRef.current = hasProgressiveVideo ? node : null;
                  if (hasProgressiveVideo && node && node.readyState >= 1) {
                    applyVideoIntrinsicSize(node);
                    syncProgressiveInlineStartTime(node);
                  }
                  if (!isCurrentAssetReady && node && node.readyState >= 2) {
                    if (hasProgressiveVideo) {
                      markProgressiveInlineReady(node);
                    } else {
                      markVideoLoaded(node);
                    }
                  }
                }}
                onLoadedMetadata={(event) => {
                  applyVideoIntrinsicSize(event.currentTarget);
                  if (hasProgressiveVideo) {
                    syncProgressiveInlineStartTime(event.currentTarget);
                  }
                }}
                onLoadedData={(event) => {
                  if (hasProgressiveVideo) {
                    markProgressiveInlineReady(event.currentTarget);
                  } else {
                    markVideoLoaded(event.currentTarget);
                  }
                }}
                onCanPlay={(event) => {
                  if (hasProgressiveVideo) {
                    markProgressiveInlineReady(event.currentTarget);
                  } else {
                    markVideoLoaded(event.currentTarget);
                  }
                }}
                onSeeked={(event) => {
                  if (hasProgressiveVideo) {
                    markProgressiveInlineReady(event.currentTarget);
                  }
                }}
              >
                {(hasProgressiveVideo ? inlineVideoSources : videoSources).map((source) => (
                  <source key={source.src} src={source.src} type={source.type || undefined} />
                ))}
              </video>
              {hasProgressiveVideo && (
                <video
                  className={[
                    styles.asset,
                    styles.progressiveVideoAsset,
                    styles.progressiveVideoFull,
                    fullVideoReady && revealFullVideo && styles.progressiveVideoFullReady,
                    assetClassName
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  width={media.fullIntrinsicWidth ?? media.intrinsicWidth}
                  height={media.fullIntrinsicHeight ?? media.intrinsicHeight}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  aria-hidden="true"
                  data-video-active={fullVideoReady && revealFullVideo ? "true" : undefined}
                  draggable={false}
                  ref={(node) => {
                    fullVideoRef.current = node;
                    if (!node) {
                      fullFrameCheckPendingRef.current = false;
                      return;
                    }
                    if (node && node.readyState >= 3) {
                      prepareFullVideo(node);
                    }
                  }}
                  onLoadedMetadata={(event) => {
                    syncVideoStartTime(event.currentTarget, inlineVideoRef.current);
                  }}
                  onCanPlay={(event) => {
                    prepareFullVideo(event.currentTarget);
                  }}
                  onSeeked={(event) => {
                    prepareFullVideo(event.currentTarget);
                  }}
                >
                  {modalVideoSources.map((source) => (
                    <source key={source.src} src={source.src} type={source.type || undefined} />
                  ))}
                </video>
              )}
            </>
          ) : (
            // We intentionally allow plain <img> to support arbitrary trusted URL schemes from JSON content.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={[
                styles.asset,
                assetClassName,
                isSkeleton && styles.assetSkeleton,
                isHandoff && styles.assetHandoff,
                isWork && styles.workImageAsset,
                assetStateClass
              ]
                .filter(Boolean)
                .join(" ")}
              src={imageSrc}
              alt={media.caption ?? ""}
              width={imageWidth}
              height={imageHeight}
              srcSet={isModal || isMobileInlineImage ? undefined : media.srcSet}
              loading={isModal ? "eager" : "lazy"}
              fetchPriority={isModal ? "high" : undefined}
              decoding={isModal ? "sync" : "async"}
              draggable={false}
              ref={(node) => {
                if (!isCurrentAssetReady && node && node.complete && node.naturalWidth > 0) {
                  applyImageIntrinsicSize(node);
                }
              }}
              onLoad={(event) => {
                applyImageIntrinsicSize(event.currentTarget);
              }}
            />
          )}
        </div>
      </div>
      {showCaption && media.caption && (
        <p className={[styles.caption, isWork && styles.workCaption].filter(Boolean).join(" ")}>{media.caption}</p>
      )}
    </div>
  );
}
