export const homeScrollHapticsScript = `
(() => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return;
  }

  if (window.__homeScrollHapticsInstalled) {
    return;
  }

  if (!("vibrate" in navigator)) {
    return;
  }

  const tickPx = 80;
  const durationMs = 1;
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const isHomePath = () => window.location.pathname === "/";
  const getTick = () => Math.floor(Math.max(0, window.scrollY) / tickPx);
  let lastTick = getTick();

  const trigger = () => {
    if (!isHomePath()) {
      return;
    }

    if (reducedMotionQuery.matches) {
      return;
    }

    const nextTick = getTick();
    if (nextTick === lastTick) {
      return;
    }

    lastTick = nextTick;
    navigator.vibrate(durationMs);
  };

  const prime = () => {
    if (!isHomePath()) {
      return;
    }

    lastTick = getTick();
  };

  window.__homeScrollHapticsInstalled = true;
  window.addEventListener("touchstart", prime, { passive: true });
  window.addEventListener("touchmove", trigger, { passive: true });
  window.addEventListener("scroll", trigger, { passive: true });
  window.addEventListener("pageshow", prime);
  window.addEventListener("app:scroll-restored", prime);
})();
`;
