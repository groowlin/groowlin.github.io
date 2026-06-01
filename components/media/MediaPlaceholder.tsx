"use client";

import { type CSSProperties, type Ref, useEffect, useState } from "react";
import { type MediaPlaceholder } from "@/lib/content/types";
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
  showCaption = true
}: MediaPlaceholderProps) {
  const hasSource = Boolean(media.src);
  const isWork = variant === "work";
  const isHomePreview = variant === "homePreview";
  const isModal = presentation === "modal";
  const isContentMedia = !isHomePreview && !isModal;
  const isSkeleton = appearance === "skeleton";
  const isHandoff = appearance === "handoff";
  const [intrinsicRatio, setIntrinsicRatio] = useState<number | null>(null);
  const currentSrc = media.src ?? "";
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
            <video
              className={[styles.asset, assetClassName, isSkeleton && styles.assetSkeleton, isHandoff && styles.assetHandoff, assetStateClass]
                .filter(Boolean)
                .join(" ")}
              src={media.src}
              width={media.intrinsicWidth}
              height={media.intrinsicHeight}
              autoPlay
              muted
              loop
              playsInline
              preload={isModal ? "metadata" : "auto"}
              ref={(node) => {
                if (!isCurrentAssetReady && node && node.readyState >= 2) {
                  markVideoLoaded(node);
                }
              }}
              onLoadedMetadata={(event) => {
                applyVideoIntrinsicSize(event.currentTarget);
              }}
              onLoadedData={(event) => {
                markVideoLoaded(event.currentTarget);
              }}
              onCanPlay={(event) => {
                markVideoLoaded(event.currentTarget);
              }}
            />
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
              src={media.src}
              alt={media.caption ?? ""}
              width={media.intrinsicWidth}
              height={media.intrinsicHeight}
              loading={isModal ? "eager" : "lazy"}
              fetchPriority={isModal ? "high" : undefined}
              decoding={isModal ? "sync" : "async"}
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
