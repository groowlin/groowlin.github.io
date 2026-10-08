export type Point = { x: number; y: number };
export type Bounds = { width: number; height: number };
export type Axis = "horizontal" | "vertical";
export type Measurement = { axis: Axis; gap: number; start: Point; end: Point };
export type GameProgress = {
  attempts: (number | null)[];
  results: { bestGap: number; deviation: number } | null;
  completed: boolean;
};

export const OBJECT_SIZE = 120;
export const TARGET_GAP = 16;
export const MAX_ATTEMPTS = 5;

export function clampPoint(point: Point, bounds: Bounds): Point {
  return {
    x: Math.round(Math.max(0, Math.min(point.x, bounds.width - OBJECT_SIZE))),
    y: Math.round(Math.max(0, Math.min(point.y, bounds.height - OBJECT_SIZE)))
  };
}

export function initialPositions(bounds: Bounds): [Point, Point] {
  return [
    clampPoint({ x: (bounds.width - 744) / 2 + 110, y: (bounds.height - OBJECT_SIZE) / 2 - 10 }, bounds),
    clampPoint({ x: (bounds.width - 744) / 2 + 283, y: (bounds.height - OBJECT_SIZE) / 2 + 10 }, bounds)
  ];
}

export function centeredInitialPositions(bounds: Bounds): [Point, Point] {
  const gap = 53;
  const span = OBJECT_SIZE * 2 + gap;
  const x = (bounds.width - span) / 2;
  const y = (bounds.height - OBJECT_SIZE) / 2;
  return [
    clampPoint({ x, y: y - 10 }, bounds),
    clampPoint({ x: x + OBJECT_SIZE + gap, y: y + 10 }, bounds)
  ];
}

export function measureGap(a: Point, b: Point, finalMovement: Point): Measurement {
  const overlapX = Math.max(0, Math.min(a.x, b.x) + OBJECT_SIZE - Math.max(a.x, b.x));
  const overlapY = Math.max(0, Math.min(a.y, b.y) + OBJECT_SIZE - Math.max(a.y, b.y));
  const horizontal = overlapY > overlapX || (overlapY === overlapX && Math.abs(finalMovement.x) >= Math.abs(finalMovement.y));
  if (horizontal) {
    const [left, right] = a.x <= b.x ? [a, b] : [b, a];
    const y = overlapY > 0
      ? (Math.max(a.y, b.y) + Math.min(a.y, b.y) + OBJECT_SIZE) / 2
      : (a.y + b.y + OBJECT_SIZE) / 2;
    return { axis: "horizontal", gap: right.x - left.x - OBJECT_SIZE, start: { x: left.x + OBJECT_SIZE, y }, end: { x: right.x, y } };
  }
  const [top, bottom] = a.y <= b.y ? [a, b] : [b, a];
  const x = overlapX > 0
    ? (Math.max(a.x, b.x) + Math.min(a.x, b.x) + OBJECT_SIZE) / 2
    : (a.x + b.x + OBJECT_SIZE) / 2;
  return { axis: "vertical", gap: bottom.y - top.y - OBJECT_SIZE, start: { x, y: top.y + OBJECT_SIZE }, end: { x, y: bottom.y } };
}

export function recordAttempt(progress: GameProgress, gap: number): GameProgress {
  if (progress.completed || !Number.isFinite(gap)) return progress;
  const attempts = [...progress.attempts, gap];
  const measured = attempts.filter((value): value is number => value !== null);
  const bestGap = measured.reduce((best, value) => Math.abs(value - TARGET_GAP) < Math.abs(best - TARGET_GAP) ? value : best);
  return {
    attempts,
    results: { bestGap, deviation: Math.abs(bestGap - TARGET_GAP) },
    completed: gap === TARGET_GAP || attempts.length >= MAX_ATTEMPTS
  };
}

/** Invalid releases spend a life without inventing a measured distance. */
export function recordPenalty(progress: GameProgress): GameProgress {
  if (progress.completed) return progress;
  const attempts = [...progress.attempts, null];
  return { ...progress, attempts, completed: attempts.length >= MAX_ATTEMPTS };
}

/** Dashed witness lines connect a displaced dimension to the actual object faces. */
export function measurementExtensions(a: Point, b: Point, measurement: Measurement): { start: Point; end: Point }[] {
  const horizontal = measurement.axis === "horizontal";
  const [first, second] = (horizontal ? a.x <= b.x : a.y <= b.y) ? [a, b] : [b, a];
  return [measurement.start, measurement.end].flatMap((end, index) => {
    const object = index === 0 ? first : second;
    const start = horizontal
      ? { x: end.x, y: Math.max(object.y, Math.min(end.y, object.y + OBJECT_SIZE)) }
      : { x: Math.max(object.x, Math.min(end.x, object.x + OBJECT_SIZE)), y: end.y };
    return start.x === end.x && start.y === end.y ? [] : [{ start, end }];
  });
}
