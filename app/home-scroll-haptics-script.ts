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
  let hasPreparedVibration = false;

  const canVibrate = () => isHomePath() && !reducedMotionQuery.matches;

  const prepare = () => {
    if (hasPreparedVibration || !canVibrate()) {
      return;
    }

    hasPreparedVibration = navigator.vibrate(durationMs);
    lastTick = getTick();
  };

  const trigger = () => {
    if (!canVibrate()) {
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
  window.addEventListener("pointerdown", prepare, { passive: true });
  window.addEventListener("pointerup", prepare, { passive: true });
  window.addEventListener("touchstart", prime, { passive: true });
  window.addEventListener("touchend", prepare, { passive: true });
  window.addEventListener("touchmove", trigger, { passive: true });
  window.addEventListener("scroll", trigger, { passive: true });
  window.addEventListener("click", prepare, { passive: true });
  window.addEventListener("keydown", prepare);
  window.addEventListener("pageshow", prime);
  window.addEventListener("app:scroll-restored", prime);
})();
`;
