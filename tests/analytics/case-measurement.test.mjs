import assert from "node:assert/strict";
import test from "node:test";
import {
  CASE_MEASUREMENT_STORAGE_KEY,
  MAX_READING_GAP_MS,
  MEASUREMENT_IDLE_MS,
  createCaseMeasurement
} from "../../lib/analytics/case-measurement.ts";

function fixture(initial) {
  let time = 1_000_000;
  const data = new Map(initial === undefined ? [] : [[CASE_MEASUREMENT_STORAGE_KEY, initial]]);
  const storage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const reload = () => createCaseMeasurement(() => storage, () => time);
  return {
    measurement: reload(), reload,
    advance: (ms) => { time += ms; },
    state: () => JSON.parse(data.get(CASE_MEASUREMENT_STORAGE_KEY))
  };
}

function read(f, segment, ms) {
  let goals = 0;
  while (ms > 0) {
    const chunk = Math.min(ms, 1_000);
    f.advance(chunk);
    if (segment.sample(true)) goals++;
    ms -= chunk;
  }
  return goals;
}

test("second UNIQUE case fires once, including replay, reload, third and back navigation", () => {
  const f = fixture();
  assert.equal(f.measurement.visitCase("a"), undefined);
  assert.equal(f.measurement.visitCase("a"), undefined);
  const restored = f.reload();
  assert.equal(restored.visitCase("b"), "a");
  assert.equal(restored.visitCase("b"), undefined);
  assert.equal(restored.visitCase("a"), undefined);
  assert.equal(restored.visitCase("c"), undefined);
  assert.equal(f.reload().visitCase("d"), undefined);
});

test("scroll signals deduplicate per case across reload and reset at expiry", () => {
  const f = fixture();
  f.measurement.visitCase("a");
  assert.equal(f.measurement.recordScroll("a"), true);
  assert.equal(f.measurement.recordScroll("a"), false);
  assert.equal(f.measurement.recordScroll("b"), true);
  assert.equal(f.reload().recordScroll("a"), false);
  f.advance(MEASUREMENT_IDLE_MS);
  assert.equal(f.reload().recordScroll("a"), true);
});

test("measurement expires at 30 minutes, not just before; a new second case can fire", () => {
  const f = fixture();
  f.measurement.visitCase("a");
  f.advance(MEASUREMENT_IDLE_MS - 1);
  assert.equal(f.measurement.visitCase("b"), "a");
  f.advance(MEASUREMENT_IDLE_MS);
  assert.equal(f.measurement.visitCase("c"), undefined);
  assert.equal(f.measurement.visitCase("d"), "c");
  assert.deepEqual(f.state().caseSlugs, ["c", "d"]);
});

test("120 seconds accumulate across cases and reload, with fractional cleanup and one goal", () => {
  const f = fixture();
  f.measurement.visitCase("a");
  const first = f.measurement.readingSegment("a", true);
  assert.equal(read(f, first, 60_250), 0);
  first.sample(false);
  f.advance(20_000); // About / short mode / navigation has no eligible reading segment.
  const restored = f.reload();
  restored.visitCase("b");
  const second = restored.readingSegment("b", true);
  assert.equal(read(f, second, 59_749), 0);
  f.advance(1);
  assert.equal(second.sample(true), true);
  assert.equal(read(f, second, 2_000), 0);
  const afterReload = f.reload().readingSegment("b", true);
  assert.equal(read(f, afterReload, 1_000), 0);
  assert.equal(f.state().readTimeMs, 120_000);
});

test("hidden periods pause and resume, initial hidden page accumulates no time", () => {
  const f = fixture();
  f.measurement.visitCase("a");
  const segment = f.measurement.readingSegment("a", false);
  f.advance(5_000);
  segment.sample(true); // becoming visible starts the eligible interval
  f.advance(250);
  segment.sample(false); // visibility/pagehide flushes the last visible fraction
  f.advance(10_000);
  segment.sample(false);
  f.advance(10_000);
  segment.sample(true);
  f.advance(750);
  segment.sample(false); // cleanup on short mode or leaving a case
  assert.equal(f.state().readTimeMs, 1_000);
});

test("actual elapsed time is used; sleeping/suspended gaps are discarded, not capped as reading", () => {
  const f = fixture();
  f.measurement.visitCase("a");
  const segment = f.measurement.readingSegment("a", true);
  f.advance(1_650);
  segment.sample(true);
  f.advance(MAX_READING_GAP_MS + 1);
  segment.sample(true);
  assert.equal(f.state().readTimeMs, 1_650);
  f.advance(MAX_READING_GAP_MS);
  segment.sample(false);
  assert.equal(f.state().readTimeMs, 6_650);
});

test("reading after long absence starts fresh; repeated samples/cleanup cannot double-count", () => {
  const f = fixture();
  f.measurement.visitCase("a");
  const first = f.measurement.readingSegment("a", true);
  read(f, first, 119_000);
  first.sample(false);
  first.sample(false);
  f.advance(MEASUREMENT_IDLE_MS);
  const second = f.measurement.readingSegment("b", true);
  f.advance(1_000);
  assert.equal(second.sample(true), false);
  assert.equal(second.sample(true), false);
  assert.equal(f.state().readTimeMs, 1_000);
  assert.deepEqual(f.state().caseSlugs, ["b"]);
});

test("blocked storage retains in-memory deduplication and reading", () => {
  let time = 100;
  const measurement = createCaseMeasurement(() => { throw new Error("blocked"); }, () => time);
  assert.equal(measurement.visitCase("a"), undefined);
  assert.equal(measurement.visitCase("b"), "a");
  assert.equal(measurement.visitCase("b"), undefined);
  const segment = measurement.readingSegment("b", true);
  let goals = 0;
  for (let i = 0; i < 121; i++) {
    time += 1_000;
    if (segment.sample(true)) goals++;
  }
  assert.equal(goals, 1);
});

test("invalid JSON, malformed/old state and future timestamps are discarded", () => {
  for (const initial of ["broken", "null", "{}", JSON.stringify({
    version: 1, lastActivityAt: 1_000_000, caseSlugs: ["a", "a"], scrolledSlugs: [], readTimeMs: 0
  }), JSON.stringify({
    version: 1, lastActivityAt: 2_000_000, caseSlugs: ["a"], scrolledSlugs: [], readTimeMs: 120_000
  })]) {
    const f = fixture(initial);
    assert.equal(f.measurement.visitCase("b"), undefined);
    assert.equal(f.state().readTimeMs, 0);
  }
});
