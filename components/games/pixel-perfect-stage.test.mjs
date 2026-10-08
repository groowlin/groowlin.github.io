import test from "node:test";
import assert from "node:assert/strict";
import { resetPixelPerfect, stageAfterAttempt, stageForProgress } from "./pixel-perfect-stage.ts";
import { centeredInitialPositions } from "./game-logic.ts";

test("progress restores to the only valid stable screen", () => {
  assert.equal(stageForProgress({ attempts: [], results: null, completed: false }), "intro");
  assert.equal(stageForProgress({ attempts: [20], results: { bestGap: 20, deviation: 4 }, completed: false }), "play");
  assert.equal(stageForProgress({ attempts: [20, 18, 16], results: { bestGap: 16, deviation: 0 }, completed: true }), "final-result");
});

test("a miss remains in play and exact 16 goes to final result", () => {
  assert.equal(stageAfterAttempt({ attempts: [20], results: { bestGap: 20, deviation: 4 }, completed: false }), "play");
  assert.equal(stageAfterAttempt({ attempts: [20, 18, 16], results: { bestGap: 16, deviation: 0 }, completed: true }), "final-result");
});

test("system reset clears all results and returns to intro", () => {
  assert.deepEqual(resetPixelPerfect("intro"), {
    stage: "intro",
    progress: { attempts: [], results: null, completed: false }
  });
});

test("restarting from the result screen clears results and enters play", () => {
  assert.deepEqual(resetPixelPerfect("play"), {
    stage: "play",
    progress: { attempts: [], results: null, completed: false }
  });
});

test("full-card playfield provides stable target and draggable starting positions", () => {
  assert.deepEqual(centeredInitialPositions({ width: 740, height: 538 }), [
    { x: 224, y: 199 },
    { x: 397, y: 219 }
  ]);
});


test("five misses restore the best-result screen", () => {
  const progress = { attempts: [40, 18, 25], results: { bestGap: 18, deviation: 2 }, completed: true };
  assert.equal(stageForProgress(progress), "final-result");
  assert.equal(stageAfterAttempt(progress), "final-result");
});
