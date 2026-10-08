import type { ReactNode } from "react";
import styles from "./games-entry.module.css";

type GameFrameProps = {
  label: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function GameFrame({ label, children, footer }: GameFrameProps) {
  return (
    <section className={styles.frame} aria-label={label} data-game-frame="">
      <div className={styles.frameSurface}>
        {children}
      </div>
      {footer}
    </section>
  );
}
