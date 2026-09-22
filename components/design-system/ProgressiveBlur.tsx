import type { CSSProperties } from "react";
import styles from "./progressive-blur.module.css";

export type ProgressiveBlurDirection = "left-to-right" | "right-to-left" | "top-to-bottom" | "bottom-to-top";

export type ProgressiveBlurLayer = {
  blur: number;
  maskStart: number;
  maskEnd: number;
};

type Props = {
  direction: ProgressiveBlurDirection;
  layers: readonly ProgressiveBlurLayer[];
};

const GRADIENT_DIRECTIONS: Record<ProgressiveBlurDirection, string> = {
  "left-to-right": "to right",
  "right-to-left": "to left",
  "top-to-bottom": "to bottom",
  "bottom-to-top": "to top",
};

type LayerStyle = CSSProperties & {
  "--progressive-blur": string;
  "--progressive-blur-mask-start": string;
  "--progressive-blur-mask-end": string;
  "--progressive-blur-direction": string;
};

export function ProgressiveBlur({ direction, layers }: Props) {
  return <>
    {layers.map((layer, index) => {
      const style: LayerStyle = {
        zIndex: index + 1,
        "--progressive-blur": `${layer.blur}px`,
        "--progressive-blur-mask-start": `${layer.maskStart}%`,
        "--progressive-blur-mask-end": `${layer.maskEnd}%`,
        "--progressive-blur-direction": GRADIENT_DIRECTIONS[direction],
      };

      return <span key={index} className={styles.layer} data-blur-step={index} style={style} aria-hidden="true" />;
    })}
  </>;
}
