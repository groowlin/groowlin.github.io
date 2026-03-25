"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { type MediaPlaceholder } from "@/lib/content/types";
import styles from "@/components/media/media-placeholder.module.css";

interface MediaPlaceholderProps {
  media: MediaPlaceholder;
  variant?: "default" | "work" | "homePreview";
  fit?: "fill" | "contain";
  frame?: "intrinsic" | "square";
  className?: string;
}

function tokenToHue(token: string) {
  let hash = 0;
  for (let i = 0; i < token.length; i += 1) {
    hash = (hash * 31 + token.charCodeAt(i)) % 360;
  }
  return hash;
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
  const placeholderToken = media.placeholderToken ?? "placeholder";
  const hue = tokenToHue(placeholderToken);
  const isWork = variant === "work";
  const isHomePreview = variant === "homePreview";
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [intrinsicWidth, setIntrinsicWidth] = useState<number | null>(null);
  const [intrinsicRatio, setIntrinsicRatio] = useState<number | null>(null);

  const background = `linear-gradient(135deg, hsl(${hue} 72% 88%), hsl(${(hue + 40) % 360} 55% 78%))`;

  useEffect(() => {
    if (!isWork || !hasSource) return;

    const node = wrapperRef.current;
    if (!node) return;

    const updateWidth = () => setContainerWidth(node.clientWidth);
    updateWidth();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateWidth);
      observer.observe(node);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [isWork, hasSource]);

  const declaredRatio = parseAspectRatio(media.aspectRatio);
  const rawRatio = intrinsicRatio ?? declaredRatio ?? (isHomePreview ? 2 : 1.6);
  const ratio = isHomePreview ? (hasSource ? toHomePreviewRatio(rawRatio) : 2) : rawRatio;
  const aspectRatioValue = isHomePreview ? (ratio >= 1 ? "2 / 1" : "1 / 2") : media.aspectRatio ?? `${ratio}`;

  const style = {
    aspectRatio: aspectRatioValue,
    background
  } satisfies CSSProperties;

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
  } else if (isWork && hasSource && containerWidth && intrinsicWidth) {
    const shouldUseHorizontalFit = intrinsicWidth <= containerWidth;

    mediaStyle = shouldUseHorizontalFit
      ? {
          ...mediaStyle,
          width: "100%",
          height: "auto",
          maxWidth: "100%",
          maxHeight: "none"
        }
      : {
          ...mediaStyle,
          width: "auto",
          height: "50vh",
          maxWidth: "100%",
          maxHeight: "50vh"
        };
  } else if (isWork) {
    mediaStyle = {
      ...mediaStyle,
      maxHeight: "50vh",
      maxWidth: "100%",
      width: ratio >= 1 ? `min(100%, calc(50vh * ${ratio}))` : "auto",
      height: ratio >= 1 ? "auto" : "50vh"
    };
  }

  const wrapperStyle: CSSProperties | undefined =
    isWork && hasSource
      ? ({
          ["--placeholder-bg" as string]: "transparent",
          ["--placeholder-border-width" as string]: "0px",
          ["--placeholder-border-color" as string]: "transparent"
        } as CSSProperties)
      : undefined;

  return (
    <div className={styles.host}>
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
        ref={wrapperRef}
      >
        <div
          className={[styles.media, isWork && styles.workMedia, hasSource && styles.hasAsset].filter(Boolean).join(" ")}
          style={mediaStyle}
          aria-label={`${media.kind} placeholder ${placeholderToken}`}
        >
          {media.src ? (
            media.kind === "video" ? (
              <video
                className={styles.asset}
                src={media.src}
                autoPlay
                muted
                loop
                playsInline
                onLoadedMetadata={(event) => {
                  const nextWidth = event.currentTarget.videoWidth;
                  const nextHeight = event.currentTarget.videoHeight;
                  setIntrinsicWidth(nextWidth);
                  if (nextHeight > 0) {
                    setIntrinsicRatio(nextWidth / nextHeight);
                  }
                }}
              />
            ) : (
              // We intentionally allow plain <img> to support arbitrary trusted URL schemes from JSON content.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={styles.asset}
                src={media.src}
                alt={media.caption ?? ""}
                loading="lazy"
                onLoad={(event) => {
                  const nextWidth = event.currentTarget.naturalWidth;
                  const nextHeight = event.currentTarget.naturalHeight;
                  setIntrinsicWidth(nextWidth);
                  if (nextHeight > 0) {
                    setIntrinsicRatio(nextWidth / nextHeight);
                  }
                }}
              />
            )
          ) : (
            <span className={[styles.mediaLabel, isWork && styles.workMediaLabel].filter(Boolean).join(" ")}>
              {media.kind === "video" && (
                <span
                  className={[styles.videoDot, isWork && styles.workVideoDot].filter(Boolean).join(" ")}
                  aria-hidden="true"
                />
              )}
              {media.kind === "video" ? "Video Placeholder" : media.kind === "gif" ? "GIF Placeholder" : "Image Placeholder"}
            </span>
          )}
        </div>
      </div>
      {media.caption && (
        <p className={[styles.caption, isWork && styles.workCaption].filter(Boolean).join(" ")}>{media.caption}</p>
      )}
    </div>
  );
}
