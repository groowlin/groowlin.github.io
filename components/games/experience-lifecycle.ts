export type ExperiencePhase = "closed" | "scrolling" | "opening" | "open" | "returning" | "closing";

function aborted() { return new DOMException("Games interaction cancelled", "AbortError"); }

export function calculateGameFrameTop(panelHeight: number, bubbleTop: number, frameHeight: number, panelTop = 0) {
  const bubbleTopInPanel = bubbleTop - panelTop;
  const midpointTop = (bubbleTopInPanel - frameHeight) / 2;
  return Math.max(0, Math.min(midpointTop, Math.max(0, panelHeight - frameHeight)));
}

export function nextFrame(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(aborted()); return; }
    const cancel = () => { cancelAnimationFrame(frame); reject(aborted()); };
    const frame = requestAnimationFrame(() => {
      signal.removeEventListener("abort", cancel);
      resolve();
    });
    signal.addEventListener("abort", cancel, { once: true });
  });
}

export async function waitForAnimations(element: Element | null, signal: AbortSignal): Promise<void> {
  await nextFrame(signal);
  if (!element) return;
  const animations = element.getAnimations();
  if (!animations.length) return;
  await new Promise<void>((resolve, reject) => {
    const cancel = () => reject(aborted());
    signal.addEventListener("abort", cancel, { once: true });
    Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      signal.removeEventListener("abort", cancel);
      if (signal.aborted) reject(aborted());
      else resolve();
    });
  });
}

export async function waitForCloseExit(
  getMascot: () => Promise<void>,
  getFrame: () => Promise<void>
): Promise<void> {
  await Promise.all([getMascot(), getFrame()]);
}

export async function waitForReturnThenReveal(
  runReturnScroll: () => Promise<void>,
  revealDefaultMascot: () => Promise<void>
): Promise<void> {
  await runReturnScroll();
  await revealDefaultMascot();
}

async function scrollTo(destination: number, reducedMotion: boolean, signal: AbortSignal, onStart?: () => void): Promise<void> {
  const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const nextTop = Math.max(0, Math.min(destination, maximum));
  if (Math.abs(window.scrollY - nextTop) <= 1) { onStart?.(); return; }

  await new Promise<void>((resolve, reject) => {
    let frame = 0;
    let previous = window.scrollY;
    let moved = false;
    let stableFrames = 0;
    const cleanup = () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("scrollend", finish);
      signal.removeEventListener("abort", cancel);
    };
    const finish = () => {
      if (!moved && Math.abs(window.scrollY - nextTop) > 1) return;
      cleanup();
      resolve();
    };
    const cancel = () => { cleanup(); reject(aborted()); };
    const sample = () => {
      const current = window.scrollY;
      if (Math.abs(current - previous) > 0.1) {
        moved = true;
        stableFrames = 0;
      } else stableFrames += 1;
      previous = current;
      if (moved && stableFrames >= 4) finish();
      else frame = requestAnimationFrame(sample);
    };
    document.addEventListener("scrollend", finish);
    signal.addEventListener("abort", cancel, { once: true });
    onStart?.();
    window.scrollTo({ top: nextTop, behavior: reducedMotion ? "auto" : "smooth" });
    if (reducedMotion && Math.abs(window.scrollY - nextTop) <= 1) finish();
    else frame = requestAnimationFrame(sample);
  });
}

/** Completes on actual scrollend, or settled scroll positions when scrollend is unavailable. */
export async function scrollToElement(target: HTMLElement | null, block: "start" | "end", reducedMotion: boolean, signal: AbortSignal, onStart?: () => void): Promise<void> {
  // Let React commit the reserved/collapsed geometry before measuring the target.
  await nextFrame(signal);
  await nextFrame(signal);
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  const requested = block === "start" ? window.scrollY + rect.top - margin : window.scrollY + rect.bottom - window.innerHeight;
  await scrollTo(requested, reducedMotion, signal, onStart);
}

export async function scrollToPageBottom(reducedMotion: boolean, signal: AbortSignal, onStart?: () => void): Promise<void> {
  // Let React commit the reserved 100svh panel before calculating the final page bottom.
  await nextFrame(signal);
  await nextFrame(signal);
  await scrollTo(document.documentElement.scrollHeight - window.innerHeight, reducedMotion, signal, onStart);
}
