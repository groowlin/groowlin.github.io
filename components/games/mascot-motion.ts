const animations = new WeakMap<HTMLElement, Animation>();
const FIXED_PROPERTIES = ["position", "left", "top", "bottom", "transform"];

function clearPosition(element: HTMLElement) {
  FIXED_PROPERTIES.forEach((property) => element.style.removeProperty(property));
}

export function resetMascot(element: HTMLElement | null) {
  if (!element) return;
  animations.get(element)?.cancel();
  animations.delete(element);
  clearPosition(element);
  element.style.removeProperty("opacity");
  element.style.removeProperty("pointer-events");
}

export function hideMascotAtAnchor(element: HTMLElement | null) {
  if (!element) return;
  animations.get(element)?.cancel();
  animations.delete(element);
  clearPosition(element);
  element.style.opacity = "0";
  element.style.pointerEvents = "none";
}

export function freezeMascotVisual(element: HTMLElement | null) {
  if (!element) return;
  const hoverImages = element.querySelectorAll<HTMLElement>("[data-mascot-hover]");
  const showsHover = [...hoverImages].some((image) => getComputedStyle(image).visibility !== "hidden");
  element.dataset.mascotDepartureVariant = showsHover ? "hover" : "default";
  element.dataset.mascotDeparting = "true";
}

export function clearMascotVisual(element: HTMLElement | null) {
  if (!element) return;
  delete element.dataset.mascotDepartureVariant;
  delete element.dataset.mascotDeparting;
}

function freezePosition(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  element.style.position = "fixed";
  element.style.left = `${rect.left}px`;
  element.style.top = `${rect.top}px`;
  element.style.bottom = "auto";
  element.style.transform = "none";
  return rect;
}

async function play(element: HTMLElement, keyframes: Keyframe[], reducedMotion: boolean, signal: AbortSignal): Promise<void> {
  if (signal.aborted) throw new DOMException("Mascot interaction cancelled", "AbortError");
  const animation = element.animate(keyframes, { duration: reducedMotion ? 0 : 280, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" });
  animations.set(element, animation);
  const cancel = () => {
    // Preserve the currently rendered point before another toggle retargets the mascot.
    const rect = element.getBoundingClientRect();
    animation.cancel();
    element.style.position = "fixed";
    element.style.left = `${rect.left}px`;
    element.style.top = `${rect.top}px`;
    element.style.bottom = "auto";
    element.style.transform = "none";
    animations.delete(element);
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    await animation.finished;
    if (signal.aborted) throw new DOMException("Mascot interaction cancelled", "AbortError");
  } finally {
    signal.removeEventListener("abort", cancel);
  }
}

/** Freeze before the panel reserves space; the returned exit starts with the scroll. */
export function prepareMascotExit(element: HTMLElement | null, reducedMotion: boolean, signal: AbortSignal): () => Promise<void> {
  if (!element || element.style.opacity === "0") return async () => {};
  const rect = freezePosition(element);
  return async () => {
    await play(element, [{ transform: "translateY(0)" }, { transform: `translateY(${Math.max(rect.height, window.innerHeight - rect.top)}px)` }], reducedMotion, signal);
    element.style.opacity = "0";
    element.style.pointerEvents = "none";
    animations.get(element)?.cancel();
    animations.delete(element);
    clearPosition(element);
  };
}

export async function revealMascot(element: HTMLElement | null, reducedMotion: boolean, signal: AbortSignal) {
  if (!element) return;
  clearPosition(element);
  element.style.opacity = "1";
  element.style.pointerEvents = "auto";
  await play(element, [{ transform: "translateY(100%)" }, { transform: "translateY(0)" }], reducedMotion, signal);
  resetMascot(element);
}
