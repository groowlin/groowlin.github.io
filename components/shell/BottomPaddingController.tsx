"use client";

import { useEffect } from "react";

const FIT_TOLERANCE_PX = 1;

export function BottomPaddingController() {
  useEffect(() => {
    const main = document.querySelector<HTMLElement>("[data-page-main]");
    const contentEnd = document.querySelector<HTMLElement>("[data-page-content-end]");

    if (!main || !contentEnd) {
      return undefined;
    }

    let frame = 0;

    const syncBottomPadding = () => {
      window.cancelAnimationFrame(frame);

      frame = window.requestAnimationFrame(() => {
        main.dataset.trimBottomPadding =
          contentEnd.getBoundingClientRect().bottom <= window.innerHeight + FIT_TOLERANCE_PX
            ? "true"
            : "false";
      });
    };

    const resizeObserver = new ResizeObserver(syncBottomPadding);
    resizeObserver.observe(main);
    resizeObserver.observe(contentEnd);

    syncBottomPadding();
    window.addEventListener("resize", syncBottomPadding);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncBottomPadding);
      delete main.dataset.trimBottomPadding;
    };
  }, []);

  return null;
}
