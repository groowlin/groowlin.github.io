"use client";

import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import type { MediaPlaceholder } from "@/lib/content/types";
import styles from "@/components/media/gallery-lightbox.module.css";

export interface OpeningImageSource {
  index: number;
  src: string;
  width: number;
  height: number;
}

function useDecodedImage(src: string | undefined, ref: RefObject<HTMLImageElement | null>) {
  const [decodedSource, setDecodedSource] = useState<string | null>(null);

  useLayoutEffect(() => {
    const image = ref.current;
    if (!image || !src) return;
    let cancelled = false;
    let decoding = false;
    const decode = async () => {
      if (decoding || image.naturalWidth === 0) return;
      decoding = true;
      try {
        await image.decode();
        if (!cancelled && image.naturalWidth > 0) setDecodedSource(src);
      } catch {
        // A failed or cancelled asset stays invisible, without a placeholder.
      } finally {
        decoding = false;
      }
    };
    const loaded = () => void decode();
    const failed = () => setDecodedSource(null);
    image.addEventListener("load", loaded);
    image.addEventListener("error", failed);
    if (image.complete) void decode();
    return () => {
      cancelled = true;
      image.removeEventListener("load", loaded);
      image.removeEventListener("error", failed);
      setDecodedSource(null);
    };
  }, [ref, src]);

  return Boolean(src && decodedSource === src);
}

function ImageLayers({ item, active, loadFull, revealFull, openingSource }: {
  item: MediaPlaceholder;
  active: boolean;
  loadFull: boolean;
  revealFull: boolean;
  openingSource?: OpeningImageSource;
}) {
  const lowSrc = openingSource?.src ?? item.src;
  const fullSrc = loadFull && item.fullSrc !== lowSrc ? item.fullSrc : undefined;
  const lowRef = useRef<HTMLImageElement | null>(null);
  const fullRef = useRef<HTMLImageElement | null>(null);
  const lowReady = useDecodedImage(lowSrc, lowRef);
  const fullReady = useDecodedImage(fullSrc, fullRef);
  const showFull = active && revealFull && fullReady;
  const showLow = active && (Boolean(openingSource) || lowReady) && !showFull;

  return (
    <>
      {lowSrc ? (
        // Decode and present the same persistent DOM element.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={lowRef}
          className={styles.decodedImage}
          src={lowSrc}
          width={openingSource?.width ?? item.intrinsicWidth}
          height={openingSource?.height ?? item.intrinsicHeight}
          alt={item.caption ?? ""}
          loading="eager"
          decoding="async"
          fetchPriority={active ? "high" : "low"}
          draggable={false}
          aria-hidden={!showLow}
          data-lightbox-image-active={showLow ? "true" : undefined}
          style={{ visibility: showLow ? "visible" : "hidden" }}
        />
      ) : null}
      {fullSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={fullSrc}
          ref={fullRef}
          className={styles.decodedImage}
          src={fullSrc}
          width={item.fullIntrinsicWidth}
          height={item.fullIntrinsicHeight}
          alt={item.caption ?? ""}
          loading="eager"
          decoding="async"
          fetchPriority={active ? "high" : "low"}
          draggable={false}
          aria-hidden={!showFull}
          data-lightbox-image-active={showFull ? "true" : undefined}
          style={{ visibility: showFull ? "visible" : "hidden" }}
        />
      ) : null}
    </>
  );
}

export function LightboxImageLayers({ items, activeIndex, revealFull, openingSource }: {
  items: MediaPlaceholder[];
  activeIndex: number;
  revealFull: boolean;
  openingSource: OpeningImageSource | null;
}) {
  return items.map((item, index) => item.kind === "video" ? null : (
    <ImageLayers
      key={`${index}-${item.src ?? ""}`}
      item={item}
      active={index === activeIndex}
      loadFull={revealFull && Math.abs(index - activeIndex) <= 1}
      revealFull={revealFull}
      openingSource={openingSource?.index === index ? openingSource : undefined}
    />
  ));
}
