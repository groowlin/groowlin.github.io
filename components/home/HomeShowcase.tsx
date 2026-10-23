"use client";

import Image from "next/image";

import Link from "next/link";
import {
  type CSSProperties,
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useIsPresent,
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
import { type HomePreview, type HomeShowcaseEntry, type HomeShowcaseTab } from "@/lib/content/types";
import styles from "@/components/home/home-showcase.module.css";

// Общепринятые аббревиатуры; Portfolio сохраняет ER / FA (feature adoption) / CD (content Depth).
// Определения — в portfolio-case-json-structure.md.
const HOME_METRIC_LABELS: Record<string, readonly string[]> = {
  portfoliocase: ["ER", "FA", "CD"],
  globus: ["CR", "RR D30", "NPS"],
  medicine: ["CR", "CSAT", "AOV"],
  familia: ["RR D30"],
  goldenapple: ["CR", "RR D7"],
  zvuk: ["RR D7", "NU"],
  vk: ["TCT"]
};

function HomeMetrics({ href }: { href: string }) {
  return (HOME_METRIC_LABELS[getCaseSlugFromHref(href) ?? ""] ?? []).map((label) => (
    <span className={styles.metric} key={label}>
      <span className={styles.metricGrowthIcon} aria-hidden="true" />
      {label}
    </span>
  ));
}

const PLANNED_GLOBUS_PREVIEW_SLUGS = new Set([
  "media-and-gallery",
  "mini-games",
  "content-automation"
]);

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
  entry: HomeShowcaseEntry;
  index: number;
}

interface IndexedHomeSection {
  title?: string;
  items: SectionEntry[];
}

interface IndexedHomeTab {
  title: string;
  sections: IndexedHomeSection[];
}

const PREVIEW_OFFSET_FALLBACK = 60;
const ACTIVE_TEXT_SHIFT_SCALE = 0.25;
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
// Reuse the existing 1120ms page-reveal movement duration for the year bracket.
const YEAR_APPEARANCE_DURATION_SECONDS = 1.12;
const STICKER_APPEARANCE_DURATION_SECONDS = 0.7;
const STICKER_APPEARANCE_DELAY_SECONDS = GLASS_OPACITY_DURATION_SECONDS;
const STICKER_FRAME_INTERVAL_MS = 200;
const YEAR_BLUR_PX = 4;
const EXPRESSIVE_EASING = [0.22, 1, 0.36, 1] as const;
const HOME_TAB_STORAGE_KEY = "home-active-tab-title";
const HOME_TAB_TRAVEL_PX = 80;
const HOME_TAB_TOTAL_DURATION_MS = 1129;
const HOME_TAB_EXIT_DURATION_MS = 200;
const HOME_TAB_ENTER_STAGGER_MS = 20;
const HOME_TAB_EXIT_STAGGER_MS = 0;
const HOME_TAB_INCOMING_DELAY_MS = 200;
const HOME_TAB_ENTER_WAVE_DURATION_MS = HOME_TAB_TOTAL_DURATION_MS - HOME_TAB_INCOMING_DELAY_MS;
const HOME_INITIAL_REVEAL_STAGGER_MS = 80;
const subscribeToHydration = () => () => {};
const getHydratedSnapshot = () => true;
const getServerHydrationSnapshot = () => false;
const HOME_TAB_UNDERLINE_MOTION = {
  type: "tween",
  duration: 0.4,
  ease: [0.4, 0, 0.2, 1]
} as const;
const HOME_TAB_UNDERLINE_SPRING = {
  type: "spring",
  stiffness: 400,
  damping: 30,
  mass: 1,
  restDelta: 0.0001,
  restSpeed: 0.001
} as const;
const OUTGOING_TEXT_DURATION_MS = 600;
const OUTGOING_TEXT_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

const HomePreviewFrame = forwardRef<HTMLDivElement, {
  media: HomePreview;
  planned: boolean;
  caption?: string;
  reducedMotion: boolean;
}>(function HomePreviewFrame({ media, planned, caption, reducedMotion }, ref) {
  const contentRef = useRef<HTMLDivElement>(null);
  const isPresent = useIsPresent();
  const presentRef = useRef(isPresent);
  const mediaOpacity = useMotionValue(0);
  const [captionReady, setCaptionReady] = useState(false);
  const [captionBounds, setCaptionBounds] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    presentRef.current = isPresent;
    // Presence can revive the same keyed frame before its exit finishes.
    // Each entry must pass the current surface's visibility gate again.
    setCaptionReady(false);
    return () => { presentRef.current = false; };
  }, [isPresent]);

  useLayoutEffect(() => {
    const content = contentRef.current;
    const surface = content?.querySelector<HTMLElement>("[aria-label$=' media']");
    if (!content || !surface || !caption || planned) return;
    const measure = () => {
      const next = { top: surface.offsetTop + surface.offsetHeight, left: surface.offsetLeft, width: surface.offsetWidth };
      setCaptionBounds((previous) => previous?.top === next.top && previous.left === next.left && previous.width === next.width ? previous : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(surface);
    observer.observe(content);
    return () => observer.disconnect();
  }, [caption, planned]);

  const showCaption = captionReady && isPresent;
  return (
    <div
      ref={ref}
      className={styles.previewMediaFrame}
    >
      <motion.div
        ref={contentRef}
        className={styles.previewMediaContent}
        style={{ opacity: mediaOpacity }}
        variants={{
          initial: reducedMotion ? { opacity: 0 } : { opacity: 0, filter: planned ? "blur(0px)" : "blur(10px)", scale: 0.97 },
          visible: reducedMotion ? { opacity: 1 } : { opacity: 1, filter: "blur(0px)", scale: 1 },
          exit: reducedMotion ? { opacity: 0 } : { opacity: 0, filter: planned ? "blur(0px)" : "blur(10px)", scale: 0.97 }
        }}
        initial="initial"
        animate="visible"
        exit="exit"
        transition={reducedMotion ? { duration: 0.18 } : { type: "spring", duration: 0.6, bounce: 0 }}
        onUpdate={(latest) => {
          if (presentRef.current && typeof latest.opacity === "number" && latest.opacity >= 0.98) setCaptionReady(true);
        }}
        onAnimationComplete={(definition) => {
          if (definition === "visible" && presentRef.current && mediaOpacity.get() >= 0.98) setCaptionReady(true);
        }}
      >
        <MediaPlaceholderView
          media={media}
          variant="homePreview"
          className={[styles.previewCard, planned && styles.plannedPreviewCard].filter(Boolean).join(" ")}
          frame="square"
          fit="contain"
        />
      </motion.div>
      {caption && !planned && captionBounds ? (
        <motion.p
          className={styles.previewCaption}
          style={captionBounds}
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
          animate={reducedMotion ? { opacity: showCaption ? 1 : 0 } : { opacity: showCaption ? 1 : 0, y: showCaption ? 0 : isPresent ? 4 : 2 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 2 }}
          transition={reducedMotion || !showCaption ? { duration: 0.18 } : { type: "spring", stiffness: 100, damping: 20, mass: 1 }}
        >
          {caption}
        </motion.p>
      ) : null}
    </div>
  );
});

function StickerFrameCycle({ stickerSrcs, frameIndex, reducedMotion }: {
  stickerSrcs: readonly string[];
  frameIndex: number;
  reducedMotion: boolean;
}) {
  const displayedFrame = reducedMotion ? 0 : frameIndex % stickerSrcs.length;
  return (
    <span className={styles.hoverIconFrames}>
      {stickerSrcs.map((src, index) => (
        <Image
          key={`${src}-${index}`}
          src={src}
          alt=""
          width={27}
          height={27}
          loading="eager"
          draggable={false}
          className={[
            styles.hoverIconImage,
            index === displayedFrame ? styles.hoverIconImageActive : "",
            src === "/media/cases/portfoliocase/sticker-puffy-star-darker-yellow.svg" ? styles.hoverIconImagePuffyStar : ""
          ].filter(Boolean).join(" ")}
        />
      ))}
    </span>
  );
}

function YearGroupBracket({ year, indices, active, reducedMotion, isActivePane }: {
  year: string;
  indices: string;
  active: boolean;
  reducedMotion: boolean;
  isActivePane: (element: Element) => boolean;
}) {
  const bracketRef = useRef<HTMLSpanElement | null>(null);
  const [bounds, setBounds] = useState<{ top: number; height: number } | null>(null);
  const shiftXRaw = useMotionValue(0);
  const shiftYRaw = useMotionValue(0);
  const shiftX = useSpring(shiftXRaw, { stiffness: 300, damping: 24, mass: 0.75 });
  const shiftY = useSpring(shiftYRaw, { stiffness: 300, damping: 24, mass: 0.75 });

  useLayoutEffect(() => {
    const container = bracketRef.current?.parentElement;
    if (!container) return;
    const contents = indices.split(",").flatMap((index) => {
      const content = container.querySelector<HTMLElement>(
        `[data-home-showcase-index="${index}"] .${styles.itemContent}`
      );
      return content ? [content] : [];
    });
    const measure = () => {
      if (!contents.length) return;
      const layoutTop = (content: HTMLElement) => {
        let top = 0;
        let node: HTMLElement | null = content;
        while (node && node !== container) {
          top += node.offsetTop;
          node = node.offsetParent as HTMLElement | null;
        }
        return top;
      };
      const top = Math.min(...contents.map(layoutTop));
      const bottom = Math.max(...contents.map((content) => layoutTop(content) + content.offsetHeight));
      setBounds((previous) => previous?.top === top && previous.height === bottom - top
        ? previous : { top, height: bottom - top });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    contents.forEach((content) => observer.observe(content));
    return () => observer.disconnect();
  }, [indices]);

  useEffect(() => {
    const container = bracketRef.current?.parentElement;
    const reset = () => {
      shiftXRaw.set(0);
      shiftYRaw.set(0);
    };
    if (!container || !bounds || reducedMotion) {
      reset();
      return;
    }
    const onMouseMove = (event: MouseEvent) => {
      if (!isActivePane(container)) return;
      const rect = container.getBoundingClientRect();
      const nx = (event.clientX - rect.left - rect.width / 2) / Math.max(1, rect.width / 2);
      const ny = (event.clientY - rect.top - bounds.top - bounds.height / 2) / Math.max(1, bounds.height / 2);
      shiftXRaw.set((16 * (0.5 / 1.5) / 4) * getSoftShift(nx, 1.4));
      shiftYRaw.set((10 * (0.5 / 1.5) / 4) * getSoftShift(ny, 1.4));
    };
    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseleave", reset);
    return () => {
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseleave", reset);
    };
  }, [bounds, reducedMotion, isActivePane, shiftXRaw, shiftYRaw]);

  return (
    <motion.span
      ref={bracketRef}
      className={styles.hoverYear}
      aria-hidden="true"
      transformTemplate={({ x = 0, y = 0 }) =>
        `translate3d(${typeof x === "number" ? `${x}px` : x}, ${typeof y === "number" ? `${y}px` : y}, 0)`
      }
      style={{
        top: bounds?.top ?? 0,
        height: bounds?.height ?? 0,
        x: reducedMotion ? 0 : shiftX,
        y: reducedMotion ? 0 : shiftY
      }}
      initial={{ opacity: 0, filter: reducedMotion ? "blur(0px)" : `blur(${YEAR_BLUR_PX}px)` }}
      animate={{ opacity: active && bounds ? 1 : 0, filter: reducedMotion || active ? "blur(0px)" : `blur(${YEAR_BLUR_PX}px)` }}
      transition={{
        duration: active ? YEAR_APPEARANCE_DURATION_SECONDS : GLASS_OPACITY_DURATION_SECONDS,
        delay: 0,
        ease: EXPRESSIVE_EASING
      }}
    >
      <span className={styles.yearBracketLine} />
      <span className={styles.yearBracketLabel}>{year}</span>
    </motion.span>
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
  tabs: HomeShowcaseTab[];
}

export function HomeShowcase({ title, tabs }: HomeShowcaseProps) {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydrationSnapshot
  );
  const shouldReduceMotion = useReducedMotion();
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [renderedTabIndex, setRenderedTabIndex] = useState(0);
  const [hasRestoredSavedTab, setHasRestoredSavedTab] = useState(false);
  const [incomingRevealStartAt, setIncomingRevealStartAt] = useState<number | undefined>();
  const [tabDirection, setTabDirection] = useState(1);
  const [hasChangedTab, setHasChangedTab] = useState(false);
  const [tabSelectionGeneration, setTabSelectionGeneration] = useState(0);
  const [canHover, setCanHover] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [stickerFrameIndices, setStickerFrameIndices] = useState<Record<number, number>>({});
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewSuppressed, setPreviewSuppressed] = useState(false);
  const hoverSuppressedRef = useRef(false);
  const [previewLeft, setPreviewLeft] = useState<number | null>(null);
  const [highlightState, setHighlightState] = useState<HighlightState | null>(null);
  const positionSpringGenerator = useMemo(
    () =>
      createPositionSpringGenerator(
        highlightState?.positionFlightTimeScale ?? 1,
        highlightState?.positionTailTimeScale ?? 1
      ),
    [highlightState?.positionFlightTimeScale, highlightState?.positionTailTimeScale]
  );

  const listWrapRef = useRef<HTMLDivElement | null>(null);
  const listWrapRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const paneRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const activePaneKeyRef = useRef<string | null>(null);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const paneViewportRef = useRef<HTMLDivElement | null>(null);
  const tabSwipeRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    axis: "horizontal" | "vertical" | null;
  } | null>(null);
  const suppressSwipeClickUntilRef = useRef(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabLabelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const activeTabIndexRef = useRef(activeTabIndex);
  activeTabIndexRef.current = activeTabIndex;
  const tabUnderlineX = useMotionValue(0);
  const tabUnderlineWidth = useMotionValue(0);
  const tabUnderlineScaleX = useMotionValue(1);
  const glassRef = useRef<HTMLDivElement | null>(null);
  const highlightTargetRef = useRef<HighlightState | null>(null);
  const activeIndexRef = useRef<number | null>(null);
  const hoveredIndexRef = useRef<number | null>(null);
  const focusedIndexRef = useRef<number | null>(null);
  const lastPointerPositionRef = useRef<PointerPosition | null>(null);
  const itemInteractionRefs = useRef<(HTMLElement | null)[]>([]);
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
  const iconShiftXTarget = useTransform(shiftXRaw, (value) => value * 0.5);
  const iconShiftYTarget = useTransform(shiftYRaw, (value) => value * 0.5);
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

  const indexedTabs = useMemo<IndexedHomeTab[]>(() => {
    let currentIndex = 0;

    return tabs.map((tab) => ({
      title: tab.title,
      sections: tab.sections
        .map((section) => ({
          title: section.title,
          items: section.items.map((entry) => ({ entry, index: currentIndex++ }))
        }))
        .filter((section) => section.items.length > 0)
    }));
  }, [tabs]);

  const activeTab = indexedTabs[renderedTabIndex] ?? indexedTabs[0];
  activePaneKeyRef.current = activeTab?.title ?? null;

  useLayoutEffect(() => {
    try {
      const savedTitle = window.sessionStorage.getItem(HOME_TAB_STORAGE_KEY);
      const savedIndex = indexedTabs.findIndex((tab) => tab.title === savedTitle);
      if (savedIndex > 0) {
        setActiveTabIndex(savedIndex);
        setRenderedTabIndex(savedIndex);
        setHasRestoredSavedTab(true);
      }
    } catch {
      // Storage can be disabled; the first tab remains the default.
    }
  }, [indexedTabs]);

  useLayoutEffect(() => {
    listWrapRef.current = activeTab?.title ? listWrapRefs.current.get(activeTab.title) ?? null : null;
  }, [activeTab?.title]);

  useLayoutEffect(() => {
    const viewport = paneViewportRef.current;
    const tabsNode = tabsRef.current;
    if (!viewport || !tabsNode) return;
    const syncSwipeArea = () => {
      viewport.style.setProperty(
        "--home-swipe-min-height",
        `${Math.max(0, window.innerHeight - viewport.getBoundingClientRect().top)}px`
      );
    };
    syncSwipeArea();
    const observer = new ResizeObserver(syncSwipeArea);
    observer.observe(tabsNode);
    window.addEventListener("resize", syncSwipeArea);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncSwipeArea);
    };
  }, []);

  useLayoutEffect(() => {
    const activePane = activeTab?.title ? paneRefs.current.get(activeTab.title) : null;
    if (!activePane) return;
    delete activePane.dataset.homePaneExiting;
    activePane.inert = false;
    activePane.removeAttribute("aria-hidden");
    activePane.style.removeProperty("pointer-events");
  }, [activeTab?.title, tabSelectionGeneration]);

  useLayoutEffect(() => {
    const tabsNode = tabsRef.current;
    if (!tabsNode) return;

    const syncUnderline = () => {
      const activeLabel = tabLabelRefs.current[activeTabIndexRef.current];
      if (!activeLabel) return;
      tabUnderlineX.stop();
      tabUnderlineWidth.stop();
      tabUnderlineScaleX.stop();
      tabUnderlineScaleX.set(1);
      tabUnderlineX.set(activeLabel.getBoundingClientRect().left - tabsNode.getBoundingClientRect().left);
      tabUnderlineWidth.set(activeLabel.getBoundingClientRect().width);
    };

    syncUnderline();
    const observer = new ResizeObserver(syncUnderline);
    observer.observe(tabsNode);
    tabRefs.current.forEach((button) => {
      if (button) observer.observe(button);
    });
    return () => {
      observer.disconnect();
      tabUnderlineX.stop();
      tabUnderlineWidth.stop();
      tabUnderlineScaleX.stop();
    };
  }, [indexedTabs.length, tabUnderlineScaleX, tabUnderlineWidth, tabUnderlineX]);

  useLayoutEffect(() => {
    if (hasChangedTab && !shouldReduceMotion) return;
    const tabsNode = tabsRef.current;
    const label = tabLabelRefs.current[activeTabIndex];
    if (!tabsNode || !label) return;
    tabUnderlineX.stop();
    tabUnderlineWidth.stop();
    tabUnderlineScaleX.stop();
    tabUnderlineScaleX.set(1);
    tabUnderlineX.set(label.getBoundingClientRect().left - tabsNode.getBoundingClientRect().left);
    tabUnderlineWidth.set(label.getBoundingClientRect().width);
  }, [activeTabIndex, hasChangedTab, shouldReduceMotion, tabUnderlineScaleX, tabUnderlineWidth, tabUnderlineX]);

  const displayEntries = useMemo(
    () =>
      indexedTabs.flatMap((tab) =>
        tab.sections.flatMap((section) => section.items.map((item) => item.entry))
      ),
    [indexedTabs]
  );

  useEffect(() => {
    if (activeIndex === null) return;
    const activeEntry = displayEntries[activeIndex];
    const stickerSrcs = activeEntry?.kind === "game" ? undefined : activeEntry?.stickerSrcs;
    if (!stickerSrcs?.length) return;
    setStickerFrameIndices((current) => ({ ...current, [activeIndex]: 0 }));
    if (shouldReduceMotion || stickerSrcs.length < 2) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    const next = () => {
      setStickerFrameIndices((current) => ({
        ...current,
        [activeIndex]: ((current[activeIndex] ?? 0) + 1) % stickerSrcs.length
      }));
      timeoutId = setTimeout(next, STICKER_FRAME_INTERVAL_MS);
    };
    timeoutId = setTimeout(next, STICKER_APPEARANCE_DELAY_SECONDS * 1000 + STICKER_FRAME_INTERVAL_MS);
    return () => clearTimeout(timeoutId);
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
    const activePane = activePaneKeyRef.current ? paneRefs.current.get(activePaneKeyRef.current) : null;
    if (!activePane || !activePane.contains(container) || !activePane.contains(item)) return null;

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
    const activePane = activePaneKeyRef.current ? paneRefs.current.get(activePaneKeyRef.current) : null;
    if (!item || !activePane?.contains(item)) return false;
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
    const selectedEntry = displayEntries[previewIndex];
    const isPlannedPreview = selectedEntry?.kind === "planned" && PLANNED_GLOBUS_PREVIEW_SLUGS.has(selectedEntry.slug);
    const entry = isPlannedPreview
      ? displayEntries.find((candidate) => candidate.kind !== "game" && candidate.kind !== "planned" && candidate.href === "/work/globus")
      : selectedEntry;

    if (!entry || entry.kind === "game" || entry.kind === "planned") {
      return null;
    }

    return {
      isPlannedPreview,
      previewCaption: isPlannedPreview ? undefined : entry.previewCaption,
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

  const portalTarget = isHydrated ? document.body : null;

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
    const pane = activePaneKeyRef.current ? paneRefs.current.get(activePaneKeyRef.current) : null;
    const item = itemInteractionRefs.current[index];
    if (!pane || pane.inert || !item || !pane.contains(item)) return null;

    const nextHighlightState = syncHighlight(index);
    if (!nextHighlightState) return null;

    delete pane.dataset.homeHoverSuppressed;
    hoverSuppressedRef.current = false;
    setPreviewSuppressed(false);
    cancelCloseIndex();

    const previousActiveIndex = activeIndexRef.current;
    freezeTextReturnForReentry(index);
    if (previousActiveIndex !== null && previousActiveIndex !== index) {
      startTextReturnAnimation(previousActiveIndex);
    }
    activeIndexRef.current = index;

    syncPreviewPosition();

    const nextEntry = displayEntries[index];
    if (nextEntry && nextEntry.kind !== "game" && nextEntry.kind !== "planned") {
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
          previous_case_slug: previousEntry && previousEntry.kind !== "game" && previousEntry.kind !== "planned" ? getCaseSlugFromHref(previousEntry.href) : null,
          case_title: nextEntry.label,
          page_path: getCurrentPath()
        });
      }
    }

    setActiveIndex(index);
    setPreviewIndex(index);
    return nextHighlightState?.rect ?? null;
  }

  function isActivePaneEvent(element: Element) {
    const key = activePaneKeyRef.current;
    const pane = key ? paneRefs.current.get(key) : null;
    return Boolean(pane?.contains(element));
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
    if (!canHover || event.currentTarget !== listWrapRef.current || !isActivePaneEvent(event.currentTarget)) return;

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

  function onItemMouseEnter(index: number, event: React.MouseEvent<HTMLElement>) {
    if (!isActivePaneEvent(event.currentTarget)) return;
    const { clientX, clientY } = event;
    hoveredIndexRef.current = index;
    lastPointerPositionRef.current = { clientX, clientY };

    if (!isItemRevealReady(index)) {
      hideActiveIndexImmediately();
      return;
    }

    openIndex(index);
    updatePointerMotion(index, clientX, clientY);
  }

  function onItemFocus(index: number, event: React.FocusEvent<HTMLAnchorElement>) {
    if (!isActivePaneEvent(event.currentTarget)) return;
    focusedIndexRef.current = index;
    if (!isItemRevealReady(index)) {
      hideActiveIndexImmediately();
      return;
    }

    openIndex(index);
  }

  function onItemBlur(index: number, event: React.FocusEvent<HTMLAnchorElement>) {
    if (!isActivePaneEvent(event.currentTarget)) return;
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

  function resetActiveCase() {
    cancelCloseIndex();
    cancelAllTextMotion();
    activeIndexRef.current = null;
    hoveredIndexRef.current = null;
    focusedIndexRef.current = null;
    lastPointerPositionRef.current = null;
    highlightTargetRef.current = null;
    setActiveIndex(null);
    setPreviewIndex(null);
    setHighlightState(null);
    resetPointerMotion();
  }

  function animateTabUnderline(nextIndex: number) {
    const tabsNode = tabsRef.current;
    const label = tabLabelRefs.current[nextIndex];
    if (!tabsNode || !label) return;

    const targetX = label.getBoundingClientRect().left - tabsNode.getBoundingClientRect().left;
    const targetWidth = label.getBoundingClientRect().width;
    tabUnderlineX.stop();
    tabUnderlineWidth.stop();
    tabUnderlineScaleX.stop();

    if (shouldReduceMotion) {
      tabUnderlineScaleX.set(1);
      tabUnderlineX.set(targetX);
      tabUnderlineWidth.set(targetWidth);
      return;
    }

    void animate(tabUnderlineX, targetX, HOME_TAB_UNDERLINE_MOTION);
    void animate(tabUnderlineWidth, targetWidth, HOME_TAB_UNDERLINE_MOTION);
    if (Math.abs(tabUnderlineScaleX.get() - 1) < 0.0001) {
      tabUnderlineScaleX.set(0.99);
    }
    void animate(tabUnderlineScaleX, 1, HOME_TAB_UNDERLINE_SPRING);
  }

  function selectTab(nextIndex: number) {
    if (!indexedTabs[nextIndex]) return;
    hoverSuppressedRef.current = true;
    setPreviewSuppressed(true);
    paneRefs.current.forEach((pane) => {
      pane.dataset.homeHoverSuppressed = "true";
    });
    resetActiveCase();
    animateTabUnderline(nextIndex);
    if (nextIndex === activeTabIndex) return;
    if (nextIndex === renderedTabIndex) {
      const returningPane = activeTab ? paneRefs.current.get(activeTab.title) : null;
      if (returningPane) {
        delete returningPane.dataset.homePaneExiting;
        returningPane.inert = false;
        returningPane.removeAttribute("aria-hidden");
      }
      setTabDirection(-tabDirection);
      setTabSelectionGeneration((generation) => generation + 1);
      setIncomingRevealStartAt(undefined);
      setActiveTabIndex(nextIndex);
      try {
        window.sessionStorage.setItem(HOME_TAB_STORAGE_KEY, indexedTabs[nextIndex].title);
      } catch {
        // The tab remains usable when session storage is unavailable.
      }
      return;
    }
    const direction = nextIndex > renderedTabIndex ? 1 : -1;
    const outgoingPane = activeTab ? paneRefs.current.get(activeTab.title) : null;
    const outgoingTargets = outgoingPane
      ? Array.from(outgoingPane.querySelectorAll<HTMLElement>("[data-page-reveal]"))
      : [];
    if (outgoingPane && !shouldReduceMotion) {
       outgoingPane.style.setProperty("--home-tab-exit-x", direction > 0 ? `-${HOME_TAB_TRAVEL_PX}px` : `${HOME_TAB_TRAVEL_PX}px`);
      outgoingTargets.forEach((target, index) => {
        const computed = getComputedStyle(target);
        target.style.setProperty("--home-tab-exit-index", String(index));
        target.style.setProperty("--home-tab-exit-start-transform", computed.transform);
        target.style.setProperty("--home-tab-exit-start-opacity", computed.opacity);
        target.style.setProperty("--home-tab-exit-start-filter", computed.filter);
      });
      outgoingPane.dataset.homePaneExiting = "true";
      outgoingPane.inert = true;
      outgoingPane.setAttribute("aria-hidden", "true");
    }
    const returningPane = paneRefs.current.get(indexedTabs[nextIndex].title);
    if (returningPane) {
      delete returningPane.dataset.homePaneExiting;
      returningPane.inert = false;
      returningPane.removeAttribute("aria-hidden");
    }
    setTabDirection(direction);
    setHasChangedTab(true);
    setActiveTabIndex(nextIndex);
    setIncomingRevealStartAt(
      shouldReduceMotion || !outgoingPane || outgoingTargets.length === 0
        ? undefined
         : performance.now() + HOME_TAB_INCOMING_DELAY_MS
    );
    setTabSelectionGeneration((generation) => generation + 1);
    setRenderedTabIndex(nextIndex);
    try {
      window.sessionStorage.setItem(HOME_TAB_STORAGE_KEY, indexedTabs[nextIndex].title);
    } catch {
      // The tab remains usable when session storage is unavailable.
    }
  }

  function onTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const availableIndices = indexedTabs.map((_, tabIndex) => tabIndex);
    if (!availableIndices.length) return;
    const position = availableIndices.indexOf(index);
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") nextIndex = availableIndices[(position + 1) % availableIndices.length];
    if (event.key === "ArrowLeft") nextIndex = position < 0 ? availableIndices[availableIndices.length - 1] : availableIndices[(position - 1 + availableIndices.length) % availableIndices.length];
    if (event.key === "Home") nextIndex = availableIndices[0];
    if (event.key === "End") nextIndex = availableIndices[availableIndices.length - 1];
    if (nextIndex === null) return;

    event.preventDefault();
    selectTab(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  }

  function onListRevealTargetReady(target: HTMLElement) {
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
  }

  return (
    <div className={styles.root}>
      <svg className={styles.previewFilterDefinitions} width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="home-planned-preview-saturation" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncR type="gamma" amplitude="1" exponent="2" offset="0" />
              <feFuncG type="gamma" amplitude="1" exponent="2" offset="0" />
              <feFuncB type="gamma" amplitude="1" exponent="2" offset="0" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>
      <div className={styles.leftColumn}>
        <div className={styles.heroStack}>
          <PageRevealSequence className={styles.revealStack}>
            <h1 className={styles.pageTitle}>{title}</h1>
            <div ref={tabsRef} className={styles.tabs} role="tablist" aria-label={title} data-page-reveal="">
              <motion.span
                aria-hidden="true"
                className={styles.tabActiveUnderline}
                style={{ x: tabUnderlineX, width: tabUnderlineWidth, scaleX: tabUnderlineScaleX }}
              />
              {indexedTabs.map((tab, index) => {
                const isActive = index === activeTabIndex;
                return (
                  <button
                    key={tab.title}
                    ref={(node) => {
                      tabRefs.current[index] = node;
                    }}
                    className={[styles.tab, isActive ? styles.tabActive : ""].filter(Boolean).join(" ")}
                    type="button"
                    role="tab"
                    id={`home-tab-${index}`}
                    aria-controls={`home-tabpanel-${index}`}
                    aria-selected={isActive}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => selectTab(index)}
                    onKeyDown={(event) => onTabKeyDown(event, index)}
                  >
                    <span
                      ref={(node) => {
                        tabLabelRefs.current[index] = node;
                      }}
                      className={styles.tabLabel}
                    >
                      {tab.title}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              ref={paneViewportRef}
              className={styles.paneViewport}
              onPointerDownCapture={(event) => {
                if (event.pointerType !== "touch" || window.innerWidth > 767) return;
                suppressSwipeClickUntilRef.current = 0;
                tabSwipeRef.current = null;
                if (!event.isPrimary || !(event.target instanceof Element)) return;
                if (event.target.closest('button, input, select, textarea, [role="button"], [contenteditable="true"]')) return;
                let node: Element | null = event.target;
                while (node && node !== event.currentTarget) {
                  const overflow = getComputedStyle(node);
                  if ((/(auto|scroll)/.test(overflow.overflowX) && node.scrollWidth > node.clientWidth)
                    || (/(auto|scroll)/.test(overflow.overflowY) && node.scrollHeight > node.clientHeight)) return;
                  node = node.parentElement;
                }
                tabSwipeRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, axis: null };
              }}
              onPointerMoveCapture={(event) => {
                const swipe = tabSwipeRef.current;
                if (!swipe || swipe.pointerId !== event.pointerId) return;
                const dx = event.clientX - swipe.x;
                const dy = event.clientY - swipe.y;
                if (swipe.axis === null && Math.max(Math.abs(dx), Math.abs(dy)) >= 12) {
                  if (Math.abs(dx) > Math.abs(dy) * 1.25) {
                    swipe.axis = "horizontal";
                    event.currentTarget.setPointerCapture(event.pointerId);
                  } else if (Math.abs(dy) >= Math.abs(dx)) {
                    swipe.axis = "vertical";
                  }
                }
                if (swipe.axis === "horizontal") {
                  event.preventDefault();
                  if (Math.abs(dx) >= 48) suppressSwipeClickUntilRef.current = performance.now() + 500;
                }
              }}
              onPointerUpCapture={(event) => {
                const swipe = tabSwipeRef.current;
                if (!swipe || swipe.pointerId !== event.pointerId) return;
                tabSwipeRef.current = null;
                const dx = event.clientX - swipe.x;
                if (swipe.axis !== "horizontal" || Math.abs(dx) < 48) return;
                suppressSwipeClickUntilRef.current = performance.now() + 500;
                event.preventDefault();
                selectTab(activeTabIndexRef.current + (dx < 0 ? 1 : -1));
              }}
              onPointerCancelCapture={() => { tabSwipeRef.current = null; }}
              onClickCapture={(event) => {
                if (event.detail === 0 || performance.now() > suppressSwipeClickUntilRef.current) return;
                suppressSwipeClickUntilRef.current = 0;
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <AnimatePresence key={hasRestoredSavedTab ? "restored" : "initial"} initial={false} mode="popLayout">
                {activeTab ? (
                  <motion.div
                    key={activeTab.title}
                    ref={(node) => {
                      if (!node) return;
                      const key = activeTab.title;
                      paneRefs.current.set(key, node);
                      if (hoverSuppressedRef.current) node.dataset.homeHoverSuppressed = "true";
                      return () => {
                        if (paneRefs.current.get(key) === node) paneRefs.current.delete(key);
                      };
                    }}
                    className={styles.tabPane}
                    role="tabpanel"
                    id={`home-tabpanel-${renderedTabIndex}`}
                    aria-labelledby={`home-tab-${renderedTabIndex}`}
                    initial={false}
                    style={
                      {
                        ["--home-tab-move-duration" as string]: `${HOME_TAB_EXIT_DURATION_MS}ms`,
                        ["--home-tab-stagger" as string]: `${HOME_TAB_EXIT_STAGGER_MS}ms`
                      } as CSSProperties
                    }
                    animate={{ opacity: 1, transition: { duration: 0 } }}
                    exit={
                      shouldReduceMotion
                        ? { opacity: 0, transition: { duration: 0 } }
                        : {
                            opacity: [1, 1, 0],
                            transition: {
                              duration:
                                (HOME_TAB_EXIT_DURATION_MS +
                                  Math.max(
                                    0,
                                    activeTab.sections.reduce(
                                      (count, section) => count + (section.title ? 1 : 0) + section.items.length,
                                      0
                                    ) - 1
                                  ) * HOME_TAB_EXIT_STAGGER_MS) / 1000,
                              times: [0, 0.999, 1],
                              ease: "linear"
                            }
                          }
                    }
                  >
            <motion.div
              className={styles.listWrap}
              ref={(node) => {
                if (!node) return;
                const key = activeTab.title;
                listWrapRefs.current.set(key, node);
                if (activePaneKeyRef.current === key) listWrapRef.current = node;
                return () => {
                  if (listWrapRefs.current.get(key) === node) listWrapRefs.current.delete(key);
                  if (listWrapRef.current === node) listWrapRef.current = null;
                };
              }}
              onMouseMove={onMouseMove}
              style={
                {
                  ["--item-shift-x" as string]: listShiftXVar,
                  ["--item-shift-y" as string]: listShiftYVar,
                  ["--item-shift-scale" as string]: ACTIVE_TEXT_SHIFT_SCALE,
                  ["--page-reveal-x" as string]:
                    hasChangedTab && !shouldReduceMotion
                      ? (tabDirection > 0 ? `${HOME_TAB_TRAVEL_PX}px` : `-${HOME_TAB_TRAVEL_PX}px`)
                      : "0px",
                  ["--page-reveal-y" as string]: hasChangedTab ? "0px" : "28px",
                  ["--page-reveal-move-duration" as string]: `${hasChangedTab ? HOME_TAB_ENTER_WAVE_DURATION_MS : 1120}ms`,
                  ["--page-reveal-visibility-duration" as string]: `${hasChangedTab ? HOME_TAB_ENTER_WAVE_DURATION_MS : 700}ms`,
                  ["--page-reveal-stagger" as string]: `${hasChangedTab ? HOME_TAB_ENTER_STAGGER_MS : HOME_INITIAL_REVEAL_STAGGER_MS}ms`
                } as unknown as CSSProperties
              }
              onMouseLeave={(event) => {
                if (event.currentTarget !== listWrapRef.current || !isActivePaneEvent(event.currentTarget)) return;
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

              {Array.from(activeTab.sections.flatMap((section) => section.items).reduce((groups, { entry, index }) => {
                if (entry.kind === "game") return groups;
                const year = entry.subtitle.split("·")[0].trim();
                groups.set(year, [...(groups.get(year) ?? []), index]);
                return groups;
              }, new Map<string, number[]>())).map(([year, indices]) => (
                <YearGroupBracket
                  key={year}
                  year={year}
                  indices={indices.join(",")}
                  active={activeIndex !== null && indices.includes(activeIndex)}
                  reducedMotion={Boolean(shouldReduceMotion)}
                  isActivePane={isActivePaneEvent}
                />
              ))}
              <PageRevealSequence
                key={`${activeTab.title}-${tabSelectionGeneration}`}
                className={styles.list}
                onTargetReady={onListRevealTargetReady}
                startImmediately={hasChangedTab}
                startAt={incomingRevealStartAt}
                waveDurationMs={hasChangedTab ? HOME_TAB_ENTER_WAVE_DURATION_MS : undefined}
                waveStaggerMs={HOME_TAB_ENTER_STAGGER_MS}
              >
                {activeTab.sections.map((section, sectionIndex) => (
                  <section
                    key={`${section.title ?? "untitled"}-${sectionIndex}`}
                    className={styles.section}
                    data-untitled={section.title ? undefined : "true"}
                    aria-label={section.title}
                  >
                    {section.title ? (
                      <h2 className={styles.sectionTitle} data-page-reveal="">
                        {section.title}
                      </h2>
                    ) : null}
                    <div className={styles.sectionList}>
                      {section.items.map(({ entry, index }) => (
                        <span
                          key={entry.kind === "game" || entry.kind === "planned" ? `${entry.kind}:${entry.slug}` : entry.href}
                          data-page-reveal=""
                          data-home-showcase-index={index}
                        >
                          {entry.kind === "game" ? (
                            <span
                              className={[styles.item, styles.itemGame, activeIndex === index ? styles.itemActive : ""].filter(Boolean).join(" ")}
                              ref={(node) => {
                                if (!node) return;
                                itemInteractionRefs.current[index] = node;
                                return () => {
                                  if (itemInteractionRefs.current[index] === node) itemInteractionRefs.current[index] = null;
                                };
                              }}
                              onMouseEnter={(event) => onItemMouseEnter(index, event)}
                            >
                              <span
                                ref={(node) => {
                                  if (!node) return;
                                  itemVisualRefs.current[index] = node;
                                  return () => {
                                    if (itemVisualRefs.current[index] === node) itemVisualRefs.current[index] = null;
                                  };
                                }}
                                className={styles.itemVisualBounds}
                              >
                                <span
                                  ref={(node) => {
                                    if (!node) return;
                                    itemContentRefs.current[index] = node;
                                    return () => {
                                      if (itemContentRefs.current[index] === node) itemContentRefs.current[index] = null;
                                    };
                                  }}
                                  className={styles.itemContent}
                                >
                                  <span className={styles.itemLabel}>{entry.label}</span>
                                  <span className={styles.itemMeta}>{entry.subtitle}</span>
                                </span>
                              </span>
                            </span>
                          ) : entry.kind === "planned" || entry.href === "/work/globus" ? (
                          <span
                            ref={(node) => {
                              if (!node) return;
                              itemInteractionRefs.current[index] = node;
                              return () => {
                                if (itemInteractionRefs.current[index] === node) itemInteractionRefs.current[index] = null;
                              };
                            }}
                            className={[
                              styles.item,
                              styles.itemNonNavigable,
                              activeIndex === index ? styles.itemActive : ""
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onMouseEnter={(event) => onItemMouseEnter(index, event)}
                          >
                            {/* Temporary: <Link href="/work/globus">...</Link>. Restore the shared Link branch to reopen from home. */}
                            <span
                              ref={(node) => {
                                if (!node) return;
                                itemVisualRefs.current[index] = node;
                                return () => {
                                  if (itemVisualRefs.current[index] === node) itemVisualRefs.current[index] = null;
                                };
                              }}
                              className={styles.itemVisualBounds}
                            >
                              <span
                                ref={(node) => {
                                  if (!node) return;
                                  itemContentRefs.current[index] = node;
                                  return () => {
                                    if (itemContentRefs.current[index] === node) itemContentRefs.current[index] = null;
                                  };
                                }}
                                className={styles.itemContent}
                              >
                                <span className={[styles.itemLabel, styles.itemLabelSecondary].join(" ")}>{entry.label}</span>
                                <span className={styles.itemMeta}>
                                  {entry.kind === "planned" ? entry.statusLabel : <HomeMetrics href={entry.href} />}
                                </span>
                              </span>
                              {entry.stickerSrcs?.length ? (
                                <motion.span
                                  className={styles.hoverIcon}
                                  aria-hidden="true"
                                  initial={{ opacity: 0, filter: shouldReduceMotion ? "blur(0px)" : "blur(4px)" }}
                                  animate={{ opacity: activeIndex === index ? 1 : 0, filter: shouldReduceMotion || activeIndex === index ? "blur(0px)" : "blur(4px)" }}
                                  transition={{
                                    duration: activeIndex === index ? STICKER_APPEARANCE_DURATION_SECONDS : GLASS_OPACITY_DURATION_SECONDS,
                                    delay: activeIndex === index ? STICKER_APPEARANCE_DELAY_SECONDS : 0,
                                    ease: EXPRESSIVE_EASING
                                  }}
                                  style={{ x: shouldReduceMotion ? 0 : iconShiftX, y: shouldReduceMotion ? 0 : iconShiftY, rotate: -15 }}
                                >
                                  <StickerFrameCycle
                                    stickerSrcs={entry.stickerSrcs}
                                    frameIndex={stickerFrameIndices[index] ?? 0}
                                    reducedMotion={Boolean(shouldReduceMotion)}
                                  />
                                </motion.span>
                              ) : null}
                            </span>
                          </span>
                          ) : (
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
                              if (!node) return;
                              itemInteractionRefs.current[index] = node;
                              return () => {
                                if (itemInteractionRefs.current[index] === node) itemInteractionRefs.current[index] = null;
                              };
                            }}
                            className={[
                              styles.item,
                              activeIndex === index ? styles.itemActive : ""
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onMouseEnter={(event) => onItemMouseEnter(index, event)}
                            onFocus={(event) => onItemFocus(index, event)}
                            onBlur={(event) => onItemBlur(index, event)}
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
                                if (!node) return;
                                itemVisualRefs.current[index] = node;
                                return () => {
                                  if (itemVisualRefs.current[index] === node) itemVisualRefs.current[index] = null;
                                };
                              }}
                              className={styles.itemVisualBounds}
                            >
                              <span
                                ref={(node) => {
                                  if (!node) return;
                                  itemContentRefs.current[index] = node;
                                  return () => {
                                    if (itemContentRefs.current[index] === node) itemContentRefs.current[index] = null;
                                  };
                                }}
                                className={styles.itemContent}
                              >
                                <span className={styles.itemLabel}>{entry.label}</span>
                                <span className={styles.itemMeta}>
                                  <HomeMetrics href={entry.href} />
                                </span>
                              </span>
                              {entry.stickerSrcs?.length ? (
                                <motion.span
                                  className={styles.hoverIcon}
                                  aria-hidden="true"
                                  initial={{ opacity: 0, filter: shouldReduceMotion ? "blur(0px)" : "blur(4px)" }}
                                  animate={{ opacity: activeIndex === index ? 1 : 0, filter: shouldReduceMotion || activeIndex === index ? "blur(0px)" : "blur(4px)" }}
                                  transition={{
                                    duration: activeIndex === index ? STICKER_APPEARANCE_DURATION_SECONDS : GLASS_OPACITY_DURATION_SECONDS,
                                    delay: activeIndex === index ? STICKER_APPEARANCE_DELAY_SECONDS : 0,
                                    ease: EXPRESSIVE_EASING
                                  }}
                                  style={{ x: shouldReduceMotion ? 0 : iconShiftX, y: shouldReduceMotion ? 0 : iconShiftY, rotate: -15 }}
                                >
                                  <StickerFrameCycle
                                    stickerSrcs={entry.stickerSrcs}
                                    frameIndex={stickerFrameIndices[index] ?? 0}
                                    reducedMotion={Boolean(shouldReduceMotion)}
                                  />
                                </motion.span>
                              ) : null}
                            </span>
                          </Link>
                          )}
                        </span>
                      ))}
                    </div>
                  </section>
                ))}
              </PageRevealSequence>
            </motion.div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </PageRevealSequence>
        </div>
      </div>

      {portalTarget && !previewSuppressed &&
        createPortal(
          <AnimatePresence>
            {canHover && activeIndex !== null && previewMedia?.src && previewLeft !== null && (
              <motion.aside
                key={previewMedia.isPlannedPreview ? "planned-preview-pane" : "work-preview-pane"}
                className={styles.previewPane}
                style={{ left: `${previewLeft}px` }}
                aria-label="Content area"
                initial={shouldReduceMotion || previewMedia.isPlannedPreview ? { opacity: 0 } : { opacity: 0, filter: "blur(10px)" }}
                animate={shouldReduceMotion || previewMedia.isPlannedPreview ? { opacity: 1 } : { opacity: 1, filter: "blur(0)" }}
                exit={shouldReduceMotion || previewMedia.isPlannedPreview ? { opacity: 0 } : { opacity: 0, filter: "blur(10px)" }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0.18 }
                    : { type: "spring", duration: 0.6, bounce: 0 }
                }
              >
                <div className={styles.contentArea}>
                  <div className={styles.previewStage}>
                    <AnimatePresence mode={shouldReduceMotion ? "sync" : "popLayout"}>
                      <HomePreviewFrame
                        key={previewMedia.isPlannedPreview ? "planned-globus-preview" : previewIndex ?? -1}
                        media={previewMedia}
                        planned={previewMedia.isPlannedPreview}
                        caption={previewMedia.previewCaption}
                        reducedMotion={Boolean(shouldReduceMotion)}
                      />
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
