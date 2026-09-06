export const CASE_MEASUREMENT_STORAGE_KEY = "portfolio.analytics.case-measurement.v1";
export const MEASUREMENT_IDLE_MS = 30 * 60_000;
export const READ_TARGET_MS = 120_000;
// Longer gaps can be device sleep / a suspended tab, not observed viewing time.
export const MAX_READING_GAP_MS = 5_000;

type MeasurementState = {
  version: 1;
  lastActivityAt: number;
  caseSlugs: string[];
  scrolledSlugs: string[];
  readTimeMs: number;
};

type StorageAccess = () => Pick<Storage, "getItem" | "setItem">;

function isState(value: unknown): value is MeasurementState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<MeasurementState>;
  const isSlugs = (slugs: unknown): slugs is string[] =>
    Array.isArray(slugs) && slugs.every((slug) => typeof slug === "string" && slug.length > 0) &&
    new Set(slugs).size === slugs.length;
  return state.version === 1 && typeof state.lastActivityAt === "number" &&
    Number.isFinite(state.lastActivityAt) && state.lastActivityAt >= 0 &&
    isSlugs(state.caseSlugs) && isSlugs(state.scrolledSlugs) &&
    state.scrolledSlugs.every((slug) => state.caseSlugs!.includes(slug)) &&
    typeof state.readTimeMs === "number" && Number.isFinite(state.readTimeMs) &&
    state.readTimeMs >= 0 && state.readTimeMs <= READ_TARGET_MS;
}

/** Per-tab measurement window, deliberately not a Yandex Metrica visit/session ID. */
export function createCaseMeasurement(storage: StorageAccess, now: () => number = Date.now) {
  let state: MeasurementState | undefined;
  let hydrated = false;

  function current(at: number) {
    if (!hydrated) {
      hydrated = true;
      try {
        const parsed: unknown = JSON.parse(storage().getItem(CASE_MEASUREMENT_STORAGE_KEY) ?? "null");
        if (isState(parsed)) state = parsed;
      } catch {
        // Corrupt/blocked storage degrades to in-memory state for this page lifetime.
      }
    }
    if (!state || at < state.lastActivityAt || at - state.lastActivityAt >= MEASUREMENT_IDLE_MS) {
      state = { version: 1, lastActivityAt: at, caseSlugs: [], scrolledSlugs: [], readTimeMs: 0 };
    }
    return state;
  }

  function persist(value: MeasurementState, at: number) {
    value.lastActivityAt = at;
    try {
      storage().setItem(CASE_MEASUREMENT_STORAGE_KEY, JSON.stringify(value));
    } catch {
      // The same in-memory state still deduplicates SPA transitions.
    }
  }

  function visitCase(slug: string) {
    const at = now();
    const value = current(at);
    const previousSlug = value.caseSlugs.at(-1);
    const isNew = !value.caseSlugs.includes(slug);
    if (isNew) value.caseSlugs.push(slug);
    persist(value, at);
    return isNew && value.caseSlugs.length === 2 ? previousSlug : undefined;
  }

  function recordScroll(slug: string) {
    const at = now();
    const value = current(at);
    if (!value.caseSlugs.includes(slug)) value.caseSlugs.push(slug);
    const isNew = !value.scrolledSlugs.includes(slug);
    if (isNew) value.scrolledSlugs.push(slug);
    persist(value, at);
    return isNew;
  }

  function readingSegment(slug: string, initiallyActive: boolean) {
    let previousAt = now();
    let active = initiallyActive;
    return {
      /** Flush the preceding interval, then set whether the NEXT interval is eligible. */
      sample(nextActive: boolean) {
        const at = now();
        const elapsed = at - previousAt;
        previousAt = at;
        const wasActive = active;
        active = nextActive;
        if (!wasActive || elapsed <= 0 || elapsed > MAX_READING_GAP_MS) return false;
        const value = current(at);
        if (!value.caseSlugs.includes(slug)) value.caseSlugs.push(slug);
        const before = value.readTimeMs;
        value.readTimeMs = Math.min(READ_TARGET_MS, before + elapsed);
        persist(value, at);
        return before < READ_TARGET_MS && value.readTimeMs === READ_TARGET_MS;
      }
    };
  }

  return { visitCase, recordScroll, readingSegment };
}

export const caseMeasurement = createCaseMeasurement(() => window.sessionStorage);
