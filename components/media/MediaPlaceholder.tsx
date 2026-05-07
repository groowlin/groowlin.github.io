"use client";

import { type CSSProperties, useState } from "react";
import { type MediaPlaceholder } from "@/lib/content/types";
import styles from "@/components/media/media-placeholder.module.css";

interface MediaPlaceholderProps {
  media: MediaPlaceholder;
  variant?: "default" | "work" | "homePreview";
  presentation?: "inline" | "modal";
  fit?: "fill" | "contain";
  frame?: "intrinsic" | "square";
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

export function MediaPlaceholderView({
  media,
  variant = "default",
  presentation = "inline",
  fit = "fill",
  frame = "intrinsic",
  className,
  showCaption = true
}: MediaPlaceholderProps) {
  const hasSource = Boolean(media.src);
  const isWork = variant === "work";
  const isHomePreview = variant === "homePreview";
  const isModal = presentation === "modal";
  const isContentMedia = !isHomePreview && !isModal;
  const [intrinsicRatio, setIntrinsicRatio] = useState<number | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const imageStateClass = isModal ? null : isImageLoaded ? styles.assetLoaded : styles.assetLoading;

  if (!hasSource) {
    return null;
  }

  function applyImageIntrinsicSize(element: HTMLImageElement) {
    const { naturalWidth, naturalHeight } = element;
    if (naturalHeight > 0) {
      setIntrinsicRatio(naturalWidth / naturalHeight);
    }
    setIsImageLoaded(true);
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
    isWork
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
          className={[styles.media, isWork && styles.workMedia].filter(Boolean).join(" ")}
          style={mediaStyle}
          aria-label={`${media.kind} media`}
        >
          {media.kind === "video" ? (
            <video
              className={styles.asset}
              src={media.src}
              width={media.intrinsicWidth}
              height={media.intrinsicHeight}
              autoPlay
              muted
              loop
              playsInline
              preload={isModal ? "metadata" : "auto"}
              onLoadedMetadata={(event) => {
                const { videoWidth: nextWidth, videoHeight: nextHeight } = event.currentTarget;
                if (nextHeight > 0) {
                  setIntrinsicRatio(nextWidth / nextHeight);
                }
              }}
            />
          ) : (
            // We intentionally allow plain <img> to support arbitrary trusted URL schemes from JSON content.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={[
                styles.asset,
                isWork && styles.workImageAsset,
                imageStateClass
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
                if (!isImageLoaded && node && node.complete && node.naturalWidth > 0) {
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
