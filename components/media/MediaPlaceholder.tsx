"use client";

import { type CSSProperties, useState } from "react";
import { type MediaPlaceholder } from "@/lib/content/types";
import styles from "@/components/media/media-placeholder.module.css";

interface MediaPlaceholderProps {
  media: MediaPlaceholder;
  variant?: "default" | "work" | "homePreview";
  fit?: "fill" | "contain";
  frame?: "intrinsic" | "square";
  className?: string;
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
  fit = "fill",
  frame = "intrinsic",
  className
}: MediaPlaceholderProps) {
  const hasSource = Boolean(media.src);
  const isWork = variant === "work";
  const isHomePreview = variant === "homePreview";
  const isWideBleed = isWork && media.bleed === "wide";
  const [intrinsicRatio, setIntrinsicRatio] = useState<number | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

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
  const shouldDeferRatioInWorkImage = isWork && media.kind !== "video" && !declaredRatio && !intrinsicRatio;
  const shouldDeferRatioInHomeImage = isHomePreview && media.kind !== "video" && !intrinsicRatio;
  const rawRatio = intrinsicRatio ?? declaredRatio ?? (isHomePreview ? 2 : 1.6);
  const ratio = isHomePreview ? (hasSource ? toHomePreviewRatio(rawRatio) : 2) : rawRatio;
  const aspectRatioValue = shouldDeferRatioInWorkImage || shouldDeferRatioInHomeImage
    ? undefined
    : isHomePreview
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

  if (isHomePreview && shouldDeferRatioInHomeImage) {
    mediaStyle = {
      ...mediaStyle,
      width: "100%",
      height: "100%",
      maxWidth: "100%",
      maxHeight: "100%"
    };
  } else if (isHomePreview) {
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
    <div className={[styles.host, isWideBleed && styles.wideBleed].filter(Boolean).join(" ")}>
      <div
        className={[
          styles.wrapper,
          isWork && styles.workWrapper,
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
              autoPlay
              muted
              loop
              playsInline
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
                isImageLoaded ? styles.assetLoaded : styles.assetLoading
              ]
                .filter(Boolean)
                .join(" ")}
              src={media.src}
              alt={media.caption ?? ""}
              loading="lazy"
              ref={(node) => {
                if (node && node.complete && node.naturalWidth > 0) {
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
      {media.caption && (
        <p className={[styles.caption, isWork && styles.workCaption].filter(Boolean).join(" ")}>{media.caption}</p>
      )}
    </div>
  );
}
