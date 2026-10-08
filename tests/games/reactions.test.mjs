import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// Resolve the app's bundler-style TS imports in Node's native TypeScript test runner.
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("./") && context.parentURL?.includes("/games/reactions/") && !specifier.endsWith(".ts")) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });
const { createReactionState, hydrateReactionState, parseReactionState, reactToEvent } = await import("../../components/games/reactions/engine.ts");
const { pixelPerfectReactionConfig: config } = await import("../../components/games/reactions/pixel-perfect.ts");

const attempt = (state, gap, options = config, random = () => 0) => reactToEvent(state, { type: "attempt", gap }, options, random);
const run = (gaps, options = config, mode = "campaign") => gaps.reduce((result, gap) => attempt(result.state, gap, options), { state: createReactionState(options.gameId, mode), reply: null });
const endless = { ...config, endless: { ...config.endless, enabled: true } };

test("first attempt uses exact approved ranges; uniform pair variants remain indivisible", () => {
  for (const [gap, expected] of [[16, "perfect-first-surprise"], [17, "near-defend"], [18, "near-defend"], [19, "close-eye"], [21, "close-eye"], [22, "miss-layout"], [25, "miss-layout"], [26, "strong-bold"], [31, "strong-bold"], [32, "strong-author"], [120, "strong-author"], [-10, "strong-author"]]) {
    assert.equal(run([gap]).reply.id, expected, `gap ${gap}`);
  }
  const alternate = attempt(createReactionState(), 16, config, () => 0.5).reply;
  assert.deepEqual(alternate, { id: "perfect-first-devtools", title: "Подозрительно", body: "Ты точно без DevTools?" });
});

test("state tracks previous, best, valid attempts and immutable history", () => {
  const empty = createReactionState();
  const first = attempt(empty, 30).state;
  const second = attempt(first, 18).state;
  assert.equal(empty.attempt, 0);
  assert.equal(first.history.length, 1);
  assert.deepEqual(second.history, [{ gap: 30, error: 14 }, { gap: 18, error: 2 }]);
  assert.equal(second.currentGap, 18);
  assert.equal(second.currentError, 2);
  assert.equal(second.previousGap, 30);
  assert.equal(second.previousError, 14);
  assert.equal(second.bestError, 2);
  assert.equal(second.attempt, 2);
});

test("second attempt compares errors and special rollback uses confirmed threshold", () => {
  for (const [gaps, expected] of [
    [[30, 20], "improved-progress"], [[20, 12], "unchanged"], [[20, 30], "worse-review"],
    [[18, 20], "worse-review"], [[18, 21], "worse-review"], [[18, 22], "special-rollback"],
    [[17, 23], "special-rollback"], [[19, 23], "worse-review"], [[30, 16], "perfect-second"],
  ]) assert.equal(run(gaps).reply.id, expected, gaps.join(" → "));
});

test("final attempt uses approved final buckets without suggesting retries", () => {
  for (const [gap, expected] of [[16, "perfect-final"], [17, "final-optical"], [18, "final-optical"], [19, "final-count"], [21, "final-count"], [22, "final-retro"], [25, "final-retro"], [26, "final-work"], [31, "final-work"], [32, "final-approved"], [120, "final-approved"]]) {
    const result = run([40, 30, 28, 26, gap]);
    assert.equal(result.reply.id, expected, `gap ${gap}`);
    assert.equal(attempt(result.state, 16).reply, null);
  }
});

test("zero takes priority on every attempt and is a valid attempt", () => {
  const result = run([0, 0, 0]);
  assert.equal(result.state.attempt, 3);
  assert.equal(result.reply.id, "zero-spacing");
  assert.equal(result.state.bestError, 16);
  assert.equal(run([18, 0]).reply.id, "zero-spacing");
});

test("outside and overlap spend attempts with common escalating copy and no fake gap", () => {
  let state = attempt(createReactionState(), 18).state;
  const ids = [];
  for (const type of ["out-of-bounds", "overlap", "out-of-bounds", "overlap"]) {
    const result = reactToEvent(state, {type}, config, () => 0);
    assert.equal(result.state.attempt, state.attempt + 1);
    assert.equal(result.state.currentGap, 18);
    assert.deepEqual(result.state.history.at(-1), {gap:null,error:null});
    ids.push(result.reply.id);
    state = result.state;
  }
  assert.deepEqual(ids, ["outside-qa","outside-feature","outside-bug","outside-feature"]);
  assert.equal(state.attempt,5);
  assert.equal(state.violationCount,4);
  assert.equal(state.outOfBoundsCount,2);
  assert.equal(reactToEvent(state,{type:"overlap"},config).reply,null);
  assert.deepEqual(parseReactionState(JSON.stringify(state), config), state);
});
test("perfect ends campaign early and disabled endless cannot select or count", () => {
  const perfect = run([16]);
  assert.equal(attempt(perfect.state, 20).state, perfect.state);
  const inactive = createReactionState("pixel-perfect", "endless");
  assert.deepEqual(attempt(inactive, 20), { state: inactive, reply: null });
});

test("future endless patterns are once-per-session and precede milestones", () => {
  assert.equal(run([40, 30, 20], endless, "endless").reply.id, "endless-improving");
  assert.equal(run([20, 20, 20], endless, "endless").reply.id, "endless-repeat");
  const repeated = run([20, 20, 20, 20], endless, "endless");
  assert.deepEqual(repeated.state.seenSpecials, ["repeated-gap"]);
  assert.notEqual(repeated.reply.id, "endless-repeat");
  assert.equal(run([14, 18, 15, 17], endless, "endless").reply.id, "endless-oscillating");
  assert.equal(run([17, 22], endless, "endless").reply.id, "special-rollback");
});

test("future milestones fire once; perfect and zero have priority and defer milestone", () => {
  const noPatterns = { ...endless, endless: { ...endless.endless, specials: [] } };
  let state = createReactionState("pixel-perfect", "endless");
  const milestones = [];
  let previousReply = null;
  for (let count = 1; count <= 35; count++) {
    const result = attempt(state, count % 2 ? 20 : 21, noPatterns);
    assert.notEqual(result.reply.id, previousReply);
    if (result.reply.id.startsWith("milestone")) milestones.push([count, result.reply.id]);
    previousReply = result.reply.id;
    state = result.state;
  }
  assert.deepEqual(milestones, [[5, "milestone-5"], [10, "milestone-10"], [20, "milestone-20"], [30, "milestone-30"]]);
  const before = run([20, 21, 20, 21], noPatterns, "endless").state;
  const perfect = attempt(before, 16, noPatterns);
  assert.equal(perfect.reply.id, "perfect-second");
  assert.equal(perfect.state.seenMilestones.length, 0);
  assert.equal(attempt(perfect.state, 20, noPatterns).reply.id, "milestone-5");
  assert.equal(attempt(before, 0, noPatterns).reply.id, "zero-spacing");
});

test("engine uses configured limit/game target and rejects nonfinite results", () => {
  const custom = { ...config, gameId: "other-game", targetGap: 10, campaign: { ...config.campaign, maxAttempts: 4 } };
  const result = run([30, 25, 20], custom);
  assert.equal(result.state.attempt, 3);
  assert.ok(attempt(result.state, 12, custom).reply);
  assert.equal(attempt(run([10], custom).state, 12, custom).reply, null);
  for (const gap of [NaN, Infinity, -Infinity]) assert.equal(attempt(createReactionState(), gap).state.attempt, 0);
});

test("hydration restores analytics without consuming copy and persistence validates derived fields", () => {
  const hydrated = hydrateReactionState([30, 18]);
  assert.equal(hydrated.attempt, 2);
  assert.equal(hydrated.previousGap, 30);
  assert.equal(hydrated.currentError, 2);
  assert.equal(hydrated.bestError, 2);
  assert.equal(hydrated.lastReplyId, null);
  assert.deepEqual(hydrated.seenSpecials, []);
  const state = reactToEvent(run([18, 22]).state, { type: "out-of-bounds" }, config).state;
  assert.deepEqual(parseReactionState(JSON.stringify(state), config), state);
  for (const patch of [{ attempt: 9 }, { bestError: 6 }, { currentGap: 17 }, { outOfBoundsCount: -1 }, { seenSpecials: ["invented"] }, { seenMilestones: ["attempt-5"] }, { lastReplyId: "invented" }, { mode: "endless" }]) {
    assert.equal(parseReactionState(JSON.stringify({ ...state, ...patch }), config), null);
  }
  assert.equal(parseReactionState("{", config), null);
  assert.equal(parseReactionState(null, config), null);
});
