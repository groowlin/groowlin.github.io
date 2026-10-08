import test from "node:test";
import assert from "node:assert/strict";
import { clampPoint, initialPositions, measureGap, measurementExtensions, recordAttempt, recordPenalty } from "../../components/games/game-logic.ts";
import { createGamesSession, parseGamesSession } from "../../components/games/session.ts";

test("horizontal and vertical gaps use the greater orthogonal overlap", () => {
  assert.equal(measureGap({ x: 0, y: 0 }, { x: 136, y: 20 }, { x: 0, y: 1 }).gap, 16);
  const vertical = measureGap({ x: 20, y: 136 }, { x: 0, y: 0 }, { x: 1, y: 0 });
  assert.equal(vertical.axis, "vertical");
  assert.equal(vertical.gap, 16);
});

test("displaced dimensions get perpendicular witnesses to the nearest physical edges", () => {
  const a = { x: 0, y: 0 }, b = { x: 150, y: 200 };
  const horizontal = measureGap(a, b, { x: 1, y: 0 });
  assert.deepEqual(measurementExtensions(a, b, horizontal), [
    { start: { x: 120, y: 120 }, end: { x: 120, y: 160 } },
    { start: { x: 150, y: 200 }, end: { x: 150, y: 160 } },
  ]);
  const vertical = measureGap(a, b, { x: 0, y: 1 });
  assert.deepEqual(measurementExtensions(a, b, vertical), [
    { start: { x: 120, y: 120 }, end: { x: 135, y: 120 } },
    { start: { x: 150, y: 200 }, end: { x: 135, y: 200 } },
  ]);
  assert.deepEqual(measurementExtensions(a, { x: 140, y: 20 }, measureGap(a, { x: 140, y: 20 }, { x: 1, y: 0 })), []);
});
test("overlap has a signed negative gap and dimension endpoints are released faces", () => {
  const result = measureGap({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 1, y: 0 });
  assert.equal(result.gap, -20);
  assert.deepEqual(result.start, { x: 120, y: 60 });
  assert.deepEqual(result.end, { x: 100, y: 60 });
  assert.equal(measureGap({ x: 0, y: 0 }, { x: 120, y: 0 }, { x: 1, y: 0 }).gap, 0);
});
test("ties use the final movement including diagonally separated objects", () => {
  assert.equal(measureGap({ x: 0, y: 0 }, { x: 150, y: 160 }, { x: 1, y: 4 }).axis, "vertical");
  assert.equal(measureGap({ x: 0, y: 0 }, { x: 20, y: 20 }, { x: 4, y: 1 }).axis, "horizontal");
  assert.equal(measureGap({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }).gap, -120);
});
test("bounds clamp all sides; Figma composition resets with gap53 and y offset20", () => {
  assert.deepEqual(clampPoint({ x: -3, y: 800 }, { width: 300, height: 240 }), { x: 0, y: 120 });
  const [a, b] = initialPositions({ width: 744, height: 340 });
  assert.equal(a.x, 110);
  assert.equal(b.x, 283);
  assert.equal(b.y - a.y, 20);
  assert.equal(measureGap(a, b, { x: 1, y: 0 }).gap, 53);
});
test("exact16 completes immediately; fifth miss completes and preserves closest result", () => {
  const empty = createGamesSession().games["pixel-perfect"];
  const exact = recordAttempt(empty, 16);
  assert.equal(exact.completed, true);
  assert.deepEqual(recordAttempt(exact, 80), exact);
  const misses = [100, 18, 19, 20, 21].reduce(recordAttempt, empty);
  assert.deepEqual(misses.results, { bestGap: 18, deviation: 2 });
  assert.equal(misses.completed, true);
  assert.equal(misses.attempts.length, 5);
});
test("session validates version, derived results, completion and malformed input", () => {
  const state = createGamesSession();
  state.isOpen = true;
  state.games["pixel-perfect"] = recordAttempt(state.games["pixel-perfect"], 16);
  assert.deepEqual(parseGamesSession(JSON.stringify(state)), state);
  for (const invalid of [null, "{", "null", JSON.stringify({ ...state, version: 2 }), JSON.stringify({ ...state, currentGameId: "future" })]) {
    assert.equal(parseGamesSession(invalid), null);
  }
  state.games["pixel-perfect"].completed = false;
  assert.equal(parseGamesSession(JSON.stringify(state)), null);
});
test("bootstrap validator is self-contained after serialization", () => {
  const validate = Function(`return (${parseGamesSession.toString()})`)();
  assert.deepEqual(validate(JSON.stringify(createGamesSession())), createGamesSession());
});

test("session accepts five misses but exact hit must be last", () => {
  const state = createGamesSession();
  state.games["pixel-perfect"] = [40, 30, 20, 18, 17].reduce(recordAttempt, state.games["pixel-perfect"]);
  assert.deepEqual(parseGamesSession(JSON.stringify(state)), state);
  state.games["pixel-perfect"] = {
    attempts: [20, 16, 18],
    results: { bestGap: 16, deviation: 0 },
    completed: true
  };
  assert.equal(parseGamesSession(JSON.stringify(state)), null);
});


test("session rejects legacy unlimited runs and incomplete five-attempt runs", () => {
  const state = createGamesSession();
  state.games["pixel-perfect"] = {
    attempts: [40, 30, 20, 18], results: { bestGap: 18, deviation: 2 }, completed: true
  };
  assert.equal(parseGamesSession(JSON.stringify(state)), null);
  state.games["pixel-perfect"] = {
    attempts: [40, 30, 20, 21, 22], results: { bestGap: 20, deviation: 4 }, completed: false
  };
  assert.equal(parseGamesSession(JSON.stringify(state)), null);
});

test("five penalties complete without inventing a best result and survive bootstrap", () => {
  const state = createGamesSession();
  state.games["pixel-perfect"] = Array.from({length:5}).reduce(p => recordPenalty(p), state.games["pixel-perfect"]);
  assert.equal(state.games["pixel-perfect"].completed,true);
  assert.equal(state.games["pixel-perfect"].results,null);
  assert.deepEqual(state.games["pixel-perfect"].attempts,[null,null,null,null,null]);
  assert.deepEqual(parseGamesSession(JSON.stringify(state)),state);
});