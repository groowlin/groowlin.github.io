"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useImperativeHandle, useRef, useState, type Ref, type KeyboardEvent, type PointerEvent } from "react";
import { centeredInitialPositions, clampPoint, measureGap, measurementExtensions, recordAttempt, recordPenalty, OBJECT_SIZE, TARGET_GAP, MAX_ATTEMPTS, type Bounds, type GameProgress, type Measurement, type Point } from "./game-logic";
import { stageForProgress, type PixelPerfectStage } from "./pixel-perfect-stage";
import { PIXEL_PERFECT_COPY } from "./pixel-perfect-copy";
import { ProgressiveBlur, type ProgressiveBlurLayer } from "../design-system/ProgressiveBlur";
import styles from "./games-entry.module.css";

type VisualPhase = "idle" | "dragging" | "zooming" | "measuring" | "measured" | "value-exit" | "success" | "unzooming" | "shaking" | "reset-exit" | "returning" | "final-exit";
type Drag = { id: number; origin: Point; start: Point; last: Point; movement: Point; moved: boolean };
type Camera = { scale: number; x: number; y: number };
export type PixelPerfectHandle = { testWin: () => void };
type Props = { ref?: Ref<PixelPerfectHandle>; active: boolean; resetWhenHidden: boolean; progress: GameProgress; title: string; description: string; onProgress: (progress: GameProgress) => void; onResult: (outcome: "failure" | "win" | "out-of-bounds" | "overlap", gap?: number) => void; onComplete?: () => void };

const EMPTY_PROGRESS: GameProgress = { attempts: [], results: null, completed: false };
const EMPTY_POSITIONS: [Point, Point] = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
const IDENTITY_CAMERA: Camera = { scale: 1, x: 0, y: 0 };
const RETURN_FADE_MS = 280;
const RETURN_SPRING_MS = 550;
const FINAL_FADE_MS = 280;
const RESTART_CROSSFADE_MS = 300;
const CROSSFADE_BLUR_PX = 16;
const CAMERA_EASE = [0.22, 1, 0.36, 1] as const;
const TEXT_MOTION = { initial: { opacity: 0, filter: `blur(${CROSSFADE_BLUR_PX}px)` }, animate: { opacity: 1, filter: "none" }, exit: { opacity: 0, filter: `blur(${CROSSFADE_BLUR_PX}px)` } };
const DRAG_RESISTANCE_EXPONENT = 3;
const BACKDROP_SIZE = 214;
const BACKDROP_SQUARE_COUNT = 3;
const BACKDROP_LOOP_DURATION_SECONDS = 36;
const BACKDROP_INITIAL_OFFSET_PX = 135;
const PROGRESSIVE_BLUR_LAYERS = [
  { blur: 0, maskStart: 0, maskEnd: 25 },
  { blur: 5, maskStart: 8, maskEnd: 35 },
  { blur: 10, maskStart: 16, maskEnd: 45 },
  { blur: 20, maskStart: 24, maskEnd: 55 },
  { blur: 40, maskStart: 32, maskEnd: 65 },
] as const satisfies readonly ProgressiveBlurLayer[];
function backdropDelay(index: number, elapsedSeconds: number) {
  const offset = (BACKDROP_LOOP_DURATION_SECONDS / BACKDROP_SQUARE_COUNT) * (index + BACKDROP_INITIAL_OFFSET_PX / (BACKDROP_SIZE + 16));
  return -((elapsedSeconds + offset) % BACKDROP_LOOP_DURATION_SECONDS);
}
const SPOTLIGHTS = [
  { angles: [-48, -18, -55, -32, -48], duration: 9.7, height: "182%" },
  { angles: [-36, -54, -24, -43, -36], duration: 10.1, height: "176%" },
  { angles: [-20, 14, -36, -8, -20], duration: 11.3, height: "194%" },
  { angles: [4, -18, 27, -4, 4], duration: 8.9, height: "166%" },
  { angles: [26, 48, 8, 39, 26], duration: 12.1, height: "188%" },
  { angles: [41, 20, 58, 31, 41], duration: 9.9, height: "180%" },
  { angles: [53, 30, 62, 19, 53], duration: 10.7, height: "174%" },
] as const;
function wait(ms: number) { return new Promise<void>((resolve) => window.setTimeout(resolve, ms)); }
function bottomRight(bounds: Bounds): Point { return clampPoint({ x: bounds.width - OBJECT_SIZE - 24, y: bounds.height - OBJECT_SIZE - 24 }, bounds); }
function restingTarget(bounds: Bounds): Point { return clampPoint({ x: bounds.width * 160 / 672, y: (bounds.height - OBJECT_SIZE) / 2 + 35 }, bounds); }
function backdropTarget(bounds: Bounds): Point { return { x: bounds.width * 67 / 672, y: (bounds.height - BACKDROP_SIZE) / 2 + 12 }; }
function overlaps(a: Point, b: Point) {
  return a.x < b.x + OBJECT_SIZE && a.x + OBJECT_SIZE > b.x && a.y < b.y + OBJECT_SIZE && a.y + OBJECT_SIZE > b.y;
}
function isFullyContained(point: Point, bounds: Bounds) {
  return point.x >= 0 && point.y >= 0 && point.x + OBJECT_SIZE <= bounds.width && point.y + OBJECT_SIZE <= bounds.height;
}
function isObjectInteractionBlockedPhase(phase: VisualPhase) {
  return phase === "zooming" || phase === "measuring" || phase === "measured" || phase === "value-exit" || phase === "unzooming" || phase === "shaking" || phase === "returning";
}
function resistedOverflowProgress(progress: number) {
  const clamped = Math.min(1, Math.max(0, progress));
  const tail = Math.exp(-DRAG_RESISTANCE_EXPONENT);
  return (
    (1 - Math.exp(-DRAG_RESISTANCE_EXPONENT * clamped)) / DRAG_RESISTANCE_EXPONENT
    - clamped * tail
  ) / (1 - tail);
}
function resistedCursorCoordinate(cursor: number, freeStart: number, freeEnd: number, viewportEnd: number) {
  if (cursor < freeStart) {
    const span = Math.max(freeStart, 1);
    const progress = Math.min(1, Math.max(0, (freeStart - cursor) / span));
    return freeStart - span * resistedOverflowProgress(progress);
  }
  if (cursor > freeEnd) {
    const span = Math.max(viewportEnd - freeEnd, 1);
    const progress = Math.min(1, Math.max(0, (cursor - freeEnd) / span));
    return freeEnd + span * resistedOverflowProgress(progress);
  }
  return cursor;
}
function resistedDragPoint(drag: Drag, cursor: Point, bounds: Bounds): Point {
  const maxX = Math.max(0, bounds.width - OBJECT_SIZE);
  const maxY = Math.max(0, bounds.height - OBJECT_SIZE);
  const freeCursorLeft = drag.start.x - drag.origin.x;
  const freeCursorRight = drag.start.x + maxX - drag.origin.x;
  const freeCursorTop = drag.start.y - drag.origin.y;
  const freeCursorBottom = drag.start.y + maxY - drag.origin.y;
  const mappedCursor = {
    x: resistedCursorCoordinate(cursor.x, freeCursorLeft, freeCursorRight, window.innerWidth),
    y: resistedCursorCoordinate(cursor.y, freeCursorTop, freeCursorBottom, window.innerHeight),
  };
  return {
    x: Math.round(drag.origin.x + mappedCursor.x - drag.start.x),
    y: Math.round(drag.origin.y + mappedCursor.y - drag.start.y),
  };
}
function measurementCamera(measurement: Measurement, bounds: Bounds): Camera {
  const axisSize = measurement.axis === "horizontal" ? bounds.width : bounds.height;
  const axisStart = measurement.axis === "horizontal" ? measurement.start.x : measurement.start.y;
  const axisEnd = measurement.axis === "horizontal" ? measurement.end.x : measurement.end.y;
  const faceSpan = Math.abs(axisEnd - axisStart);
  const availableSpan = Math.max(1, axisSize - 240);
  const scale = availableSpan / Math.max(1, faceSpan);
  const leadingFace = Math.min(axisStart, axisEnd);
  if (measurement.axis === "horizontal") {
    return { scale, x: 120 - leadingFace * scale, y: bounds.height / 2 - measurement.start.y * scale };
  }
  return { scale, x: bounds.width / 2 - measurement.start.x * scale, y: 120 - leadingFace * scale };
}

function AttemptHeart({ spent }: { spent: boolean }) {
  const element = useRef<HTMLSpanElement>(null);
  const previous = useRef(spent);
  const reduced = useReducedMotion();
  useEffect(() => {
    const lost = spent && !previous.current;
    previous.current = spent;
    if (!lost || reduced) return;
    const animation = element.current?.animate([
      { transform: "scale(1) rotate(0deg)" },
      { transform: "scale(1.2) rotate(-12deg)" },
      { transform: "scale(1.2) rotate(12deg)" },
      { transform: "scale(1.12) rotate(-9deg)" },
      { transform: "scale(1.05) rotate(5deg)" },
      { transform: "scale(1) rotate(0deg)" },
    ], { duration: 450, easing: "ease-in-out" });
    return () => animation?.cancel();
  }, [spent, reduced]);
  return <span ref={element} className={styles.life} data-spent={spent}>
    <Image className={styles.lifeActive} src="/media/games/heart-active.png" width={30} height={30} alt="" unoptimized />
    <Image className={styles.lifeSpent} src="/media/games/heart-spent.png" width={30} height={30} alt="" unoptimized />
  </span>;
}

export function PixelPerfect({ ref, active, resetWhenHidden, progress, title, description, onProgress, onResult, onComplete }: Props) {
  const reduceMotion = useReducedMotion();
  const gridId = useId();
  const areaRef = useRef<HTMLDivElement>(null);
  const objectRef = useRef<HTMLButtonElement>(null);
  const restartRef = useRef<HTMLButtonElement>(null);
  const boundsRef = useRef<Bounds>({ width: 0, height: 0 });
  const positionsRef = useRef<[Point, Point]>(EMPTY_POSITIONS); // [draggable, fixed target]
  const dragRef = useRef<Drag | null>(null);
  const keyboardRef = useRef<{ origin: Point; movement: Point } | null>(null);
  const lockedRef = useRef(false);
  const sequenceRef = useRef(0);
  const progressRef = useRef(progress);
  const [stage, setStage] = useState<PixelPerfectStage>(() => stageForProgress(progress));
  const stageRef = useRef(stage);
  const [phase, setPhase] = useState<VisualPhase>("idle");
  const [positions, setPositions] = useState<[Point, Point]>(EMPTY_POSITIONS);
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const backdropStartedAt = useRef<number | null>(null);
  const [backdropGenerations, setBackdropGenerations] = useState(() => Array.from({ length: BACKDROP_SQUARE_COUNT }, (_, index) => ({ generation: 0, delay: backdropDelay(index, 0) })));
  const [ready, setReady] = useState(false);
  const [bounds, setBounds] = useState<Bounds>({ width: 0, height: 0 });
  const [previousReset, setPreviousReset] = useState<boolean | null>(null);
  if (previousReset !== resetWhenHidden) {
    setPreviousReset(resetWhenHidden);
    if (resetWhenHidden) {
      setPhase("idle");
      setMeasurement(null);
      setStage("intro");
      if (bounds.width && bounds.height) setPositions([bottomRight(bounds), positions[1]]);
    }
  }
  const place = (next: [Point, Point]) => { positionsRef.current = next; setPositions(next); };
  const updateProgress = (next: GameProgress) => {
    progressRef.current = next;
    onProgress(next);
  };

  function interruptSequence(preserveRenderedPosition = false) {
    const objectRect = preserveRenderedPosition ? objectRef.current?.getBoundingClientRect() : null;
    const areaRect = preserveRenderedPosition ? areaRef.current?.getBoundingClientRect() : null;
    sequenceRef.current += 1;
    lockedRef.current = false;
    keyboardRef.current = null;
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && objectRef.current?.hasPointerCapture(drag.id)) objectRef.current.releasePointerCapture(drag.id);
    setMeasurement(null);
    setPhase("idle");
    if (objectRect && areaRect && stageRef.current === "play") {
      place([{ x: Math.round(objectRect.left - areaRect.left), y: Math.round(objectRect.top - areaRect.top) }, positionsRef.current[1]]);
    }
  }

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const observer = new ResizeObserver(() => {
      const bounds = { width: area.clientWidth, height: area.clientHeight };
      if (!bounds.width || !bounds.height) return;
      const firstLayout = !boundsRef.current.width || !boundsRef.current.height;
      boundsRef.current = bounds;
      setBounds(bounds);
      dragRef.current = null;
      keyboardRef.current = null;
      lockedRef.current = false;
      sequenceRef.current += 1;
      setPhase("idle");
      setMeasurement(null);
      if (firstLayout) {
        backdropStartedAt.current = performance.now();
        const centered = centeredInitialPositions(bounds);
        place(stageRef.current === "play" ? [centered[1], centered[0]] : [bottomRight(bounds), restingTarget(bounds)]);
      } else {
        place([stageRef.current === "intro" || stageRef.current === "final-result" ? bottomRight(bounds) : clampPoint(positionsRef.current[0], bounds), stageRef.current === "play" ? clampPoint(positionsRef.current[1], bounds) : restingTarget(bounds)]);
      }
      setReady(true);
    });
    observer.observe(area);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => { sequenceRef.current += 1; }, []);
  useEffect(() => {
    const synchronizeBackdrop = () => {
      if (document.visibilityState !== "visible" || reduceMotion || backdropStartedAt.current === null) return;
      const elapsed = (performance.now() - backdropStartedAt.current) / 1000;
      setBackdropGenerations((current) => current.map((square, index) => ({ generation: square.generation + 1, delay: backdropDelay(index, elapsed) })));
    };
    document.addEventListener("visibilitychange", synchronizeBackdrop);
    return () => document.removeEventListener("visibilitychange", synchronizeBackdrop);
  }, [reduceMotion]);
  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => {
    if (active && stage === "final-result") restartRef.current?.focus({ preventScroll: true });
  }, [active, stage]);
  useEffect(() => {
    if (active) return;
    sequenceRef.current += 1;
    dragRef.current = null;
    keyboardRef.current = null;
    lockedRef.current = false;
  }, [active]);

  useEffect(() => {
    if (!resetWhenHidden) return;
    stageRef.current = "intro";
    if (boundsRef.current.width && boundsRef.current.height) positionsRef.current = [bottomRight(boundsRef.current), positionsRef.current[1]];
  }, [resetWhenHidden]);

  function enterPlay() {
    if (progressRef.current.completed) updateProgress(EMPTY_PROGRESS);
    if (stageRef.current === "play") return;
    setMeasurement(null);
    stageRef.current = "play";
    setStage("play");
  }

  async function advance() {
    if (!active || stageRef.current !== "final-result" || phase === "reset-exit") return;
    interruptSequence();
    const sequence = sequenceRef.current;
    lockedRef.current = true;
    setPhase("reset-exit");
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (sequence !== sequenceRef.current) return;
    onComplete?.();
  }

  async function returnObject(point: Point, sequence: number) {
    lockedRef.current = true;
    setPhase("returning");
    place([point, positionsRef.current[1]]);
    await wait(reduceMotion ? 0 : RETURN_SPRING_MS);
    if (sequence !== sequenceRef.current) return;
    setPhase("idle");
    lockedRef.current = false;
  }

  async function finish(movement: Point, baseProgress?: GameProgress) {
    if (!active || lockedRef.current) return;
    const sequence = ++sequenceRef.current;
    lockedRef.current = true;
    const attemptProgress = baseProgress ?? (progressRef.current.completed ? EMPTY_PROGRESS : progressRef.current);
    const pause = (ms: number) => wait(reduceMotion ? 0 : ms);
    const outside = !isFullyContained(positionsRef.current[0], boundsRef.current);
    if (outside || overlaps(positionsRef.current[0], positionsRef.current[1])) {
      const nextProgress = recordPenalty(attemptProgress);
      setMeasurement(null);
      updateProgress(nextProgress);
      onResult(outside ? "out-of-bounds" : "overlap");
      setPhase("shaking");
      await pause(150);
      if (sequence !== sequenceRef.current) return;
      if (nextProgress.completed) {
        await wait(500);
        if (sequence !== sequenceRef.current) return;
        setPhase("final-exit");
        await pause(FINAL_FADE_MS);
        if (sequence !== sequenceRef.current) return;
        stageRef.current = "final-result";
        setStage("final-result");
        place([bottomRight(boundsRef.current), restingTarget(boundsRef.current)]);
        setPhase("idle");
        lockedRef.current = false;
        return;
      }
      await returnObject(bottomRight(boundsRef.current), sequence);
      return;
    }
    const result = measureGap(positionsRef.current[0], positionsRef.current[1], movement);
    const nextProgress = recordAttempt(attemptProgress, result.gap);
    setMeasurement(result);
    setPhase("zooming");
    await pause(400);
    if (sequence !== sequenceRef.current) return;
    setPhase("measured");
    await wait(520);
    if (sequence !== sequenceRef.current) return;
    setPhase("value-exit");
    await wait(80);
    if (sequence !== sequenceRef.current) return;
    if (nextProgress.completed) {
      updateProgress(nextProgress);
      onResult(result.gap === TARGET_GAP ? "win" : "failure", result.gap);
      if (result.gap !== TARGET_GAP) {
        // Let the terminal campaign reaction appear before the existing result transition.
        await wait(800);
        if (sequence !== sequenceRef.current) return;
      }
      setPhase("final-exit");
      await pause(FINAL_FADE_MS);
      if (sequence !== sequenceRef.current) return;
      stageRef.current = "final-result";
      setStage("final-result");
      place([bottomRight(boundsRef.current), restingTarget(boundsRef.current)]);
      setMeasurement(null);
      if (result.gap === TARGET_GAP) {
        setPhase("success");
        await pause(1600);
        if (sequence !== sequenceRef.current) return;
      }
      setPhase("idle");
      lockedRef.current = false;
      return;
    }
    setPhase("unzooming");
    await pause(450);
    if (sequence !== sequenceRef.current) return;
    setMeasurement(null);
    updateProgress(nextProgress);
    onResult("failure", result.gap);
    await returnObject(bottomRight(boundsRef.current), sequence);
  }

  useImperativeHandle(ref, () => ({
    testWin() {
      if (!active) return;
      interruptSequence();
      updateProgress(EMPTY_PROGRESS);
      const target = restingTarget(boundsRef.current);
      place([{ x: target.x + OBJECT_SIZE + TARGET_GAP, y: target.y }, target]);
      stageRef.current = "play";
      setStage("play");
      void finish({ x: 1, y: 0 }, EMPTY_PROGRESS);
    },
  }));

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!active || dragRef.current || isObjectInteractionBlockedPhase(phase) || !event.isPrimary || event.button !== 0) return;
    const startsNewSeries = phase === "final-exit" && progressRef.current.completed;
    interruptSequence(true);
    if (startsNewSeries) updateProgress(EMPTY_PROGRESS);
    const point = { x: event.clientX, y: event.clientY };
    dragRef.current = { id: event.pointerId, origin: positionsRef.current[0], start: point, last: point, movement: { x: 0, y: 0 }, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.start.x;
    const dy = event.clientY - drag.start.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    if (!drag.moved) { drag.moved = true; enterPlay(); setPhase("dragging"); }
    const movement = { x: event.clientX - drag.last.x, y: event.clientY - drag.last.y };
    const point = resistedDragPoint(drag, { x: event.clientX, y: event.clientY }, boundsRef.current);
    if (movement.x || movement.y) drag.movement = movement;
    drag.last = { x: event.clientX, y: event.clientY };
    place([point, positionsRef.current[1]]);
  }
  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    moveDrag(event);
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag.moved) void finish(drag.movement); else setPhase("idle");
  }
  function cancelDrag(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;
    void returnObject(drag.origin, ++sequenceRef.current);
  }
  function keyMove(event: KeyboardEvent<HTMLButtonElement>) {
    if (!active || dragRef.current) return;
    const isMovement = event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowDown";
    if (!isMovement && event.key !== "Escape" && event.key !== "Enter" && event.key !== " ") return;
    if (isMovement && isObjectInteractionBlockedPhase(phase)) return;
    const startsNewSeries = phase === "final-exit" && progressRef.current.completed && event.key !== "Escape";
    if (lockedRef.current) interruptSequence(true);
    if (startsNewSeries) updateProgress(EMPTY_PROGRESS);
    if (event.key === "Escape") {
      if (keyboardRef.current) void returnObject(keyboardRef.current.origin, ++sequenceRef.current);
      keyboardRef.current = null;
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (keyboardRef.current) { const movement = keyboardRef.current.movement; keyboardRef.current = null; void finish(movement); }
      return;
    }
    const step = event.shiftKey ? 10 : 1;
    const movements: Record<string, Point> = { ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step } };
    const movement = movements[event.key];
    if (!movement) return;
    event.preventDefault();
    if (!keyboardRef.current) { enterPlay(); keyboardRef.current = { origin: positionsRef.current[0], movement }; } else keyboardRef.current.movement = movement;
    setPhase("dragging");
    place([clampPoint({ x: positionsRef.current[0].x + movement.x, y: positionsRef.current[0].y + movement.y }, boundsRef.current), positionsRef.current[1]]);
  }

  const camera = measurement ? measurementCamera(measurement, bounds) : IDENTITY_CAMERA;
  const zoomed = stage === "play" && measurement !== null && (phase === "zooming" || phase === "measuring" || phase === "measured" || phase === "value-exit" || phase === "final-exit");
  const cameraTarget = zoomed ? camera : IDENTITY_CAMERA;
  const displayStage = phase === "final-exit" ? "final-result" : stage;
  const bestGap = progress.results?.bestGap;
  const textMotion = reduceMotion ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } : TEXT_MOTION;
  const restartCrossfade = phase === "reset-exit";
  const textTransition = { duration: restartCrossfade ? RESTART_CROSSFADE_MS / 1000 : reduceMotion ? 0 : RETURN_FADE_MS / 1000 };
  const lineVisible = zoomed && phase !== "final-exit";
  const valueVisible = phase === "measured" || phase === "value-exit";
  const won = progress.results?.deviation === 0;
  const extensions = measurement ? measurementExtensions(positions[0], positions[1], measurement) : [];
  const midpoint = measurement ? { x: ((measurement.start.x + measurement.end.x) / 2) * camera.scale + camera.x, y: ((measurement.start.y + measurement.end.y) / 2) * camera.scale + camera.y } : { x: 0, y: 0 };
  const screenMeasurement = measurement ? {
    start: { x: measurement.start.x * cameraTarget.scale + cameraTarget.x, y: measurement.start.y * cameraTarget.scale + cameraTarget.y },
    end: { x: measurement.end.x * cameraTarget.scale + cameraTarget.x, y: measurement.end.y * cameraTarget.scale + cameraTarget.y },
  } : null;
  const cameraTransition = { duration: reduceMotion || stage === "final-result" ? 0 : zoomed ? 0.4 : 0.45, ease: CAMERA_EASE };
  const cap = measurement?.axis === "horizontal" ? { dx: 0, dy: 12 } : { dx: 12, dy: 0 };
  const background = backdropTarget(bounds);
  const finalExit = phase === "final-exit";
  const objectHidden = finalExit;
  const squareBlur = reduceMotion ? "none" : `blur(${CROSSFADE_BLUR_PX / Math.max(1, cameraTarget.scale)}px)`;
  const squareTransition = { duration: restartCrossfade ? RESTART_CROSSFADE_MS / 1000 : reduceMotion ? 0 : (finalExit ? FINAL_FADE_MS : RETURN_FADE_MS) / 1000 };
  const positionTransition = !reduceMotion && phase === "returning" ? { type: "spring" as const, duration: RETURN_SPRING_MS / 1000, bounce: 0.16 } : { duration: 0 };

  return (
    <div className={`${styles.gameScreen} ${styles.pixelPerfect}`} data-game-stage={stage} data-visual-phase={phase} data-result={stage === "final-result" ? won ? "win" : "neutral" : undefined}>
      <div ref={areaRef} className={styles.area} aria-describedby="pixel-perfect-keyboard">
        <span id="pixel-perfect-keyboard" className={styles.srOnly}>Стрелки перемещают объект на 1 px, Shift — на 10 px. Enter или пробел запускает замер, Escape отменяет перемещение.</span>
        <AnimatePresence mode="sync">
          {stage === "final-result" && won && <motion.div className={styles.spotlights} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: RESTART_CROSSFADE_MS / 1000, ease: "easeIn" } }} transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }} aria-hidden="true">
            {SPOTLIGHTS.map((beam, index) => <motion.div key={index} className={styles.spotlight} style={{ height: beam.height }} initial={false} animate={{ rotate: reduceMotion || !active ? beam.angles[0] : [...beam.angles] }} transition={{ duration: beam.duration, times: [0, 0.19, 0.53, 0.81, 1], ease: "easeInOut", repeat: Infinity }}><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M50 100 L15 18 Q0 0 50 0 Q100 0 85 18 Z" /></svg></motion.div>)}
          </motion.div>}
        </AnimatePresence>
        <AnimatePresence mode="sync">
          {displayStage !== "play" && <motion.div key={displayStage} className={displayStage === "intro" ? styles.introCopy : styles.finalCopy} role={displayStage === "final-result" ? "status" : undefined} {...textMotion} transition={textTransition}>
            <Image className={styles.gameIcon} src={displayStage === "intro" ? PIXEL_PERFECT_COPY.introIcon : won ? PIXEL_PERFECT_COPY.winIcon : PIXEL_PERFECT_COPY.neutralIcon} alt="" width={109} height={100} unoptimized draggable={false} />
            <h2 className={styles.gameTitle}>{displayStage === "intro" ? title : won ? PIXEL_PERFECT_COPY.winTitle : bestGap === undefined ? "???" : `${bestGap} px`}</h2>
            <p className={styles.gameDescription}>{displayStage === "intro" ? description.split(/(rectangle)/).map((part, index) => part === "rectangle" ? <span key={index} className={styles.rectangleWord}>{part}</span> : part) : PIXEL_PERFECT_COPY.neutralTitle}</p>
          </motion.div>}
          {displayStage === "play" && <motion.div key="hud" className={styles.gameHud} {...textMotion} transition={textTransition} role="status" aria-label={`Осталось попыток: ${MAX_ATTEMPTS - progress.attempts.length}`}>
            {Array.from({ length: MAX_ATTEMPTS }, (_, index) => <AttemptHeart key={index} spent={index >= MAX_ATTEMPTS - progress.attempts.length} />)}
          </motion.div>}
        </AnimatePresence>
        <div className={styles.backgroundLayer} aria-hidden="true">
          {ready && backdropGenerations.map(({ generation, delay }, index) => <motion.div
            key={`backdrop-${index}-${generation}`}
            className={styles.backdropSquare}
            data-square-index={index}
            style={{
              top: background.y,
              animationDelay: `${delay}s`,
              animationDuration: `${BACKDROP_LOOP_DURATION_SECONDS}s`,
              animationPlayState: reduceMotion ? "paused" : "running",
            }}
            initial={generation === 0 ? textMotion.initial : false}
            animate={displayStage !== "play" ? textMotion.animate : textMotion.exit}
            transition={textTransition}
            onAnimationEnd={() => {
              if (reduceMotion || document.visibilityState !== "visible" || backdropStartedAt.current === null) return;
              const elapsed = (performance.now() - backdropStartedAt.current) / 1000;
              setBackdropGenerations((current) => current.map((square, squareIndex) => squareIndex === index && square.generation === generation ? { generation: square.generation + 1, delay: backdropDelay(index, elapsed) } : square));
            }}
          />)}

          {/* Keep backdrop filters out of opacity/WAAPI animations. Only the source squares crossfade. */}
          {ready && <ProgressiveBlur direction="left-to-right" layers={PROGRESSIVE_BLUR_LAYERS} />}
          {ready && <i className={styles.backdropTint} />}

        </div>
        <div className={styles.playLayer} aria-hidden="true">
          <motion.div className={styles.gameScene} initial={false} animate={{ x: cameraTarget.x, y: cameraTarget.y, scale: cameraTarget.scale }} transition={cameraTransition}>
          {stage === "play" && measurement && <motion.svg className={styles.pixelGrid} width={bounds.width} height={bounds.height} initial={false} animate={{ opacity: zoomed && !finalExit ? 1 : 0 }} transition={finalExit ? squareTransition : cameraTransition} aria-hidden="true" data-grid-unit="1">
            <defs><pattern id={gridId} width="1" height="1" patternUnits="userSpaceOnUse"><path d="M 1 0 L 0 0 0 1" fill="none" stroke="currentColor" strokeWidth={0.5 / Math.max(1, camera.scale)} /></pattern></defs>
            <rect width="100%" height="100%" fill={`url(#${gridId})`} />
          </motion.svg>}
            <AnimatePresence mode="sync">{ready && stage === "play" && <motion.div key="play-target" className={styles.targetObject} style={{ left: positions[1].x, top: positions[1].y }} {...textMotion} initial={{ ...textMotion.initial, filter: squareBlur }} exit={{ opacity: 0, filter: squareBlur }} animate={{ opacity: finalExit ? 0 : 1, filter: finalExit ? squareBlur : "none" }} transition={squareTransition} />}</AnimatePresence>
          </motion.div>
        </div>
        <motion.div className={styles.objectScene} initial={false} animate={{ x: cameraTarget.x, y: cameraTarget.y, scale: cameraTarget.scale }} transition={cameraTransition}>
          {ready && stage !== "final-result" && <motion.button ref={objectRef} type="button" className={styles.object} data-dragging={phase === "dragging"} aria-label="Перемещаемый объект" aria-describedby="pixel-perfect-keyboard" aria-disabled={!active || isObjectInteractionBlockedPhase(phase)} tabIndex={active ? 0 : -1} initial={{ ...textMotion.initial, filter: squareBlur, x: positions[0].x, y: positions[0].y }} animate={{ x: positions[0].x, y: positions[0].y, opacity: objectHidden ? 0 : 1, filter: objectHidden ? squareBlur : "none" }} transition={{ ...squareTransition, x: positionTransition, y: positionTransition }} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={cancelDrag} onLostPointerCapture={cancelDrag} onKeyDown={keyMove} />}
        </motion.div>
        {screenMeasurement && measurement && <svg className={styles.measurementLayer} viewBox={`0 0 ${bounds.width} ${bounds.height}`} aria-hidden="true">
          {extensions.map((extension, index) => <motion.line key={index} className={styles.measurementExtension}
            initial={{ x1: extension.start.x, y1: extension.start.y, x2: extension.end.x, y2: extension.end.y, opacity: 0 }}
            animate={{ x1: extension.start.x * cameraTarget.scale + cameraTarget.x, y1: extension.start.y * cameraTarget.scale + cameraTarget.y, x2: extension.end.x * cameraTarget.scale + cameraTarget.x, y2: extension.end.y * cameraTarget.scale + cameraTarget.y, opacity: lineVisible ? 1 : 0 }} transition={cameraTransition} />)}
          <motion.line className={styles.measurementLine}
            initial={{ x1: measurement.start.x, y1: measurement.start.y, x2: measurement.end.x, y2: measurement.end.y, pathLength: 0, opacity: 0 }}
            animate={{ x1: screenMeasurement.start.x, y1: screenMeasurement.start.y, x2: screenMeasurement.end.x, y2: screenMeasurement.end.y, pathLength: lineVisible ? 1 : 0, opacity: lineVisible ? 1 : 0 }} transition={cameraTransition} />
          <motion.line className={styles.measurementCap}
            initial={{ x1: measurement.start.x - cap.dx, y1: measurement.start.y - cap.dy, x2: measurement.start.x + cap.dx, y2: measurement.start.y + cap.dy, opacity: 0 }}
            animate={{ x1: screenMeasurement.start.x - cap.dx, y1: screenMeasurement.start.y - cap.dy, x2: screenMeasurement.start.x + cap.dx, y2: screenMeasurement.start.y + cap.dy, opacity: lineVisible ? 1 : 0 }} transition={cameraTransition} />
          <motion.line className={styles.measurementCap}
            initial={{ x1: measurement.end.x - cap.dx, y1: measurement.end.y - cap.dy, x2: measurement.end.x + cap.dx, y2: measurement.end.y + cap.dy, opacity: 0 }}
            animate={{ x1: screenMeasurement.end.x - cap.dx, y1: screenMeasurement.end.y - cap.dy, x2: screenMeasurement.end.x + cap.dx, y2: screenMeasurement.end.y + cap.dy, opacity: lineVisible ? 1 : 0 }} transition={cameraTransition} />
        </svg>}
        {measurement && valueVisible && <motion.span className={styles.measurementValue} data-axis={measurement.axis} style={{ left: midpoint.x, top: midpoint.y }} initial={{ opacity: 0, filter: reduceMotion ? "blur(0px)" : "blur(4px)" }} animate={{ opacity: phase === "measured" ? 1 : 0, filter: phase === "measured" || reduceMotion ? "blur(0px)" : "blur(4px)" }} transition={{ duration: 0.08 }}>{measurement.gap}</motion.span>}

        <AnimatePresence mode="sync">
          {stage === "final-result" && <motion.button ref={restartRef} type="button" className={styles.restartGame} aria-label={PIXEL_PERFECT_COPY.replay} disabled={!active || phase === "reset-exit"} onClick={() => void advance()} exit={{ opacity: 0 }} transition={{ duration: RESTART_CROSSFADE_MS / 1000, ease: "easeIn" }}>
            <motion.span className={styles.restartHint} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, ease: "easeOut" }}><span className={styles.restartHintContent}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 12V5a2 2 0 0 1 4 0v6-2a2 2 0 0 1 4 0v2-1a2 2 0 0 1 4 0v6c0 4-2 6-6 6h-1c-2 0-3-1-4-2l-5-6a2 2 0 0 1 3-2l2 2" /><path d="M4 7a6 6 0 0 1 12-2" /></svg>{PIXEL_PERFECT_COPY.replay}</span></motion.span>
          </motion.button>}
        </AnimatePresence>
      </div>
    </div>
  );
}
