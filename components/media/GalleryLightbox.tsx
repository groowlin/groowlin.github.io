"use client";

import { type ComponentType, type CSSProperties, type HTMLAttributes, type MutableRefObject, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MdxMediaBlock } from "@/components/motion/MdxMotionComponents";
import { MediaPlaceholderView } from "./MediaPlaceholder";
import { useGalleryLightboxScope } from "./GalleryLightboxScope";
import { preloadImageSource } from "./lightbox-image-preload";
import type { MediaPlaceholder } from "@/lib/content/types";
import styles from "./gallery-lightbox.module.css";

interface GalleryMediaItem extends MediaPlaceholder { openable?: boolean; }
interface GalleryLightboxProps extends HTMLAttributes<HTMLDivElement> { items: GalleryMediaItem[]; variant?: "default" | "work"; }
interface OpenRequest { items: GalleryMediaItem[]; revision: number; localIndex: number; restoreFocus: boolean; clientX: number; clientY: number; }
interface InlineVisualState { activeIndex: number | null; closingSourceIndex: number | null; forceDissolve: boolean; isVideoClosing: boolean; }
export interface GalleryRuntimeProps {
  items: GalleryMediaItem[];
  variant: "default" | "work";
  registrationId: string;
  triggerRefs: MutableRefObject<Map<number, HTMLButtonElement | null>>;
  triggerMediaRefs: MutableRefObject<Map<number, HTMLDivElement | null>>;
  request: OpenRequest;
  latestRequestRevision: { current: number };
  onVisualStateChange: (state: InlineVisualState) => void;
}
const latestRequestRevision = { current: 0 };
let runtimePromise: Promise<ComponentType<GalleryRuntimeProps>> | null = null;
function loadRuntime() {
  runtimePromise ??= import("./GalleryLightboxRuntime").then((module) => module.GalleryLightboxRuntime).catch((error: unknown) => { runtimePromise = null; throw error; });
  return runtimePromise;
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

export function GalleryLightbox({ items, variant = "default", className, style, ...props }: GalleryLightboxProps) {
  const registrationId = useId();
  const galleryScope = useGalleryLightboxScope();
  const triggerRefs = useRef(new Map<number, HTMLButtonElement | null>());
  const triggerMediaRefs = useRef(new Map<number, HTMLDivElement | null>());
  const mountedRef = useRef(false);
  const [Runtime, setRuntime] = useState<ComponentType<GalleryRuntimeProps> | null>(null);
  const [request, setRequest] = useState<OpenRequest | null>(null);
  const [visualState, setVisualState] = useState<InlineVisualState>({ activeIndex: null, closingSourceIndex: null, forceDissolve: false, isVideoClosing: false });
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
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

  const scopedItems = useMemo(() => {
    const registrations = galleryScope?.registrations ?? [{ id: registrationId, items }];

    return registrations.flatMap((registration) => registration.items.flatMap((item, localIndex) =>
      item.openable === false ? [] : [{ item, localIndex, registrationId: registration.id }]
    ));
  }, [galleryScope?.registrations, items, registrationId]);

  const getGlobalIndex = (localIndex: number) => scopedItems.findIndex((entry) =>
    entry.registrationId === registrationId && entry.localIndex === localIndex
  );

  if (items.length === 0) return null;
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
              const isActiveTrigger = globalIndex >= 0 && visualState.activeIndex === globalIndex;
              const isClosingSourceTrigger = globalIndex >= 0 && visualState.closingSourceIndex === globalIndex;
              const isClosingHandoffTrigger = isClosingSourceTrigger && visualState.forceDissolve;

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
                        isActiveTrigger && !visualState.isVideoClosing && styles.triggerHidden
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onPointerEnter={() => {
                        void preloadImageSource(item.fullSrc);
                        void loadRuntime().catch(() => undefined);
                      }}
                      onFocus={() => {
                        void preloadImageSource(item.fullSrc);
                        void loadRuntime().catch(() => undefined);
                      }}
                      onClick={(event) => {
                        setRequest({ items, revision: ++latestRequestRevision.current, localIndex: absoluteIndex, restoreFocus: event.detail === 0, clientX: event.clientX, clientY: event.clientY });
                        void loadRuntime().then((Component) => {
                          if (mountedRef.current) setRuntime(() => Component);
                        }).catch(() => undefined);
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
      {Runtime && request ? <Runtime items={items} variant={variant} registrationId={registrationId} triggerRefs={triggerRefs} triggerMediaRefs={triggerMediaRefs} request={request} latestRequestRevision={latestRequestRevision} onVisualStateChange={setVisualState} /> : null}
    </>
  );
}
