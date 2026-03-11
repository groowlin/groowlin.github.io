import { type CSSProperties } from "react";
import { type MediaPlaceholder } from "@/lib/content/types";
import styles from "@/components/media/media-placeholder.module.css";

interface MediaPlaceholderProps {
  media: MediaPlaceholder;
  className?: string;
}

function tokenToHue(token: string) {
  let hash = 0;
  for (let i = 0; i < token.length; i += 1) {
    hash = (hash * 31 + token.charCodeAt(i)) % 360;
  }
  return hash;
}

export function MediaPlaceholderView({ media, className }: MediaPlaceholderProps) {
  const hue = tokenToHue(media.posterToken);

  const background = `linear-gradient(135deg, hsl(${hue} 72% 88%), hsl(${(hue + 40) % 360} 55% 78%))`;

  const style = {
    aspectRatio: media.aspectRatio,
    background
  } satisfies CSSProperties;

  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(" ")}>
      <div className={styles.media} style={style} aria-label={`${media.kind} placeholder ${media.posterToken}`}>
        <span className={styles.mediaLabel}>
          {media.kind === "video" && <span className={styles.videoDot} aria-hidden="true" />}
          {media.kind === "video" ? "Video Placeholder" : "Image Placeholder"}
        </span>
      </div>
      {media.caption && <p className={styles.caption}>{media.caption}</p>}
    </div>
  );
}
