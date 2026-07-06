"use client";

import { useEffect } from "react";

const protectedAssetSelector = "img, svg, video, canvas";

function hasProtectedAssetTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(protectedAssetSelector));
}

export function AssetInteractionGuard() {
  useEffect(() => {
    const preventAssetBrowserAction = (event: Event) => {
      if (hasProtectedAssetTarget(event.target)) {
        event.preventDefault();
      }
    };

    document.addEventListener("dragstart", preventAssetBrowserAction, { capture: true });

    return () => {
      document.removeEventListener("dragstart", preventAssetBrowserAction, { capture: true });
    };
  }, []);

  return null;
}
