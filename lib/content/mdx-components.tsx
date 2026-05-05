import { Children, isValidElement, type AnchorHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { GalleryLightbox } from "@/components/media/GalleryLightbox";
import { MediaPlaceholderView } from "@/components/media/MediaPlaceholder";
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
  openable?: boolean;
}

interface CtaProps {
  href: string;
  label: string;
  body?: string;
}

interface GalleryProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
  variant?: "default" | "work";
}

function isExternalHref(href: string) {
  return /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i.test(href);
}

function getExternalLinkProps(href: string) {
  return isExternalHref(href) ? { target: "_blank", rel: "noopener noreferrer" } : {};
}

function Gallery({ children, className, style, variant = "default", ...props }: GalleryProps) {
  const items = Children.toArray(children).flatMap((child) => {
    if (!isValidElement<MediaProps>(child)) {
      return [];
    }

    return [
      {
        kind: child.props.kind ?? "image",
        src: child.props.src,
        aspectRatio: child.props.aspectRatio,
        caption: child.props.caption,
        placeholderToken: child.props.placeholderToken,
        openable: child.props.openable ?? true
      }
    ];
  });

  if (items.length === 0) {
    return null;
  }

  return (
    <MdxMediaBlock>
      <GalleryLightbox
        {...props}
        items={items}
        variant={variant}
        className={className}
        style={style}
      />
    </MdxMediaBlock>
  );
}

function MdxLink({ href = "", rel, target, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const externalLinkProps = getExternalLinkProps(href);

  return <a href={href} rel={rel ?? externalLinkProps.rel} target={target ?? externalLinkProps.target} {...props} />;
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
    a: MdxLink,
    Gallery: (props: GalleryProps) => <Gallery {...props} variant={variant} />,
    gallery: (props: GalleryProps) => <Gallery {...props} variant={variant} />,
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
        <Link href={href} {...getExternalLinkProps(href)}>
          {label}
        </Link>
      </MdxSection>
    )
  };
}
