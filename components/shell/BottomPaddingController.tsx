"use client";

import { useEffect } from "react";

const FIT_TOLERANCE_PX = 1;
const TOP_TOLERANCE_PX = 1;

export function BottomPaddingController() {
  useEffect(() => {
    const main = document.querySelector<HTMLElement>("[data-page-main]");
    const contentEnd = document.querySelector<HTMLElement>("[data-page-content-end]");

    if (!main || !contentEnd) {
      return undefined;
    }

    let frame = 0;
    let timeoutId = 0;

    const syncBottomPadding = () => {
      window.cancelAnimationFrame(frame);

      frame = window.requestAnimationFrame(() => {
        main.dataset.trimBottomPadding =
          window.scrollY <= TOP_TOLERANCE_PX && contentEnd.getBoundingClientRect().bottom <= window.innerHeight + FIT_TOLERANCE_PX
            ? "true"
            : "false";
      });
    };

    const syncBottomPaddingStabilized = () => {
      window.clearTimeout(timeoutId);
      syncBottomPadding();

      timeoutId = window.setTimeout(() => {
        syncBottomPadding();
      }, 220);
    };

    const resizeObserver = new ResizeObserver(syncBottomPaddingStabilized);
    resizeObserver.observe(main);
    resizeObserver.observe(contentEnd);

    syncBottomPaddingStabilized();
    window.addEventListener("resize", syncBottomPaddingStabilized);
    window.addEventListener("load", syncBottomPaddingStabilized);
    window.addEventListener("app:scroll-restored", syncBottomPaddingStabilized);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncBottomPaddingStabilized);
      window.removeEventListener("load", syncBottomPaddingStabilized);
      window.removeEventListener("app:scroll-restored", syncBottomPaddingStabilized);
      delete main.dataset.trimBottomPadding;
    };
  }, []);

  return null;
}
