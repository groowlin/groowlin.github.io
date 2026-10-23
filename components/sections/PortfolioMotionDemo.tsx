"use client";

import { type ComponentType, type RefObject, useEffect, useRef, useState } from "react";
import styles from "./portfolio-motion-demo.module.css";

type DemoRuntimeProps = { rootRef: RefObject<HTMLDivElement | null> };
let runtimePromise: Promise<ComponentType<DemoRuntimeProps>> | null = null;

function loadRuntime() {
  runtimePromise ??= import("./PortfolioMotionDemoRuntime")
    .then((module) => module.PortfolioMotionDemoRuntime)
    .catch((error: unknown) => {
      runtimePromise = null;
      throw error;
    });
  return runtimePromise;
}

export function PortfolioMotionDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [Runtime, setRuntime] = useState<ComponentType<DemoRuntimeProps> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pending = false;
    let failed = false;
    let inPlaybackRange = false;
    let retriesRemaining = 2;

    const load = () => {
      if (cancelled || pending) return;
      pending = true;
      failed = false;
      void loadRuntime()
        .then((Component) => {
          if (cancelled) return;
          setRuntime(() => Component);
          observer?.disconnect();
        })
        .catch(() => {
          pending = false;
          failed = true;
        });
    };
    const retryWhenAvailable = () => {
      if (cancelled || !failed || !inPlaybackRange || document.hidden || retriesRemaining <= 0) return;
      retriesRemaining -= 1;
      load();
    };
    const observer = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([entry]) => {
          inPlaybackRange = entry?.isIntersecting ?? false;
          if (inPlaybackRange) load();
        }, { rootMargin: "100px 0px" })
      : null;

    if (observer && rootRef.current) {
      observer.observe(rootRef.current);
    } else {
      inPlaybackRange = true;
      load();
    }
    window.addEventListener("online", retryWhenAvailable);
    document.addEventListener("visibilitychange", retryWhenAvailable);

    return () => {
      cancelled = true;
      observer?.disconnect();
      window.removeEventListener("online", retryWhenAvailable);
      document.removeEventListener("visibilitychange", retryWhenAvailable);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.root} data-page-reveal="" aria-hidden="true">
      <div className={styles.sceneViewport}>
        {Runtime ? <Runtime rootRef={rootRef} /> : null}
      </div>
    </div>
  );
}
