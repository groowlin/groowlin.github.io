import test from "node:test";
import assert from "node:assert/strict";
import { calculateGameFrameTop, scrollToElement, scrollToPageBottom, waitForAnimations, waitForCloseExit, waitForReturnThenReveal } from "./experience-lifecycle.ts";
import { clearMascotVisual, freezeMascotVisual, prepareMascotExit, resetMascot, revealMascot } from "./mascot-motion.ts";

function browser(t) {
  const frames = new Map();
  let frameId = 0;
  const document = new EventTarget();
  document.documentElement = { scrollHeight: 2000 };
  const calls = [];
  const window = { scrollY: 0, innerHeight: 800, scrollTo: (options) => { calls.push(options); } };
  const values = {
    window,
    document,
    getComputedStyle: () => ({ scrollMarginTop: "32px" }),
    requestAnimationFrame: (callback) => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: (id) => frames.delete(id)
  };
  for (const [key, value] of Object.entries(values)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    });
  }
  async function advance(count = 1) {
    for (let index = 0; index < count; index++) {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback());
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    }
  }
  const target = { getBoundingClientRect: () => ({ top: 632 - window.scrollY, bottom: 1174 - window.scrollY }) };
  return { window, document, calls, frames, target, advance };
}

test("scroll completion waits for layout and actual smooth-scroll movement to settle", async (t) => {
  const env = browser(t);
  let finished = false;
  const work = scrollToElement(env.target, "start", false, new AbortController().signal).then(() => { finished = true; });
  await env.advance(2);
  assert.deepEqual(env.calls, [{ top: 600, behavior: "smooth" }]);
  await env.advance(8);
  assert.equal(finished, false, "a delay alone must not finish the interaction before scrolling starts");
  env.window.scrollY = 250;
  await env.advance();
  env.window.scrollY = 600;
  await env.advance(4);
  assert.equal(finished, false);
  await env.advance();
  await work;
  assert.equal(finished, true);
  assert.equal(env.frames.size, 0);
});

test("frame center is halfway from viewport top to measured bubble top", () => {
  const top = calculateGameFrameTop(800, 720, 400);
  assert.equal(top, 160);
  assert.equal(top + 200, 720 / 2);
  assert.equal(calculateGameFrameTop(300, 100, 200), 0);
});

test("frame top is calculated in panel-local coordinates", () => {
  const top = calculateGameFrameTop(800, 665, 400, -72);
  assert.equal(top, 168.5);
  assert.equal(top + 200, (665 - -72) / 2);
});

test("frame position is invariant while panel and bubble scroll together", () => {
  const beforeScroll = calculateGameFrameTop(800, 1465, 400, 800);
  const afterScroll = calculateGameFrameTop(800, 665, 400, 0);
  assert.equal(beforeScroll, 132.5);
  assert.equal(afterScroll, 132.5);
  assert.equal(afterScroll, beforeScroll, "document scroll must not retarget the moving frame");
  assert.equal(afterScroll + 200, 665 / 2);
});

test("native scrollend completes the scroll, stale pre-movement events do not", async (t) => {
  const env = browser(t);
  let finished = false;
  const work = scrollToElement(env.target, "start", false, new AbortController().signal).then(() => { finished = true; });
  await env.advance(2);
  env.document.dispatchEvent(new Event("scrollend"));
  await Promise.resolve();
  assert.equal(finished, false);
  env.window.scrollY = 600;
  env.document.dispatchEvent(new Event("scrollend"));
  await work;
  assert.equal(finished, true);
});

test("reduced-motion uses auto and finishes after the actual position update", async (t) => {
  const env = browser(t);
  env.window.scrollTo = (options) => { env.calls.push(options); env.window.scrollY = options.top; };
  const work = scrollToElement(env.target, "end", true, new AbortController().signal);
  await env.advance(2);
  await work;
  assert.deepEqual(env.calls, [{ top: 374, behavior: "auto" }]);
  assert.equal(env.frames.size, 0);
});

test("rapid replacement aborts the old scroll observer and frame callbacks", async (t) => {
  const env = browser(t);
  const controller = new AbortController();
  const work = scrollToElement(env.target, "start", false, controller.signal);
  await env.advance(2);
  controller.abort();
  await assert.rejects(work, { name: "AbortError" });
  assert.equal(env.frames.size, 0);
});

test("stage completion waits for the unified whole-card progress animation", async (t) => {
  const env = browser(t);
  let finishProgress;
  let finished = false;
  const element = { getAnimations: () => [
    { finished: new Promise((resolve) => { finishProgress = resolve; }) }
  ] };
  const work = waitForAnimations(element, new AbortController().signal).then(() => { finished = true; });
  await env.advance();
  finishProgress();
  await work;
  assert.equal(finished, true);
});

test("closing waits for mascot exit and every mirrored frame animation before return scroll", async () => {
  let resolveMascot;
  let resolveFrame;
  const mascot = new Promise((resolve) => { resolveMascot = resolve; });
  const frame = new Promise((resolve) => { resolveFrame = resolve; });
  const work = waitForCloseExit(() => mascot, () => frame);
  let finished = false;
  void work.then(() => { finished = true; });
  resolveMascot();
  await Promise.resolve();
  assert.equal(finished, false);
  resolveFrame();
  await work;
  assert.equal(finished, true);
});

test("closing reads both exit promises when its closing phase starts", async () => {
  let resolveMascot;
  let resolveFrame;
  const mascot = new Promise((resolve) => { resolveMascot = resolve; });
  const frame = new Promise((resolve) => { resolveFrame = resolve; });
  let mascotRead = false;
  let frameRead = false;
  const work = waitForCloseExit(
    () => { mascotRead = true; return mascot; },
    () => { frameRead = true; return frame; }
  );
  assert.equal(mascotRead, true);
  assert.equal(frameRead, true);
  let finished = false;
  void work.then(() => { finished = true; });
  resolveMascot();
  await Promise.resolve();
  assert.equal(finished, false);
  resolveFrame();
  await work;
  assert.equal(finished, true);
});

test("default mascot reveal starts only after return scroll completes", async () => {
  let finishScroll;
  const order = [];
  const scroll = new Promise((resolve) => { finishScroll = resolve; });
  const work = waitForReturnThenReveal(
    () => { order.push("scroll-start"); return scroll; },
    async () => { order.push("mascot-reveal"); }
  );
  await Promise.resolve();
  assert.deepEqual(order, ["scroll-start"]);
  finishScroll();
  await work;
  assert.deepEqual(order, ["scroll-start", "mascot-reveal"]);
});

test("mascot departure freezes the currently rendered default or hover variant", (t) => {
  browser(t);
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "getComputedStyle");
  Object.defineProperty(globalThis, "getComputedStyle", {
    value: (element) => ({ visibility: element.visible ? "visible" : "hidden" }),
    configurable: true,
    writable: true
  });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, "getComputedStyle", descriptor);
    else delete globalThis.getComputedStyle;
  });
  const hoverImages = [{ visible: false }, { visible: true }];
  const element = { dataset: {}, querySelectorAll: () => hoverImages };
  freezeMascotVisual(element);
  assert.deepEqual(element.dataset, { mascotDepartureVariant: "hover", mascotDeparting: "true" });
  clearMascotVisual(element);
  assert.deepEqual(element.dataset, {});
  hoverImages[1].visible = false;
  freezeMascotVisual(element);
  assert.equal(element.dataset.mascotDepartureVariant, "default");
});

test("mascot departure starts together with scroll after the layout frames", async (t) => {
  const env = browser(t);
  let departures = 0;
  const work = scrollToElement(env.target, "start", false, new AbortController().signal, () => { departures += 1; });
  assert.equal(departures, 0);
  await env.advance(2);
  assert.equal(departures, 1);
  assert.equal(env.calls.length, 1);
  env.window.scrollY = 600;
  env.document.dispatchEvent(new Event("scrollend"));
  await work;
});

test("explicit opening scroll targets the current document bottom after reservation", async (t) => {
  const env = browser(t);
  env.document.documentElement.scrollHeight = 2400;
  let departures = 0;
  const work = scrollToPageBottom(false, new AbortController().signal, () => { departures += 1; });
  await env.advance(2);
  assert.equal(departures, 1);
  assert.deepEqual(env.calls, [{ top: 1600, behavior: "smooth" }]);
  env.window.scrollY = 1600;
  env.document.dispatchEvent(new Event("scrollend"));
  await work;
});

test("returning scroll targets the future collapsed-page bottom in one pass", async (t) => {
  const env = browser(t);
  env.window.scrollY = 1200;
  const returningAnchor = { getBoundingClientRect: () => ({ top: -72, bottom: 0 }) };
  const work = scrollToElement(returningAnchor, "end", false, new AbortController().signal);
  await env.advance(2);
  assert.deepEqual(env.calls, [{ top: 400, behavior: "smooth" }]);
  env.window.scrollY = 400;
  env.document.dispatchEvent(new Event("scrollend"));
  await work;
  assert.equal(env.calls.length, 1);
});

function mascot() {
  const runs = [];
  const style = { removeProperty(property) { delete this[property.replace(/-([a-z])/g, (_, char) => char.toUpperCase())]; } };
  const element = {
    style,
    getBoundingClientRect: () => ({ left: 300, top: 728, height: 72 }),
    animate(keyframes, options) {
      let finish;
      let reject;
      const finished = new Promise((resolve, fail) => { finish = resolve; reject = fail; });
      const animation = { finished, cancel: () => reject(new DOMException("Cancelled", "AbortError")) };
      runs.push({ keyframes, options, finish, animation });
      return animation;
    }
  };
  return { element, runs };
}

test("mascot freezes before reservation, hides below viewport, then returns in its anchor", async (t) => {
  browser(t);
  const { element, runs } = mascot();
  const signal = new AbortController().signal;
  const exit = prepareMascotExit(element, false, signal);
  assert.equal(element.style.position, "fixed");
  assert.equal(element.style.top, "728px");
  assert.equal(runs.length, 0);
  const leaving = exit();
  assert.equal(runs[0].keyframes.at(-1).transform, "translateY(72px)");
  runs[0].finish();
  await leaving;
  assert.equal(element.style.opacity, "0");
  assert.equal(element.style.position, undefined);
  const entering = revealMascot(element, false, signal);
  assert.equal(runs[1].keyframes[0].transform, "translateY(100%)");
  runs[1].finish();
  await entering;
  assert.equal(element.style.opacity, undefined);
  assert.equal(element.style.position, undefined);
});

test("aborted mascot motion freezes its current point and reduced-motion reset is clean", async (t) => {
  browser(t);
  const { element, runs } = mascot();
  const controller = new AbortController();
  const leaving = prepareMascotExit(element, false, controller.signal)();
  controller.abort();
  await assert.rejects(leaving, { name: "AbortError" });
  assert.equal(element.style.top, "728px");
  const entering = revealMascot(element, true, new AbortController().signal);
  assert.equal(runs[1].options.duration, 0);
  runs[1].finish();
  await entering;
  resetMascot(element);
  assert.equal(element.style.position, undefined);
  assert.equal(element.style.transform, undefined);
});
