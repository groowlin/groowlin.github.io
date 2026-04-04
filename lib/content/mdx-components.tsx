import Link from "next/link";
import { MediaPlaceholderView } from "@/components/media/MediaPlaceholder";
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
    Media: ({
      kind = "image",
      src,
      aspectRatio,
      caption,
      placeholderToken,
      bleed
    }: MediaProps) => (
      <MediaPlaceholderView
        media={{ kind, src, aspectRatio, caption, placeholderToken, bleed }}
        variant={variant === "work" ? "work" : "default"}
      />
    ),
    Cta: ({ href, label, body }: CtaProps) => (
      <section>
        {body ? <p>{body}</p> : null}
        <Link href={href}>{label}</Link>
      </section>
    )
  };
}
