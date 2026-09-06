import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createCaseMeasurement } from "../../lib/analytics/case-measurement.ts";

// A small effect-lifecycle harness: no DOM rendering and no analytics network calls.
function hooks() {
  const slots = [];
  let cursor = 0;
  let pending = [];
  const react = {
    useRef(initial) {
      const index = cursor++;
      slots[index] ??= { current: initial };
      return slots[index];
    },
    useEffect(setup, deps) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || deps.some((value, i) => value !== previous.deps[i])) {
        pending.push({ index, setup, deps });
      }
    }
  };
  const cleanup = () => {
    for (const slot of slots) slot?.cleanup?.();
  };
  return {
    react,
    render(component, props) {
      cursor = 0;
      pending = [];
      component(props);
      for (const effect of pending) slots[effect.index]?.cleanup?.();
      for (const effect of pending) slots[effect.index] = { ...effect, cleanup: effect.setup() };
    },
    replay() {
      cleanup();
      for (const slot of slots) if (slot?.setup) slot.cleanup = slot.setup();
    },
    cleanup
  };
}

function loadTracker(file, imports, globals, extraExport = "") {
  const source = readFileSync(new URL(`../../components/analytics/${file}`, import.meta.url), "utf8");
  const output = ts.transpileModule(source + extraExport, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  const exports = {};
  runInNewContext(output, {
    exports,
    require(name) {
      if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
      return imports[name];
    },
    ...globals
  });
  return exports;
}

function workFixture() {
  let time = 1_000_000;
  let mode = "full";
  let path = "/work/a/";
  let timerId = 0;
  const timers = new Map();
  const data = new Map();
  const goals = [];
  const lifecycle = hooks();
  const document = Object.assign(new EventTarget(), {
    visibilityState: "visible", documentElement: { scrollHeight: 2_000 }
  });
  const window = Object.assign(new EventTarget(), {
    innerHeight: 1_000, scrollY: 0,
    setInterval(callback) { timers.set(++timerId, callback); return timerId; },
    clearInterval(id) { timers.delete(id); }
  });
  const measurement = createCaseMeasurement(() => ({
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value)
  }), () => time);
  const { WorkCaseAnalyticsTracker } = loadTracker("WorkCaseAnalyticsTracker.tsx", {
    react: lifecycle.react,
    "@/components/sections/WorkShortSummaryToggle": { useWorkShortSummaryState: () => ({ displayMode: mode }) },
    "@/lib/analytics/case-measurement": { caseMeasurement: measurement },
    "@/lib/analytics/yandex-metrica": {
      getCurrentPath: () => path,
      trackMetricaGoal: (goal, params) => goals.push({ goal, params })
    }
  }, { window, document });
  return {
    window, document, lifecycle, goals, timers,
    render(slug = "a", displayMode = mode) {
      mode = displayMode;
      path = `/work/${slug}/`;
      lifecycle.render(WorkCaseAnalyticsTracker, { slug, title: slug.toUpperCase() });
    },
    advance(ms) { time += ms; },
    tick(seconds) {
      for (let i = 0; i < seconds; i++) {
        time += 1_000;
        for (const callback of timers.values()) callback();
      }
    },
    count: (goal) => goals.filter((entry) => entry.goal === goal).length
  };
}

test("component lifecycle counts entries correctly and prevents StrictMode duplicate goals", () => {
  const f = workFixture();
  f.render();
  f.lifecycle.replay();
  assert.equal(f.count("view_case"), 1);
  assert.equal(f.timers.size, 1);
  f.render("b");
  f.lifecycle.replay();
  f.render("c");
  f.render("a");
  assert.equal(f.count("view_case"), 4);
  assert.equal(f.count("view_second_case"), 1);
  f.lifecycle.cleanup();
  assert.equal(f.timers.size, 0);
});

test("component gates scroll by full/visible/scrollable and deduplicates per case", () => {
  const f = workFixture();
  f.render("a", "short");
  f.window.scrollY = 1_000;
  f.window.dispatchEvent(new Event("scroll"));
  assert.equal(f.count("case_scroll_90"), 0);
  f.document.documentElement.scrollHeight = 1_000;
  f.render("a", "full");
  assert.equal(f.count("case_scroll_90"), 0);
  f.document.documentElement.scrollHeight = 2_000;
  f.document.visibilityState = "hidden";
  f.window.dispatchEvent(new Event("scroll"));
  assert.equal(f.count("case_scroll_90"), 0);
  f.document.visibilityState = "visible";
  f.window.dispatchEvent(new Event("scroll"));
  f.window.dispatchEvent(new Event("scroll"));
  assert.equal(f.count("case_scroll_90"), 1);
  f.render("b");
  f.render("a");
  assert.equal(f.count("case_scroll_90"), 2);
  f.lifecycle.cleanup();
});

test("component flushes fractions at route/mode changes and pauses hidden or pagehide time", () => {
  const f = workFixture();
  f.render();
  f.tick(59);
  f.advance(500);
  f.render("b", "short"); // 59.5 seconds carried from a, with a's captured path
  f.tick(100);
  f.render("b", "full");
  f.tick(30);
  f.document.visibilityState = "hidden";
  f.document.dispatchEvent(new Event("visibilitychange"));
  f.tick(100);
  f.document.visibilityState = "visible";
  f.document.dispatchEvent(new Event("visibilitychange"));
  f.window.dispatchEvent(new Event("pagehide"));
  f.tick(100); // even if visibilityState stayed visible, pagehide pauses reading
  f.window.dispatchEvent(new Event("pageshow"));
  f.tick(30);
  assert.equal(f.count("case_read_120s"), 0);
  f.advance(500);
  f.render("b", "short"); // cleanup crosses the threshold exactly
  assert.equal(f.count("case_read_120s"), 1);
  assert.equal(f.goals.find((entry) => entry.goal === "case_read_120s").params.page_path, "/work/b/");
  f.render("c", "full");
  f.tick(10);
  assert.equal(f.count("case_read_120s"), 1);
  f.lifecycle.cleanup();
});

test("route hits include direct entry once, with route_change only for subsequent paths", () => {
  const lifecycle = hooks();
  let pathname = "/work/a/";
  let searchParams = new URLSearchParams("utm_source=test");
  const hits = [];
  const { RouteHitTracker } = loadTracker("YandexMetrica.tsx", {
    react: lifecycle.react,
    "react/jsx-runtime": {},
    "next/script": {},
    "next/navigation": { usePathname: () => pathname, useSearchParams: () => searchParams },
    "@/lib/analytics/yandex-metrica": { trackMetricaHit: (...args) => hits.push(args) }
  }, { document: { title: "Test" } }, "\nexport { RouteHitTracker };\n");
  lifecycle.render(RouteHitTracker);
  lifecycle.replay();
  searchParams = new URLSearchParams("utm_source=test");
  lifecycle.render(RouteHitTracker);
  assert.equal(hits.length, 1);
  assert.equal(hits[0][0], "/work/a/?utm_source=test");
  assert.equal(hits[0][2].route_change, false);
  pathname = "/about/";
  searchParams = new URLSearchParams();
  lifecycle.render(RouteHitTracker);
  assert.equal(hits.length, 2);
  assert.equal(hits[1][2].route_change, true);
});
