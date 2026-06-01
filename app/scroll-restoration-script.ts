export const scrollRestorationScript = `
(() => {
  if (typeof window === "undefined" || typeof sessionStorage === "undefined") {
    return;
  }

  const root = document.documentElement;
  const storageKey = "scroll:" + window.location.pathname + window.location.search;
  const maxRestoreAttempts = 120;
  const restoredEventName = "app:scroll-restored";
  const navigationEntry = performance.getEntriesByType("navigation")[0];
  const navigationType = navigationEntry && "type" in navigationEntry ? navigationEntry.type : "navigate";
  let hasFinishedRestore = false;
  let hasStartedRestore = false;
  let lastStoredPosition = null;

  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  const isValidPosition = (position) =>
    Boolean(position) &&
    typeof position.x === "number" &&
    typeof position.y === "number";

  const readStoredPosition = () => {
    try {
      const rawValue = window.sessionStorage.getItem(storageKey);
      const parsedValue = rawValue ? JSON.parse(rawValue) : null;

      return isValidPosition(parsedValue) ? parsedValue : null;
    } catch {
      return null;
    }
  };

  const saveScrollPosition = ({ preserveNonZeroTop = false } = {}) => {
    const nextPosition = { x: window.scrollX, y: window.scrollY };
    const previousPosition = lastStoredPosition || readStoredPosition();

    if (
      preserveNonZeroTop &&
      nextPosition.x === 0 &&
      nextPosition.y === 0 &&
      previousPosition &&
      (previousPosition.x > 0 || previousPosition.y > 0)
    ) {
      lastStoredPosition = previousPosition;
      return;
    }

    lastStoredPosition = nextPosition;

    try {
      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify(nextPosition)
      );
    } catch {}
  };

  let saveFrameId = 0;

  const scheduleSave = () => {
    if (saveFrameId) {
      window.cancelAnimationFrame(saveFrameId);
    }

    saveFrameId = window.requestAnimationFrame(() => {
      saveFrameId = 0;
      saveScrollPosition();
    });
  };

  const savedPosition = readStoredPosition();
  lastStoredPosition = savedPosition;

  const hasSavedPosition = isValidPosition(savedPosition);

  const shouldGuardInitialPaint =
    !window.location.hash &&
    navigationType === "reload" &&
    hasSavedPosition &&
    savedPosition.y > 0;

  root.dataset.scrollRestoration = shouldGuardInitialPaint ? "pending" : "ready";

  const finishRestore = () => {
    if (hasFinishedRestore) {
      return;
    }

    hasFinishedRestore = true;
    root.dataset.scrollRestoration = "ready";
    window.dispatchEvent(new Event(restoredEventName));
  };

  const restoreScrollPosition = () => {
    if (hasStartedRestore) {
      return;
    }

    hasStartedRestore = true;

    if (window.location.hash) {
      finishRestore();
      return;
    }

    if (
      !savedPosition ||
      typeof savedPosition.x !== "number" ||
      typeof savedPosition.y !== "number"
    ) {
      finishRestore();
      return;
    }

    let attempts = 0;

    const applyRestore = () => {
      const maxX = Math.max(0, root.scrollWidth - window.innerWidth);
      const maxY = Math.max(0, root.scrollHeight - window.innerHeight);
      const nextX = Math.min(savedPosition.x, maxX);
      const nextY = Math.min(savedPosition.y, maxY);

      window.scrollTo(nextX, nextY);
      attempts += 1;

      if (root.scrollHeight < savedPosition.y + window.innerHeight && attempts < maxRestoreAttempts) {
        window.requestAnimationFrame(applyRestore);
        return;
      }

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          finishRestore();
        });
      });
    };

    window.requestAnimationFrame(applyRestore);
  };

  window.addEventListener("scroll", scheduleSave, { passive: true });
  window.addEventListener("pagehide", () => saveScrollPosition({ preserveNonZeroTop: true }));
  window.addEventListener("beforeunload", () => saveScrollPosition({ preserveNonZeroTop: true }));
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      saveScrollPosition({ preserveNonZeroTop: true });
    }
  });

  if (document.readyState === "complete") {
    restoreScrollPosition();
  } else {
    window.addEventListener("DOMContentLoaded", restoreScrollPosition, { once: true });
    window.addEventListener("load", restoreScrollPosition, { once: true });
  }
})();
`;
