"use client";

import { type Ref, useEffect, useState } from "react";
import { type MediaAssetSource, type MediaPlaceholder } from "@/lib/content/types";
import { getMediaLayout } from "./media-layout";
import styles from "@/components/media/media-placeholder.module.css";

interface MediaPlaceholderProps {
  media: MediaPlaceholder;
  variant?: "default" | "work" | "homePreview";
  fit?: "fill" | "contain";
  frame?: "intrinsic" | "square";
  appearance?: "default" | "skeleton" | "handoff";
  mediaRef?: Ref<HTMLDivElement>;
  assetClassName?: string;
  className?: string;
  showCaption?: boolean;
}

interface AssetLoadState {
  ready: boolean;
  revealed: boolean;
  src: string;
}

function getFallbackVideoSources(media: MediaPlaceholder): MediaAssetSource[] {
  return media.src ? [{ src: media.src, type: "" }] : [];
}

function getInlineImageSrcSet(srcSet?: string, intrinsicWidth?: number) {
  if (!srcSet || !intrinsicWidth || !Number.isFinite(intrinsicWidth) || intrinsicWidth <= 0) {
    return srcSet;
  }

  const candidates = srcSet.split(",").map((entry) => entry.trim().match(/^(\S+)\s+(\d*\.?\d+)x$/));
  const widthCandidates: string[] = [];
  for (const candidate of candidates) {
    if (!candidate) {
      // Preserve existing width descriptors and other author-provided srcsets.
      return srcSet;
    }

    const width = Math.round(intrinsicWidth * Number(candidate[2]));
    if (!Number.isFinite(width) || width <= 0) return srcSet;
    widthCandidates.push(`${candidate[1]} ${width}w`);
  }

  return widthCandidates.join(", ");
}

export function MediaPlaceholderView({
  media,
  variant = "default",
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
  const isContentMedia = !isHomePreview;
  const isSkeleton = appearance === "skeleton";
  const isHandoff = appearance === "handoff";
  const baseImageSrc = media.src;
  const imageSrc = baseImageSrc;
  const imageSrcSet = isContentMedia ? getInlineImageSrcSet(media.srcSet, media.intrinsicWidth) : media.srcSet;
  const imageSizes =
    isContentMedia && imageSrcSet?.split(",").every((entry) => /^\S+\s+\d+w$/.test(entry.trim()))
      ? "auto, 100vw"
      : undefined;
  const imageWidth = media.intrinsicWidth;
  const imageHeight = media.intrinsicHeight;
  const videoSources = media.videoSources?.length ? media.videoSources : getFallbackVideoSources(media);
  const [intrinsicRatio, setIntrinsicRatio] = useState<number | null>(null);
  const currentSrc = media.kind === "video" ? videoSources.map((source) => source.src).join("|") : imageSrc ?? "";
  const [assetLoadState, setAssetLoadState] = useState<AssetLoadState>({
    ready: false,
    revealed: false,
    src: currentSrc
  });
  const isCurrentAssetReady = assetLoadState.src === currentSrc && assetLoadState.ready;
  const isCurrentAssetRevealed = assetLoadState.src === currentSrc && assetLoadState.revealed;
  const assetStateClass = isSkeleton || isHandoff ? null : isCurrentAssetRevealed ? styles.assetLoaded : styles.assetLoading;

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
    if (!isCurrentAssetReady || isCurrentAssetRevealed || isSkeleton || isHandoff) {
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
  }, [currentSrc, isCurrentAssetReady, isCurrentAssetRevealed, isHandoff, isSkeleton]);

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

  const { mediaStyle, wrapperStyle } = getMediaLayout({ media, variant, presentation: "inline", fit, appearance, intrinsicRatio });

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
              className={[styles.asset, assetClassName, isSkeleton && styles.assetSkeleton, isHandoff && styles.assetHandoff, assetStateClass].filter(Boolean).join(" ")}
              width={media.intrinsicWidth}
              height={media.intrinsicHeight}
              autoPlay
              muted
              loop
              playsInline
              draggable={false}
              preload="metadata"
              data-video-active="true"
              ref={(node) => {
                if (!isCurrentAssetReady && node && node.readyState >= 2) markVideoLoaded(node);
              }}
              onLoadedMetadata={(event) => applyVideoIntrinsicSize(event.currentTarget)}
              onLoadedData={(event) => markVideoLoaded(event.currentTarget)}
              onCanPlay={(event) => markVideoLoaded(event.currentTarget)}
            >
              {videoSources.map((source) => <source key={source.src} src={source.src} type={source.type || undefined} />)}
            </video>
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
              srcSet={imageSrcSet}
              sizes={imageSizes}
              loading="lazy"
              decoding="async"
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
