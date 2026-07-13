"use client";

import { useLayoutEffect, useRef } from "react";
import styles from "@/components/motion/page-reveal-sequence.module.css";

interface PageRevealSequenceProps {
  children: React.ReactNode;
  className?: string;
  onTargetReady?: (target: HTMLElement) => void;
}

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function PageRevealSequence({ children, className, onTargetReady }: PageRevealSequenceProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const onTargetReadyRef = useRef(onTargetReady);

  useLayoutEffect(() => {
    onTargetReadyRef.current = onTargetReady;
  }, [onTargetReady]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    root.dataset.state = "pending";

    const allTargets = Array.from(root.querySelectorAll("[data-page-reveal]")) as HTMLElement[];
    const targets = allTargets.filter(
      (target) => !target.querySelector("[data-page-reveal]") && target.closest("[data-page-reveal-root]") === root
    );

    const frameIds = new Set<number>();
    let timeoutId = 0;
    let disposed = false;

    const requestFrame = (callback: FrameRequestCallback) => {
      const frameId = window.requestAnimationFrame((time) => {
        frameIds.delete(frameId);
        callback(time);
      });
      frameIds.add(frameId);
      return frameId;
    };

    const markTargetReady = (target: HTMLElement) => {
      if (
        disposed ||
        !target.isConnected ||
        target.closest("[data-page-reveal-root]") !== root ||
        target.dataset.pageRevealState === "ready"
      ) {
        return;
      }

      target.dataset.pageRevealState = "ready";
      onTargetReadyRef.current?.(target);
    };

    const clearTargetAnimationState = (target: HTMLElement) => {
      if (disposed || !target.isConnected || target.closest("[data-page-reveal-root]") !== root) {
        return;
      }

      delete target.dataset.pageRevealActive;
      target.style.removeProperty("--page-reveal-index");
    };

    const markInstantTargetReady = (target: HTMLElement) => {
      if (disposed || !target.isConnected || target.closest("[data-page-reveal-root]") !== root) {
        return;
      }

      target.dataset.pageRevealState = "instant";
      delete target.dataset.pageRevealActive;
      target.style.removeProperty("--page-reveal-index");
      onTargetReadyRef.current?.(target);
    };

    targets.forEach((target) => {
      target.dataset.pageRevealState = "pending";
    });

    const prepareTargets = () => {
      let revealIndex = 0;

      targets.forEach((target) => {
        delete target.dataset.pageRevealActive;

        const rect = target.getBoundingClientRect();
        const isAboveViewport = rect.bottom <= 0;

        if (isAboveViewport) {
          markInstantTargetReady(target);
          return;
        }

        target.dataset.pageRevealState = "animate";
        target.style.setProperty("--page-reveal-index", String(revealIndex));
        target.dataset.pageRevealActive = "true";
        revealIndex += 1;
      });

      root.dataset.state = "ready";

      requestFrame(() => {
        targets.forEach((target) => {
          if (disposed || target.dataset.pageRevealState !== "animate") return;

          const animations = target.getAnimations();
          if (animations.length === 0) {
            markTargetReady(target);
            clearTargetAnimationState(target);
            return;
          }

          const visibilityAnimations = animations.filter((animation) => {
            const effect = animation.effect;
            if (!(effect instanceof KeyframeEffect)) return false;

            return effect
              .getKeyframes()
              .some((keyframe) => keyframe.opacity !== undefined || keyframe.filter !== undefined);
          });

          if (visibilityAnimations.length === 0) {
            markTargetReady(target);
          } else {
            void Promise.allSettled(visibilityAnimations.map((animation) => animation.finished)).then(() => {
              markTargetReady(target);
            });
          }

          void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
            clearTargetAnimationState(target);
          });
        });
      });
    };

    const queuePrepareTargets = () => {
      requestFrame(() => {
        requestFrame(() => {
          prepareTargets();
        });
      });
    };

    const onScrollRestored = () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("app:scroll-restored", onScrollRestored);
      queuePrepareTargets();
    };

    window.addEventListener("app:scroll-restored", onScrollRestored, { once: true });
    timeoutId = window.setTimeout(onScrollRestored, 250);

    return () => {
      disposed = true;
      frameIds.forEach((frameId) => window.cancelAnimationFrame(frameId));
      frameIds.clear();
      window.clearTimeout(timeoutId);
      window.removeEventListener("app:scroll-restored", onScrollRestored);
      delete root.dataset.state;
      targets.forEach((target) => {
        target.style.removeProperty("--page-reveal-index");
        delete target.dataset.pageRevealActive;
        delete target.dataset.pageRevealState;
      });
    };
  }, []);

  return (
    <div ref={rootRef} className={joinClassNames(styles.root, className)} data-page-reveal-root="" data-state="pending">
      {children}
    </div>
  );
}
