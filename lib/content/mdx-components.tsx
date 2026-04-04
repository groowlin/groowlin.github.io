import Link from "next/link";
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
import type { MediaBleed, MediaKind } from "@/lib/content/types";

interface MediaProps {
  kind?: MediaKind;
  src?: string;
  aspectRatio?: string;
  caption?: string;
  placeholderToken?: string;
  bleed?: MediaBleed;
}

interface CtaProps {
  href: string;
  label: string;
  body?: string;
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
    Media: ({
      kind = "image",
      src,
      aspectRatio,
      caption,
      placeholderToken,
      bleed
    }: MediaProps) => (
      <MdxMediaBlock>
        <MediaPlaceholderView
          media={{ kind, src, aspectRatio, caption, placeholderToken, bleed }}
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
