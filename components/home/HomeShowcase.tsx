"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform
} from "framer-motion";
import {
  calcGeneratorDuration,
  type GeneratorFactory,
  type KeyframeGenerator,
  spring as createSpringGenerator,
  type ValueAnimationOptions
} from "framer-motion/dom";
import { createPortal } from "react-dom";
import { PageRevealSequence } from "@/components/motion/PageRevealSequence";
import { MediaPlaceholderView } from "@/components/media/MediaPlaceholder";
import { getCaseSlugFromHref, getCurrentPath, trackMetricaGoal } from "@/lib/analytics/yandex-metrica";
import { type HomeShowcaseSection, type HomeWorkEntry } from "@/lib/content/types";
import shellStyles from "@/components/shell/site-shell.module.css";
import styles from "@/components/home/home-showcase.module.css";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface HighlightState {
  rect: Rect;
  positionStiffness: number;
  positionDamping: number;
  positionFlightTimeScale: number;
  positionTailTimeScale: number;
}

interface TextReturnAnimationState {
  animation: Animation;
  element: HTMLSpanElement;
}

interface PendingTextHandoff {
  element: HTMLSpanElement;
  token: symbol;
  firstFrameId: number | null;
  secondFrameId: number | null;
}

interface PointerPosition {
  clientX: number;
  clientY: number;
}

interface SectionEntry {
  entry: HomeWorkEntry;
  index: number;
}

interface IndexedHomeSection {
  title?: string;
  items: SectionEntry[];
}

interface StickerFrameSwapProps {
  stickerSrcs: string[];
  frameIndex: number;
  isActive: boolean;
  shouldReduceMotion: boolean;
}

const PREVIEW_OFFSET_FALLBACK = 60;
const ACTIVE_TEXT_SHIFT_SCALE = 0.25;
const STICKER_PARALLAX_SCALE = 0.5;
const HIGHLIGHT_TARGET_TOLERANCE = 0.25;
const POSITION_STIFFNESS_NEAR = 320;
const POSITION_STIFFNESS_FAR = 460;
const POSITION_REFERENCE_DAMPING_RATIO_NEAR = 0.8;
const POSITION_REFERENCE_DAMPING_RATIO_FAR = 0.62;
const POSITION_OVERSHOOT_DISTANCE_SCALE_STEPS = 4.5;
const POSITION_OVERSHOOT_TARGET_KNEE_PX = 12;
const POSITION_OVERSHOOT_TARGET_CAP_PX = 18;
const POSITION_REFERENCE_FLIGHT_TIME_SCALE = 1.2;
const POSITION_TAIL_TIME_SCALE_NEAR = 1;
const POSITION_TAIL_TIME_SCALE_FAR = 2;
const POSITION_MASS = 0.9;
const SIZE_STIFFNESS = 220;
const SIZE_DAMPING = 22;
const SIZE_MASS = 1;
const GLASS_OPACITY_DURATION_SECONDS = 0.28;
const STICKER_APPEARANCE_DURATION_SECONDS = 0.7;
const STICKER_APPEARANCE_DELAY_SECONDS = GLASS_OPACITY_DURATION_SECONDS;
const STICKER_BLUR_PX = 4;
const STICKER_ROTATION_DEGREES = -15;
const STICKER_FRAME_INTERVAL_MS = 1000 / 5;
const STICKER_CYCLE_START_DELAY_MS = STICKER_APPEARANCE_DELAY_SECONDS * 1000;
const PUFFY_STAR_STICKER_SRC =
  "/media/cases/portfoliocase/sticker-puffy-star-darker-yellow.svg";
const EXPRESSIVE_EASING = [0.22, 1, 0.36, 1] as const;
const OUTGOING_TEXT_DURATION_MS = 600;
const OUTGOING_TEXT_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

interface StickerFrameCycleProps {
  frameIndex: number;
  shouldReduceMotion: boolean;
  stickerSrcs: readonly string[];
}

function getStickerImageClassName(stickerSrc: string) {
  return [
    styles.hoverIconImage,
    stickerSrc === PUFFY_STAR_STICKER_SRC ? styles.hoverIconImagePuffyStar : ""
  ]
    .filter(Boolean)
    .join(" ");
}

function StickerFrameCycle({ frameIndex, shouldReduceMotion, stickerSrcs }: StickerFrameCycleProps) {
  const normalizedFrameIndex = shouldReduceMotion ? 0 : frameIndex % stickerSrcs.length;

  return (
    <span className={styles.hoverIconFrames}>
      {stickerSrcs.map((stickerSrc, stickerIndex) => (
        <Image
          key={`${stickerSrc}-${stickerIndex}`}
          className={[
            getStickerImageClassName(stickerSrc),
            stickerIndex === normalizedFrameIndex ? styles.hoverIconImageActive : ""
          ]
            .filter(Boolean)
            .join(" ")}
          src={stickerSrc}
          alt=""
          width={27}
          height={27}
          loading="eager"
          draggable={false}
        />
      ))}
    </span>
  );
}

function getExternalLinkProps(href: string) {
  return /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i.test(href) ? { target: "_blank", rel: "noopener noreferrer" } : {};
}

function getRootCssNumberVar(name: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
}

function getSoftShift(value: number, power: number) {
  const normalized = Math.max(-1, Math.min(1, value));
  return Math.sign(normalized) * (1 - (1 - Math.abs(normalized)) ** (1 / Math.max(1, power)));
}

function areRectsEqual(a: Rect, b: Rect) {
  return (
    Math.abs(a.top - b.top) <= HIGHLIGHT_TARGET_TOLERANCE &&
    Math.abs(a.left - b.left) <= HIGHLIGHT_TARGET_TOLERANCE &&
    Math.abs(a.width - b.width) <= HIGHLIGHT_TARGET_TOLERANCE &&
    Math.abs(a.height - b.height) <= HIGHLIGHT_TARGET_TOLERANCE
  );
}

function findFirstTargetCrossingTime(
  generator: KeyframeGenerator<number>,
  origin: number,
  target: number,
  duration: number
) {
  const initialOffset = origin - target;
  if (initialOffset === 0 || !Number.isFinite(duration)) return null;

  const searchStep = 1;
  let previousTime = 0;

  for (let time = searchStep; time <= duration; time += searchStep) {
    const sampleTime = Math.min(time, duration);
    const state = generator.next(sampleTime);
    const offset = state.value - target;

    if (state.done && offset === 0) return null;

    if (initialOffset * offset <= 0) {
      let lower = previousTime;
      let upper = sampleTime;

      for (let iteration = 0; iteration < 12; iteration += 1) {
        const middle = (lower + upper) / 2;
        const middleOffset = generator.next(middle).value - target;
        if (initialOffset * middleOffset > 0) {
          lower = middle;
        } else {
          upper = middle;
        }
      }

      return upper;
    }

    previousTime = sampleTime;
  }

  return null;
}

function getTheoreticalOvershootRatio(dampingRatio: number) {
  return Math.exp((-dampingRatio * Math.PI) / Math.sqrt(1 - dampingRatio * dampingRatio));
}

function getDampingRatioForOvershootRatio(overshootRatio: number) {
  const epsilon = Number.EPSILON;
  const clampedRatio = Math.max(epsilon, Math.min(1 - epsilon, overshootRatio));
  const logarithm = -Math.log(clampedRatio);
  return logarithm / Math.sqrt(Math.PI * Math.PI + logarithm * logarithm);
}

function getUnderdampedCrossingFactor(dampingRatio: number) {
  return (Math.PI - Math.acos(dampingRatio)) / Math.sqrt(1 - dampingRatio * dampingRatio);
}

function createPositionSpringGenerator(flightTimeScale: number, tailTimeScale: number): GeneratorFactory {
  return (options) => {
    const springOptions = options as ValueAnimationOptions<number>;
    const origin = springOptions.keyframes[0];
    const target = springOptions.keyframes[springOptions.keyframes.length - 1];

    if (!Number.isFinite(origin) || !Number.isFinite(target) || origin === target) {
      return createSpringGenerator(springOptions);
    }

    const flightScale = Math.max(Number.EPSILON, flightTimeScale);
    const inheritedVelocity = springOptions.velocity;
    const baseSpringOptions: ValueAnimationOptions<number> = {
      ...springOptions,
      ...(typeof inheritedVelocity === "number" ? { velocity: inheritedVelocity * flightScale } : {})
    };
    const baseGenerator = createSpringGenerator(baseSpringOptions);
    const tailScale = Math.max(1, tailTimeScale);
    const baseDuration = baseGenerator.calculatedDuration ?? calcGeneratorDuration(baseGenerator);
    const crossingTime = findFirstTargetCrossingTime(baseGenerator, origin, target, baseDuration);
    const realCrossingTime = crossingTime === null ? null : crossingTime * flightScale;
    const warpedDuration =
      crossingTime === null || realCrossingTime === null
        ? baseDuration * flightScale
        : realCrossingTime + (baseDuration - crossingTime) * tailScale;
    const getBaseTime = (time: number) => {
      if (crossingTime === null || realCrossingTime === null || time <= realCrossingTime) {
        return time / flightScale;
      }

      return crossingTime + (time - realCrossingTime) / tailScale;
    };

    const generator: KeyframeGenerator<number> = {
      calculatedDuration: warpedDuration,
      next: (time) => baseGenerator.next(getBaseTime(time)),
      toString: () => baseGenerator.toString()
    };

    if (baseGenerator.velocity) {
      generator.velocity = (time) => {
        const baseTime = getBaseTime(time);
        const velocity = baseGenerator.velocity?.(baseTime) ?? 0;
        if (realCrossingTime === null || time <= realCrossingTime) return velocity / flightScale;
        return velocity / tailScale;
      };
    }

    return generator;
  };
}

function getAdaptivePositionSpring(current: Rect | null, target: Rect, listHeight: number) {
  let distance = 0;
  let distanceRatio = 0;
  let dampingProgress = 0;

  if (current) {
    const currentCenterX = current.left + current.width / 2;
    const currentCenterY = current.top + current.height / 2;
    const targetCenterX = target.left + target.width / 2;
    const targetCenterY = target.top + target.height / 2;
    distance = Math.hypot(targetCenterX - currentCenterX, targetCenterY - currentCenterY);
    const normalizer = Math.max(1, listHeight - Math.min(current.height, target.height));
    const itemStep = Math.max(1, (current.height + target.height) / 2);
    const distanceSteps = distance / itemStep;
    const maxDistanceSteps = normalizer / itemStep;
    const rawDistanceProgress = 1 - Math.exp(-distanceSteps / POSITION_OVERSHOOT_DISTANCE_SCALE_STEPS);
    const rawMaxProgress = 1 - Math.exp(-maxDistanceSteps / POSITION_OVERSHOOT_DISTANCE_SCALE_STEPS);

    distanceRatio = Math.max(0, Math.min(1, distance / normalizer));
    dampingProgress = Math.max(0, Math.min(1, rawDistanceProgress / rawMaxProgress));
  }

  const smoothedDistanceRatio = distanceRatio * distanceRatio * (3 - 2 * distanceRatio);
  const positionStiffness =
    POSITION_STIFFNESS_NEAR + (POSITION_STIFFNESS_FAR - POSITION_STIFFNESS_NEAR) * smoothedDistanceRatio;
  const referenceDampingRatio =
    POSITION_REFERENCE_DAMPING_RATIO_NEAR +
    (POSITION_REFERENCE_DAMPING_RATIO_FAR - POSITION_REFERENCE_DAMPING_RATIO_NEAR) * dampingProgress;
  const rawOvershootPx = distance * getTheoreticalOvershootRatio(referenceDampingRatio);
  const targetRange = POSITION_OVERSHOOT_TARGET_CAP_PX - POSITION_OVERSHOOT_TARGET_KNEE_PX;
  const desiredOvershootPx =
    rawOvershootPx <= POSITION_OVERSHOOT_TARGET_KNEE_PX
      ? rawOvershootPx
      : POSITION_OVERSHOOT_TARGET_KNEE_PX +
        targetRange *
          (1 - Math.exp(-(rawOvershootPx - POSITION_OVERSHOOT_TARGET_KNEE_PX) / targetRange));
  const effectiveDampingRatio =
    distance <= Number.EPSILON
      ? referenceDampingRatio
      : getDampingRatioForOvershootRatio(desiredOvershootPx / distance);
  const positionFlightTimeScale =
    POSITION_REFERENCE_FLIGHT_TIME_SCALE *
    (getUnderdampedCrossingFactor(referenceDampingRatio) /
      getUnderdampedCrossingFactor(effectiveDampingRatio));
  const positionTailTimeScale =
    POSITION_TAIL_TIME_SCALE_NEAR +
    (POSITION_TAIL_TIME_SCALE_FAR - POSITION_TAIL_TIME_SCALE_NEAR) * smoothedDistanceRatio;

  return {
    positionStiffness,
    positionDamping: 2 * effectiveDampingRatio * Math.sqrt(positionStiffness * POSITION_MASS),
    positionFlightTimeScale,
    positionTailTimeScale
  };
}

interface HomeShowcaseProps {
  title: string;
  subtitle?: string;
  sections: HomeShowcaseSection[];
}

export function HomeShowcase({ title, subtitle, sections }: HomeShowcaseProps) {
  const shouldReduceMotion = useReducedMotion();
  const [canHover, setCanHover] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewLeft, setPreviewLeft] = useState<number | null>(null);
  const [highlightState, setHighlightState] = useState<HighlightState | null>(null);
  const [stickerFrameIndices, setStickerFrameIndices] = useState<Record<number, number>>({});
  const positionSpringGenerator = useMemo(
    () =>
      createPositionSpringGenerator(
        highlightState?.positionFlightTimeScale ?? 1,
        highlightState?.positionTailTimeScale ?? 1
      ),
    [highlightState?.positionFlightTimeScale, highlightState?.positionTailTimeScale]
  );

  const listWrapRef = useRef<HTMLDivElement | null>(null);
  const glassRef = useRef<HTMLDivElement | null>(null);
  const highlightTargetRef = useRef<HighlightState | null>(null);
  const activeIndexRef = useRef<number | null>(null);
  const hoveredIndexRef = useRef<number | null>(null);
  const focusedIndexRef = useRef<number | null>(null);
  const lastPointerPositionRef = useRef<PointerPosition | null>(null);
  const itemInteractionRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const itemVisualRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const itemContentRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const textReturnAnimationsRef = useRef<Map<number, TextReturnAnimationState>>(new Map());
  const pendingTextHandoffsRef = useRef<Map<number, PendingTextHandoff>>(new Map());
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTrackedPreviewOpen = useRef(false);

  const shiftXRaw = useMotionValue(0);
  const shiftYRaw = useMotionValue(0);
  const tiltXRaw = useMotionValue(0);
  const tiltYRaw = useMotionValue(0);
  const originXRaw = useMotionValue(50);
  const originYRaw = useMotionValue(50);

  const shiftX = useSpring(shiftXRaw, { stiffness: 300, damping: 24, mass: 0.75 });
  const shiftY = useSpring(shiftYRaw, { stiffness: 300, damping: 24, mass: 0.75 });
  const iconShiftXTarget = useTransform(shiftXRaw, (value) => value * STICKER_PARALLAX_SCALE);
  const iconShiftYTarget = useTransform(shiftYRaw, (value) => value * STICKER_PARALLAX_SCALE);
  const iconShiftX = useSpring(iconShiftXTarget, { stiffness: 300, damping: 24, mass: 0.75 });
  const iconShiftY = useSpring(iconShiftYTarget, { stiffness: 300, damping: 24, mass: 0.75 });
  const tiltX = useSpring(tiltXRaw, { stiffness: 360, damping: 30, mass: 0.65 });
  const tiltY = useSpring(tiltYRaw, { stiffness: 360, damping: 30, mass: 0.65 });
  const originX = useSpring(originXRaw, { stiffness: 460, damping: 42, mass: 0.74 });
  const originY = useSpring(originYRaw, { stiffness: 460, damping: 42, mass: 0.74 });

  const highlightTransformOrigin = useMotionTemplate`${originX}% ${originY}%`;
  const listShiftXVar = useMotionTemplate`${shiftX}px`;
  const listShiftYVar = useMotionTemplate`${shiftY}px`;
  const highlightYVar = useMotionTemplate`${originY}%`;

  const resetPointerMotion = useCallback(() => {
    tiltXRaw.set(0);
    tiltYRaw.set(0);
    shiftXRaw.set(0);
    shiftYRaw.set(0);
    originXRaw.set(50);
    originYRaw.set(50);
  }, [originXRaw, originYRaw, shiftXRaw, shiftYRaw, tiltXRaw, tiltYRaw]);

  const cancelPendingTextHandoff = useCallback((index: number) => {
    const pending = pendingTextHandoffsRef.current.get(index);
    if (!pending) return null;

    pendingTextHandoffsRef.current.delete(index);
    if (pending.firstFrameId !== null) {
      cancelAnimationFrame(pending.firstFrameId);
    }
    if (pending.secondFrameId !== null) {
      cancelAnimationFrame(pending.secondFrameId);
    }

    return pending;
  }, []);

  const cancelAllTextMotion = useCallback(() => {
    const animationStates = Array.from(textReturnAnimationsRef.current.values());
    const pendingHandoffs = Array.from(pendingTextHandoffsRef.current.values());
    textReturnAnimationsRef.current.clear();
    pendingTextHandoffsRef.current.clear();

    pendingHandoffs.forEach((pending) => {
      if (pending.firstFrameId !== null) {
        cancelAnimationFrame(pending.firstFrameId);
      }
      if (pending.secondFrameId !== null) {
        cancelAnimationFrame(pending.secondFrameId);
      }
    });
    animationStates.forEach(({ animation }) => animation.cancel());

    const affectedElements = new Set<HTMLSpanElement>([
      ...itemContentRefs.current.filter((element): element is HTMLSpanElement => element !== null),
      ...animationStates.map(({ element }) => element),
      ...pendingHandoffs.map(({ element }) => element)
    ]);
    affectedElements.forEach((element) => {
      element.style.removeProperty("transform");
      element.style.removeProperty("transition");
    });
  }, []);

  const freezeTextReturnForReentry = useCallback(
    (index: number) => {
      const animationState = textReturnAnimationsRef.current.get(index);
      const element = itemContentRefs.current[index];
      if (!animationState || !element || animationState.element !== element) return;

      const computedTransform = getComputedStyle(element).transform;
      const currentTransform = computedTransform === "none" ? "translate3d(0, 0, 0)" : computedTransform;

      element.style.transition = "none";
      element.style.transform = currentTransform;
      textReturnAnimationsRef.current.delete(index);
      animationState.animation.cancel();
      cancelPendingTextHandoff(index);

      pendingTextHandoffsRef.current.set(index, {
        element,
        token: Symbol(`text-handoff-${index}`),
        firstFrameId: null,
        secondFrameId: null
      });
    },
    [cancelPendingTextHandoff]
  );

  const startTextReturnAnimation = useCallback(
    (index: number) => {
      const element = itemContentRefs.current[index];
      const existingAnimationState = textReturnAnimationsRef.current.get(index);
      if (!element) {
        cancelPendingTextHandoff(index);
        if (existingAnimationState) {
          textReturnAnimationsRef.current.delete(index);
          existingAnimationState.animation.cancel();
          existingAnimationState.element.style.removeProperty("transform");
          existingAnimationState.element.style.removeProperty("transition");
        }
        return;
      }

      const computedTransform = getComputedStyle(element).transform;
      const currentTransform = computedTransform === "none" ? "translate3d(0, 0, 0)" : computedTransform;

      element.style.transition = "none";
      element.style.transform = currentTransform;
      cancelPendingTextHandoff(index);

      if (existingAnimationState) {
        textReturnAnimationsRef.current.delete(index);
        existingAnimationState.animation.cancel();
      }

      if (shouldReduceMotion || typeof element.animate !== "function") {
        element.style.removeProperty("transform");
        element.style.removeProperty("transition");
        return;
      }

      const animation = element.animate(
        [
          { transform: currentTransform },
          { transform: "translate3d(0, 0, 0)" }
        ],
        {
          duration: OUTGOING_TEXT_DURATION_MS,
          easing: OUTGOING_TEXT_EASING
        }
      );

      textReturnAnimationsRef.current.set(index, { animation, element });
      element.style.removeProperty("transform");
      element.style.removeProperty("transition");

      const clearAnimation = () => {
        if (textReturnAnimationsRef.current.get(index)?.animation === animation) {
          textReturnAnimationsRef.current.delete(index);
        }
      };

      animation.addEventListener("finish", clearAnimation, { once: true });
      animation.addEventListener("cancel", clearAnimation, { once: true });
    },
    [cancelPendingTextHandoff, shouldReduceMotion]
  );

  useLayoutEffect(() => {
    if (activeIndex === null) return;

    const index = activeIndex;
    const pending = pendingTextHandoffsRef.current.get(index);
    if (!pending) return;

    const { element, token } = pending;
    pending.firstFrameId = requestAnimationFrame(() => {
      const current = pendingTextHandoffsRef.current.get(index);
      if (!current || current.token !== token) return;

      current.firstFrameId = null;
      if (
        activeIndexRef.current !== index ||
        itemContentRefs.current[index] !== element ||
        !element.isConnected
      ) {
        pendingTextHandoffsRef.current.delete(index);
        element.style.removeProperty("transform");
        element.style.removeProperty("transition");
        return;
      }

      element.style.removeProperty("transition");
      void getComputedStyle(element).transform;

      current.secondFrameId = requestAnimationFrame(() => {
        const latest = pendingTextHandoffsRef.current.get(index);
        if (!latest || latest.token !== token) return;

        latest.secondFrameId = null;
        if (
          activeIndexRef.current !== index ||
          itemContentRefs.current[index] !== element ||
          !element.isConnected
        ) {
          pendingTextHandoffsRef.current.delete(index);
          element.style.removeProperty("transform");
          element.style.removeProperty("transition");
          return;
        }

        pendingTextHandoffsRef.current.delete(index);
        element.style.removeProperty("transform");
      });
    });
  }, [activeIndex]);

  useEffect(() => {
    if (!shouldReduceMotion) return;
    cancelAllTextMotion();
    resetPointerMotion();
  }, [cancelAllTextMotion, resetPointerMotion, shouldReduceMotion]);

  const indexedSections = useMemo<IndexedHomeSection[]>(() => {
    let currentIndex = 0;

    return sections
      .map((section) => ({
        title: section.title,
        items: section.items.map((entry) => ({
          entry,
          index: currentIndex++
        }))
      }))
      .filter((section) => section.items.length > 0);
  }, [sections]);

  const displayEntries = useMemo(
    () => indexedSections.flatMap((section) => section.items.map((item) => item.entry)),
    [indexedSections]
  );

  useEffect(() => {
    if (activeIndex === null) return;

    const stickerSrcs = displayEntries[activeIndex]?.stickerSrcs;
    if (!stickerSrcs?.length) return;

    const canCycle = !shouldReduceMotion && stickerSrcs.length > 1;
    setStickerFrameIndices((current) => ({ ...current, [activeIndex]: 0 }));

    if (!canCycle) return;

    let isCancelled = false;
    const timeoutIds = new Set<ReturnType<typeof setTimeout>>();
    const schedule = (callback: () => void, delay: number) => {
      const timeoutId = setTimeout(() => {
        timeoutIds.delete(timeoutId);
        if (!isCancelled) callback();
      }, delay);
      timeoutIds.add(timeoutId);
    };
    const scheduleNextFrame = (): void => {
      schedule(() => {
        setStickerFrameIndices((current) => ({
          ...current,
          [activeIndex]: ((current[activeIndex] ?? 0) + 1) % stickerSrcs.length
        }));
        scheduleNextFrame();
      }, STICKER_FRAME_INTERVAL_MS);
    };

    schedule(scheduleNextFrame, STICKER_CYCLE_START_DELAY_MS);

    return () => {
      isCancelled = true;
      timeoutIds.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutIds.clear();
    };
  }, [activeIndex, displayEntries, shouldReduceMotion]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(any-hover: hover)");
    const update = () => setCanHover(media.matches);

    update();
    media.addEventListener("change", update);

    return () => {
      media.removeEventListener("change", update);
    };
  }, []);

  const getItemVisualRect = useCallback((index: number) => {
    const container = listWrapRef.current;
    const item = itemVisualRefs.current[index];
    if (!container || !item) return null;

    const c = container.getBoundingClientRect();
    const r = item.getBoundingClientRect();

    return {
      top: r.top - c.top,
      left: r.left - c.left,
      width: r.width,
      height: r.height
    };
  }, []);

  const syncHighlight = useCallback((index: number) => {
    const nextRect = getItemVisualRect(index);
    if (!nextRect) return null;

    const currentTarget = highlightTargetRef.current;
    if (currentTarget && areRectsEqual(currentTarget.rect, nextRect)) {
      return currentTarget;
    }

    const list = listWrapRef.current;
    const glass = glassRef.current;
    const currentRect = glass
      ? {
          top: glass.offsetTop,
          left: glass.offsetLeft,
          width: glass.offsetWidth,
          height: glass.offsetHeight
        }
      : null;
    const nextState = {
      rect: nextRect,
      ...getAdaptivePositionSpring(currentRect, nextRect, list?.clientHeight ?? 0)
    };

    highlightTargetRef.current = nextState;
    setHighlightState(nextState);
    return nextState;
  }, [getItemVisualRect]);

  const getItemInteractionRect = useCallback((index: number) => {
    return itemInteractionRefs.current[index]?.getBoundingClientRect() ?? null;
  }, []);

  const isItemRevealReady = useCallback((index: number) => {
    const item = itemInteractionRefs.current[index];
    const revealTarget = item?.closest<HTMLElement>("[data-page-reveal]");
    if (!revealTarget) return true;

    const revealState = revealTarget.dataset.pageRevealState;
    return revealState === "ready" || revealState === "instant";
  }, []);

  const syncPreviewPosition = useCallback(() => {
    const list = listWrapRef.current;
    if (!list) return;
    const rect = list.getBoundingClientRect();
    const offset = getRootCssNumberVar("--layout-preview-offset-x", PREVIEW_OFFSET_FALLBACK);
    setPreviewLeft(rect.right + offset);
  }, []);

  useEffect(() => {
    if (activeIndex === null) return;

    const onResize = () => syncHighlight(activeIndex);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [activeIndex, syncHighlight]);

  useEffect(() => {
    if (!canHover) return;

    const onLayoutChange = () => syncPreviewPosition();
    onLayoutChange();

    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("scroll", onLayoutChange, true);

    return () => {
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("scroll", onLayoutChange, true);
    };
  }, [canHover, syncPreviewPosition]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }

      cancelAllTextMotion();
    },
    [cancelAllTextMotion]
  );

  const previewMedia = useMemo(() => {
    if (previewIndex === null) return null;
    const entry = displayEntries[previewIndex];

    if (!entry) {
      return null;
    }

    return {
      kind: entry.preview.kind,
      src: entry.preview.src,
      aspectRatio: entry.preview.src ? entry.preview.aspectRatio : "2 / 1",
      placeholderToken: entry.preview.placeholderToken,
      intrinsicWidth: entry.preview.intrinsicWidth,
      intrinsicHeight: entry.preview.intrinsicHeight,
      srcSet: entry.preview.srcSet,
      fullSrc: entry.preview.fullSrc,
      fullIntrinsicWidth: entry.preview.fullIntrinsicWidth,
      fullIntrinsicHeight: entry.preview.fullIntrinsicHeight,
      videoSources: entry.preview.videoSources,
      fullVideoSources: entry.preview.fullVideoSources
    } as const;
  }, [previewIndex, displayEntries]);

  const portalTarget = typeof document === "undefined" ? null : document.body;

  const cancelCloseIndex = useCallback(() => {
    if (!closeTimerRef.current) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const isCursorInsideItemHoverZone = useCallback(
    (index: number, clientX: number, clientY: number) => {
      const rect = getItemInteractionRect(index);
      if (!rect) return false;

      return (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
    },
    [getItemInteractionRect]
  );

  const findHoveredItemIndex = useCallback(
    (clientX: number, clientY: number) => {
      for (let index = 0; index < itemInteractionRefs.current.length; index += 1) {
        if (isCursorInsideItemHoverZone(index, clientX, clientY)) {
          return index;
        }
      }
      return null;
    },
    [isCursorInsideItemHoverZone]
  );

  function hideActiveIndexImmediately() {
    cancelCloseIndex();
    activeIndexRef.current = null;
    setActiveIndex(null);
    setPreviewIndex(null);
    highlightTargetRef.current = null;
  }

  function openIndex(index: number) {
    if (!isItemRevealReady(index)) return null;

    cancelCloseIndex();

    const previousActiveIndex = activeIndexRef.current;
    freezeTextReturnForReentry(index);
    if (previousActiveIndex !== null && previousActiveIndex !== index) {
      startTextReturnAnimation(previousActiveIndex);
    }
    activeIndexRef.current = index;

    const nextHighlightState = syncHighlight(index);
    syncPreviewPosition();

    const nextEntry = displayEntries[index];
    if (nextEntry) {
      if (!hasTrackedPreviewOpen.current) {
        hasTrackedPreviewOpen.current = true;
        trackMetricaGoal("home_preview_open", {
          case_slug: getCaseSlugFromHref(nextEntry.href),
          case_title: nextEntry.label,
          page_path: getCurrentPath()
        });
      } else if (previousActiveIndex !== null && previousActiveIndex !== index) {
        const previousEntry = displayEntries[previousActiveIndex];
        trackMetricaGoal("home_preview_change", {
          case_slug: getCaseSlugFromHref(nextEntry.href),
          previous_case_slug: previousEntry ? getCaseSlugFromHref(previousEntry.href) : null,
          case_title: nextEntry.label,
          page_path: getCurrentPath()
        });
      }
    }

    setActiveIndex(index);
    setPreviewIndex(index);
    return nextHighlightState?.rect ?? null;
  }

  function closeIndex() {
    if (activeIndex === null && previewIndex === null) return;
    if (closeTimerRef.current) return;
    closeTimerRef.current = setTimeout(() => {
      activeIndexRef.current = null;
      setActiveIndex(null);
      setPreviewIndex(null);
      highlightTargetRef.current = null;
      closeTimerRef.current = null;
    }, 380);
  }

  function updatePointerMotion(
    index: number,
    clientX: number,
    clientY: number,
    rect: DOMRect | null = getItemInteractionRect(index)
  ) {
    if (!canHover || shouldReduceMotion) return;

    let nx = 0;
    let ny = 0;

    if (rect) {
      const cardX = rect.left;
      const cardY = rect.top;
      const tx = Math.max(1, rect.width);
      const ty = Math.max(1, rect.height);

      nx = (clientX - (cardX + tx / 2)) / (tx / 2);
      ny = (clientY - (cardY + ty / 2)) / (ty / 2);

      const ox = Math.max(0, Math.min(1, (clientX - cardX) / tx));
      const oy = Math.max(0, Math.min(1, (clientY - cardY) / ty));
      originXRaw.set(30 + 40 * ox);
      originYRaw.set(30 + 40 * oy);
    } else {
      originXRaw.set(50);
      originYRaw.set(50);
    }

    nx = Math.max(-1, Math.min(1, nx));
    ny = Math.max(-1, Math.min(1, ny));

    tiltXRaw.set(-ny * 1.25);
    tiltYRaw.set(nx * 0.85);
    shiftXRaw.set(16 * getSoftShift(nx, 1.4));
    shiftYRaw.set(10 * getSoftShift(ny, 1.4));
  }

  function onMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!canHover) return;

    lastPointerPositionRef.current = {
      clientX: event.clientX,
      clientY: event.clientY
    };
    const hoveredIndex = findHoveredItemIndex(event.clientX, event.clientY);
    hoveredIndexRef.current = hoveredIndex;
    if (hoveredIndex === null) {
      lastPointerPositionRef.current = null;
      closeIndex();
      return;
    }

    if (!isItemRevealReady(hoveredIndex)) {
      hideActiveIndexImmediately();
      return;
    }

    cancelCloseIndex();
    if (hoveredIndex !== activeIndexRef.current) {
      openIndex(hoveredIndex);
    }
    updatePointerMotion(hoveredIndex, event.clientX, event.clientY);
  }

  function onItemMouseEnter(index: number, clientX: number, clientY: number) {
    hoveredIndexRef.current = index;
    lastPointerPositionRef.current = { clientX, clientY };

    if (!isItemRevealReady(index)) {
      hideActiveIndexImmediately();
      return;
    }

    openIndex(index);
    updatePointerMotion(index, clientX, clientY);
  }

  function onItemFocus(index: number) {
    focusedIndexRef.current = index;
    if (!isItemRevealReady(index)) {
      hideActiveIndexImmediately();
      return;
    }

    openIndex(index);
  }

  function onItemBlur(index: number) {
    if (focusedIndexRef.current === index) {
      focusedIndexRef.current = null;
    }

    const hoveredIndex = hoveredIndexRef.current;
    const pointerPosition = lastPointerPositionRef.current;
    if (hoveredIndex !== null && pointerPosition && isItemRevealReady(hoveredIndex)) {
      openIndex(hoveredIndex);
      updatePointerMotion(hoveredIndex, pointerPosition.clientX, pointerPosition.clientY);
      return;
    }

    closeIndex();
  }

  return (
    <div className={styles.root}>
      <div className={styles.leftColumn}>
        <div className={styles.heroStack}>
          <PageRevealSequence
            className={styles.revealStack}
            onTargetReady={(target) => {
              const rawIndex = target.dataset.homeShowcaseIndex;
              if (rawIndex === undefined) return;

              const index = Number.parseInt(rawIndex, 10);
              if (!Number.isInteger(index)) return;

              const pointerPosition = lastPointerPositionRef.current;
              let isHovered = hoveredIndexRef.current === index;
              if (
                isHovered &&
                (!pointerPosition ||
                  !isCursorInsideItemHoverZone(index, pointerPosition.clientX, pointerPosition.clientY))
              ) {
                hoveredIndexRef.current = null;
                lastPointerPositionRef.current = null;
                isHovered = false;
              }

              const isFocused = focusedIndexRef.current === index;
              if (!isHovered && !isFocused) return;

              openIndex(index);
              if (isHovered && pointerPosition) {
                updatePointerMotion(index, pointerPosition.clientX, pointerPosition.clientY);
              }
            }}
          >
            <header className={[shellStyles.headerBlock, shellStyles.compensated].join(" ")}>
              <h1 className={shellStyles.title} data-page-reveal="">
                {title}
              </h1>
              {subtitle ? (
                <p
                  className={[shellStyles.subtitle, shellStyles.subtitleStrong, shellStyles.subtitleWorkMeta].join(" ")}
                  data-page-reveal=""
                >
                  {subtitle}
                </p>
              ) : null}
            </header>

            <motion.div
              className={styles.listWrap}
              ref={listWrapRef}
              onMouseMove={onMouseMove}
              style={
                {
                  ["--item-shift-x" as string]: listShiftXVar,
                  ["--item-shift-y" as string]: listShiftYVar,
                  ["--item-shift-scale" as string]: ACTIVE_TEXT_SHIFT_SCALE
                } as unknown as CSSProperties
              }
              onMouseLeave={() => {
                hoveredIndexRef.current = null;
                lastPointerPositionRef.current = null;
                resetPointerMotion();
                const focusedIndex = focusedIndexRef.current;
                if (focusedIndex !== null && isItemRevealReady(focusedIndex)) {
                  openIndex(focusedIndex);
                } else {
                  closeIndex();
                }
              }}
            >
              <AnimatePresence>
                {highlightState && activeIndex !== null && (
                  <motion.div
                    key="glass"
                    ref={glassRef}
                    className={styles.glass}
                    initial={{
                      opacity: 0,
                      scale: shouldReduceMotion ? 1 : 0.1,
                      top: highlightState.rect.top,
                      left: highlightState.rect.left,
                      width: highlightState.rect.width,
                      height: highlightState.rect.height
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      top: highlightState.rect.top,
                      left: highlightState.rect.left,
                      width: highlightState.rect.width,
                      height: highlightState.rect.height
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      top: shouldReduceMotion
                        ? { duration: 0 }
                        : {
                            type: positionSpringGenerator,
                            stiffness: highlightState.positionStiffness,
                            damping: highlightState.positionDamping,
                            mass: POSITION_MASS
                          },
                      left: shouldReduceMotion
                        ? { duration: 0 }
                        : {
                            type: positionSpringGenerator,
                            stiffness: highlightState.positionStiffness,
                            damping: highlightState.positionDamping,
                            mass: POSITION_MASS
                          },
                      width: shouldReduceMotion
                        ? { duration: 0 }
                        : {
                            type: "spring",
                            stiffness: SIZE_STIFFNESS,
                            damping: SIZE_DAMPING,
                            mass: SIZE_MASS
                          },
                      height: shouldReduceMotion
                        ? { duration: 0 }
                        : {
                            type: "spring",
                            stiffness: SIZE_STIFFNESS,
                            damping: SIZE_DAMPING,
                            mass: SIZE_MASS
                          },
                      opacity: { duration: GLASS_OPACITY_DURATION_SECONDS }
                    }}
                    style={{
                      transformOrigin: shouldReduceMotion ? "50% 50%" : highlightTransformOrigin,
                      rotateX: shouldReduceMotion ? 0 : tiltX,
                      rotateY: shouldReduceMotion ? 0 : tiltY,
                      x: shouldReduceMotion ? 0 : shiftX,
                      y: shouldReduceMotion ? 0 : shiftY
                    }}
                  >
                    <span
                      className={styles.glassHighlight}
                      style={
                        {
                          ["--lgy" as string]: shouldReduceMotion ? "50%" : highlightYVar
                        } as unknown as CSSProperties
                      }
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={styles.list}>
                {indexedSections.map((section, sectionIndex) => (
                  <section
                    key={`${section.title ?? "untitled"}-${sectionIndex}`}
                    className={styles.section}
                    aria-label={section.title}
                  >
                    {section.title ? (
                      <h2 className={styles.sectionTitle} data-page-reveal="">
                        {section.title}
                      </h2>
                    ) : null}
                    <div className={styles.sectionList}>
                      {section.items.map(({ entry, index }) => (
                        <span key={entry.href} data-page-reveal="" data-home-showcase-index={index}>
                          <Link
                            href={entry.href}
                            {...getExternalLinkProps(entry.href)}
                            scroll={entry.href.startsWith("/work/") ? false : undefined}
                            onNavigate={() => {
                              if (!entry.href.startsWith("/work/")) return;
                              window.scrollTo({
                                top: 0,
                                behavior: shouldReduceMotion ? "auto" : "smooth"
                              });
                            }}
                            ref={(node) => {
                              itemInteractionRefs.current[index] = node;
                            }}
                            className={[
                              styles.item,
                              activeIndex === index ? styles.itemActive : ""
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onMouseEnter={(event) => {
                              onItemMouseEnter(index, event.clientX, event.clientY);
                            }}
                            onFocus={() => onItemFocus(index)}
                            onBlur={() => onItemBlur(index)}
                            onClick={() => {
                              trackMetricaGoal("click_case_card", {
                                case_slug: getCaseSlugFromHref(entry.href),
                                case_title: entry.label,
                                section_title: section.title,
                                page_path: getCurrentPath()
                              });
                            }}
                          >
                            <span
                              ref={(node) => {
                                itemVisualRefs.current[index] = node;
                              }}
                              className={styles.itemVisualBounds}
                            >
                              <span
                                ref={(node) => {
                                  itemContentRefs.current[index] = node;
                                }}
                                className={styles.itemContent}
                              >
                                <span className={styles.itemLabel}>{entry.label}</span>
                                <span className={styles.itemMeta}>
                                  <span>{entry.subtitle}</span>
                                </span>
                              </span>
                              {entry.stickerSrcs ? (
                                <motion.span
                                  className={styles.hoverIcon}
                                  aria-hidden="true"
                                  initial={{
                                    opacity: 0,
                                    filter: shouldReduceMotion ? "blur(0px)" : `blur(${STICKER_BLUR_PX}px)`
                                  }}
                                  animate={{
                                    opacity: activeIndex === index ? 1 : 0,
                                    filter:
                                      shouldReduceMotion || activeIndex === index
                                        ? "blur(0px)"
                                        : `blur(${STICKER_BLUR_PX}px)`
                                  }}
                                  transition={{
                                    opacity: {
                                      duration:
                                        activeIndex === index
                                          ? STICKER_APPEARANCE_DURATION_SECONDS
                                          : GLASS_OPACITY_DURATION_SECONDS,
                                      delay:
                                        activeIndex === index ? STICKER_APPEARANCE_DELAY_SECONDS : 0,
                                      ease: EXPRESSIVE_EASING
                                    },
                                    filter: {
                                      duration:
                                        activeIndex === index
                                          ? STICKER_APPEARANCE_DURATION_SECONDS
                                          : GLASS_OPACITY_DURATION_SECONDS,
                                      delay:
                                        activeIndex === index ? STICKER_APPEARANCE_DELAY_SECONDS : 0,
                                      ease: EXPRESSIVE_EASING
                                    }
                                  }}
                                  style={{
                                    x: shouldReduceMotion ? 0 : iconShiftX,
                                    y: shouldReduceMotion ? 0 : iconShiftY,
                                    rotate: STICKER_ROTATION_DEGREES
                                  }}
                                >
                                  <StickerFrameCycle
                                    frameIndex={stickerFrameIndices[index] ?? 0}
                                    shouldReduceMotion={Boolean(shouldReduceMotion)}
                                    stickerSrcs={entry.stickerSrcs}
                                  />
                                </motion.span>
                              ) : null}
                            </span>
                          </Link>
                        </span>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </motion.div>
          </PageRevealSequence>
        </div>
      </div>

      {portalTarget &&
        createPortal(
          <AnimatePresence>
            {canHover && activeIndex !== null && previewMedia?.src && previewLeft !== null && (
              <motion.aside
                className={styles.previewPane}
                style={{ left: `${previewLeft}px` }}
                aria-label="Content area"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(10px)" }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, filter: "blur(0)" }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(10px)" }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0.18 }
                    : { type: "spring", duration: 0.6, bounce: 0 }
                }
              >
                <div className={styles.contentArea}>
                  <div className={styles.previewStage}>
                    <AnimatePresence mode={shouldReduceMotion ? "sync" : "popLayout"}>
                      <motion.div
                        key={previewIndex ?? -1}
                        className={styles.previewMediaFrame}
                        initial={
                          shouldReduceMotion
                            ? { opacity: 0 }
                            : { opacity: 0, filter: "blur(10px)", scale: 0.97 }
                        }
                        animate={
                          shouldReduceMotion
                            ? { opacity: 1 }
                            : { opacity: 1, filter: "blur(0px)", scale: 1 }
                        }
                        exit={
                          shouldReduceMotion
                            ? { opacity: 0 }
                            : { opacity: 0, filter: "blur(10px)", scale: 0.97 }
                        }
                        transition={
                          shouldReduceMotion
                            ? { duration: 0.18 }
                            : { type: "spring", duration: 0.6, bounce: 0 }
                        }
                      >
                        <MediaPlaceholderView
                          media={previewMedia}
                          variant="homePreview"
                          className={styles.previewCard}
                          frame="square"
                          fit="contain"
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>,
          portalTarget
        )}
    </div>
  );
}
