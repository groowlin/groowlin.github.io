import type { CSSProperties } from "react";
import type { MediaPlaceholder } from "@/lib/content/types";

function parseAspectRatio(input?: string) {
  if (!input) return null;
  const [rawWidth, rawHeight] = input.split("/").map((value) => Number(value.trim()));
  if (!Number.isFinite(rawWidth) || !Number.isFinite(rawHeight) || rawHeight === 0) return null;
  return rawWidth / rawHeight;
}

function toHomePreviewRatio(value: number) {
  return value >= 1 ? 2 : 0.5;
}

export function getMediaLayout({ media, variant, presentation, fit, appearance, intrinsicRatio }: {
  media: MediaPlaceholder;
  variant: "default" | "work" | "homePreview";
  presentation: "inline" | "modal";
  fit: "fill" | "contain";
  appearance: "default" | "skeleton" | "handoff";
  intrinsicRatio: number | null;
}) {
  const hasSource = Boolean(media.src);
  const isWork = variant === "work";
  const isHomePreview = variant === "homePreview";
  const isModal = presentation === "modal";
  const isSkeleton = appearance === "skeleton";
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

  return { mediaStyle, wrapperStyle };
}
