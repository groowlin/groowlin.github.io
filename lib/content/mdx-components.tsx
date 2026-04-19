import { Children, isValidElement, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { MediaPlaceholderView } from "@/components/media/MediaPlaceholder";
import galleryStyles from "@/components/media/mdx-gallery.module.css";
import {
  MdxBlockquote,
  MdxDiv,
  MdxH2,
  MdxH3,
  MdxLi,
  MdxMediaBlock,
  MdxOl,
  MdxP,
  MdxSection,
  MdxUl
} from "@/components/motion/MdxMotionComponents";
import type { MediaKind } from "@/lib/content/types";

interface MediaProps {
  kind?: MediaKind;
  src?: string;
  aspectRatio?: string;
  caption?: string;
  placeholderToken?: string;
}

interface CtaProps {
  href: string;
  label: string;
  body?: string;
}

interface GalleryProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
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

function Gallery({ children, className, style, ...props }: GalleryProps) {
  const items = Children.toArray(children).filter((child) => isValidElement(child));

  if (items.length === 0) {
    return null;
  }

  const rowSizes = getGalleryRowSizes(items.length);
  const rows = rowSizes.reduce<{ offset: number; rows: ReactNode[][] }>(
    (accumulator, size) => {
      const nextOffset = accumulator.offset + size;
      return {
        offset: nextOffset,
        rows: [...accumulator.rows, items.slice(accumulator.offset, nextOffset)]
      };
    },
    { offset: 0, rows: [] }
  ).rows;

  return (
    <MdxMediaBlock>
      <div
        {...props}
        className={[galleryStyles.gallery, className].filter(Boolean).join(" ")}
        style={
          {
            ...style,
            ["--media-bleed-offset" as string]: "0px"
          } satisfies CSSProperties
        }
      >
        {rows.map((rowItems, rowIndex) => (
          <div key={`gallery-row-${rowIndex}`} className={galleryStyles.row} data-columns={rowItems.length}>
            {rowItems.map((item, itemIndex) => (
              <div key={`gallery-item-${rowIndex}-${itemIndex}`} className={galleryStyles.item}>
                {item}
              </div>
            ))}
          </div>
        ))}
      </div>
    </MdxMediaBlock>
  );
}

export function getMdxComponents(variant: "default" | "work" = "default") {
  return {
    MotionDiv: MdxDiv,
    MotionSection: MdxSection,
    MotionH2: MdxH2,
    MotionH3: MdxH3,
    MotionP: MdxP,
    MotionUl: MdxUl,
    MotionOl: MdxOl,
    MotionLi: MdxLi,
    MotionBlockquote: MdxBlockquote,
    MotionMediaBlock: MdxMediaBlock,
    div: MdxDiv,
    h2: MdxH2,
    h3: MdxH3,
    p: MdxP,
    ul: MdxUl,
    ol: MdxOl,
    li: MdxLi,
    blockquote: MdxBlockquote,
    section: MdxSection,
    Gallery,
    gallery: Gallery,
    Media: ({
      kind = "image",
      src,
      aspectRatio,
      caption,
      placeholderToken
    }: MediaProps) => (
      <MdxMediaBlock>
        <MediaPlaceholderView
          media={{ kind, src, aspectRatio, caption, placeholderToken }}
          variant={variant === "work" ? "work" : "default"}
        />
      </MdxMediaBlock>
    ),
    Cta: ({ href, label, body }: CtaProps) => (
      <MdxSection>
        {body ? <MdxP>{body}</MdxP> : null}
        <Link href={href}>{label}</Link>
      </MdxSection>
    )
  };
}
