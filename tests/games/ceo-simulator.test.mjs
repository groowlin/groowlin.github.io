import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const temporaryRoot = resolve(tmpdir()), compiled = mkdtempSync(join(temporaryRoot, "ceo-simulator-tests-"));
test.after(() => { const target = resolve(compiled); if (!target.startsWith(temporaryRoot + sep) || !target.includes("ceo-simulator-tests-")) throw new Error("Unsafe cleanup"); rmSync(target, { recursive: true, force: true }); });
execFileSync(process.execPath, [join(root, "node_modules/typescript/bin/tsc"), join(root, "components/games/ceo-simulator/game-state.ts"), "--outDir", compiled, "--target", "ES2022", "--module", "commonjs", "--moduleResolution", "node", "--skipLibCheck", "--strict", "--esModuleInterop", "--noEmitOnError"], { cwd: root, stdio: "pipe" });
const require = createRequire(import.meta.url);
const { CeoGame } = require(join(compiled, "ceo-simulator/game-state.js"));
const { GAME_CONFIG, TASK_CONFIG, CRISIS_CONFIG, TRANSITION_CONFIG, WORKER_CONFIG, ZONE_CONFIG } = require(join(compiled, "ceo-simulator/config.js"));
const { createCeoRuntimeTuning, normalizeCeoRuntimeTuning } = require(join(compiled, "ceo-simulator/runtime-tuning.js"));
const { calculateMetrics } = require(join(compiled, "ceo-simulator/metrics.js"));
const { evaluateRequirements, evaluateStaffRequirements } = require(join(compiled, "ceo-simulator/directives.js"));
const { emptyPushCycle } = require(join(compiled, "ceo-simulator/entities.js"));
const { areaCenter, workAreaFor } = require(join(compiled, "ceo-simulator/zones.js"));

const bounds = { width: 672, height: 480, radius: 40 }, layout = { inset: 16, gap: 8, headerBottom: 100, labelHeight: 14 };
const makeGame = () => { const tuning = createCeoRuntimeTuning(); tuning.ai.firstPushMin = 999; tuning.ai.firstPushMax = 999; tuning.ai.pushInterval = 999; return new CeoGame(bounds, layout, () => tuning); };
function metricEntity(zoneId, type = "human", index = 0, state = "IDLE") { return { id: `${type}-${index}`, type, role: type === "human" ? zoneId : undefined, assignedZoneId: zoneId, returningToMarket: false, controller: { state } }; }
function roster(humans = [], ai = []) { return [...humans.map((zone, i) => metricEntity(zone, "human", i)), ...ai.map((zone, i) => metricEntity(zone, "ai", i))]; }
function put(game, entity, zoneId) { const zone = game.zones.find((candidate) => candidate.id === zoneId); entity.controller.state = "IDLE"; entity.controller.height = 0; entity.controller.grabbedPointerId = null; entity.controller.configurePlane(game.plane, game.freeArea, zone ? areaCenter(workAreaFor(zone)) : areaCenter(game.freeArea)); entity.assignedZoneId = zone?.id ?? null; entity.returningToMarket = false; entity.controller.setWorkArea(zone ? workAreaFor(zone) : null); if (entity.type === "human") entity.role = zone?.id ?? null; else entity.pushCycle = emptyPushCycle(); }
const taskHumans = [["ANALYTICS", "DESIGN", "DEVELOPMENT"], ["ANALYTICS", "DESIGN", "DEVELOPMENT", "QA"], ["ANALYTICS", "DEVELOPMENT", "DEVELOPMENT", "DEVELOPMENT"], ["DESIGN", "DEVELOPMENT", "QA"], ["DESIGN", "DESIGN", "DEVELOPMENT", "QA"], ["DESIGN", "DEVELOPMENT", "QA"]];
const taskAI = [[], [], [], ["DEVELOPMENT", "QA"], ["QA", null], ["DESIGN", "DEVELOPMENT"]];
function setupCurrent(game) { game.entities.filter((e) => e.type === "human").forEach((e, i) => put(game, e, taskHumans[game.activeDirectiveIndex][i] ?? null)); game.entities.filter((e) => e.type === "ai").forEach((e, i) => put(game, e, taskAI[game.activeDirectiveIndex][i] ?? null)); game.updatePhysics(0.0001, 0, true); }
function reachTask(game, index) { while (game.activeDirectiveIndex < index) { setupCurrent(game); game.advance(TRANSITION_CONFIG.normalHold + 0.01); assert.equal(game.presentationState, "TASK_SUCCESS", `task ${game.activeDirectiveIndex + 1}`); game.advance(TRANSITION_CONFIG.success + 0.01); assert.equal(game.presentationState, "PLAYING"); } }
function reachCrisis(game) { reachTask(game, 5); setupCurrent(game); game.advance(TRANSITION_CONFIG.normalHold + 0.01); game.advance(TRANSITION_CONFIG.success + 0.01); assert.equal(game.phase, "FINAL_PHASE"); assert.equal(game.presentationState, "PLAYING"); }

test("1. six humans start on the labor market", () => { const game = makeGame(); assert.equal(game.entities.length, 6); assert.ok(game.entities.every((e) => e.type === "human" && e.assignedZoneId === null && e.role === null)); });
test("2. AI is absent before task four", () => { const game = makeGame(); reachTask(game, 2); assert.equal(game.entities.filter((e) => e.type === "ai").length, 0); });
test("3. task four spawns exactly two AI together", () => { const game = makeGame(); reachTask(game, 3); assert.equal(game.entities.filter((e) => e.type === "ai").length, 2); });
test("4. robot factory and repeated activation cannot exceed two", () => { const game = makeGame(); reachTask(game, 3); game.advance(10); assert.equal(game.entities.filter((e) => e.type === "ai").length, 2); assert.equal(GAME_CONFIG.robotCount, 2); });
test("5. AI without a coworker adds zero speed", () => { const base = calculateMetrics(roster(["DEVELOPMENT"])); assert.equal(calculateMetrics(roster(["DEVELOPMENT"], ["QA"])).speed, base.speed); });
test("6. AI with one coworker adds twenty speed", () => { const base = calculateMetrics(roster(["DEVELOPMENT", "QA"])); const boosted = calculateMetrics(roster(["DEVELOPMENT", "QA"], ["QA"])); assert.equal(boosted.baseSpeed - base.baseSpeed, 20); });
test("7. AI with two coworkers adds forty speed", () => { const base = calculateMetrics(roster(["DEVELOPMENT", "QA", "QA"])); const boosted = calculateMetrics(roster(["DEVELOPMENT", "QA", "QA"], ["QA"])); assert.equal(boosted.baseSpeed - base.baseSpeed, 40); });
test("8. AI never adds quality", () => { const people = ["ANALYTICS", "DESIGN", "DEVELOPMENT", "QA"]; assert.equal(calculateMetrics(roster(people, ["DESIGN"])).quality, calculateMetrics(roster(people)).quality); });
test("9. a second AI in one department adds no gameplay bonus", () => { const people = ["ANALYTICS", "DESIGN", "DEVELOPMENT", "QA"]; assert.equal(calculateMetrics(roster(people, ["QA", "QA"])).speed, calculateMetrics(roster(people, ["QA"])).speed); });
test("10. AI boost is identical in all departments", () => { for (const zone of ZONE_CONFIG) { const people = ["ANALYTICS", "DESIGN", "DEVELOPMENT", "QA"]; const base = calculateMetrics(roster(people)); assert.equal(calculateMetrics(roster(people, [zone.id])).baseSpeed - base.baseSpeed, 20); } });
test("11. no human developer forces speed to zero", () => { assert.equal(calculateMetrics(roster(["ANALYTICS", "DESIGN", "QA"], ["DEVELOPMENT"])).speed, 0); });
test("12. missing department penalties replace hard caps", () => { const all = calculateMetrics(roster(["ANALYTICS", "DESIGN", "DEVELOPMENT", "QA"])); const noA = calculateMetrics(roster(["DESIGN", "DEVELOPMENT", "QA"])); assert.equal(noA.speed, 33); assert.equal(noA.quality, 45); assert.equal(calculateMetrics(roster(["ANALYTICS", "DEVELOPMENT", "QA"])).quality, 20); assert.equal(calculateMetrics(roster(["ANALYTICS", "DESIGN", "DEVELOPMENT"])).quality, 20); assert.equal(all.speed, 53); assert.equal(all.quality, 65); });
test("13. budget uses thirteen per human and two per effective AI", () => { assert.equal(calculateMetrics(roster(["ANALYTICS", "DEVELOPMENT"], ["ANALYTICS", "DEVELOPMENT"])).budget, 100 - 2 * WORKER_CONFIG.humanCost - 2 * WORKER_CONFIG.aiCost); });
test("14. a normal task requires a continuous one-second hold", () => { const game = makeGame(); setupCurrent(game); game.advance(0.99); assert.equal(game.presentationState, "PLAYING"); game.advance(0.02); assert.equal(game.presentationState, "TASK_SUCCESS"); });
test("15. losing a condition resets normal hold", () => { const game = makeGame(); setupCurrent(game); game.advance(0.6); put(game, game.entities[2], null); game.advance(0.1); put(game, game.entities[2], "DEVELOPMENT"); game.advance(0.5); assert.equal(game.presentationState, "PLAYING"); });
test("16. task transitions have no card states and cannot multi-advance in one tick", () => { const game = makeGame(); setupCurrent(game); game.advance(10); assert.equal(game.presentationState, "TASK_SUCCESS"); assert.equal(game.activeDirectiveIndex, 0); assert.equal(game.completedDirectiveIds.length, 1); });
test("17. crisis timer starts in the playable HUD state", () => { const game = makeGame(); reachCrisis(game); game.advance(0.1); assert.ok(game.finalPhase.timer >= 0.09); });
test("18. a crisis fails after five seconds", () => { const game = makeGame(); reachCrisis(game); game.entities.forEach((e) => put(game, e, null)); game.advance(TRANSITION_CONFIG.crisisTimer + 0.01); assert.equal(game.presentationState, "CRISIS_RESULT"); assert.equal(game.lastCrisisResult, false); });
test("19. a crisis succeeds after a continuous 0.7-second hold", () => { const game = makeGame(); reachCrisis(game); game.entities.filter((e) => e.type === "human").forEach((e, i) => put(game, e, i === 0 ? "ANALYTICS" : i === 1 ? "DEVELOPMENT" : null)); game.entities.filter((e) => e.type === "ai").forEach((e, i) => put(game, e, i === 0 ? "ANALYTICS" : "DEVELOPMENT")); game.advance(0.64); assert.equal(game.presentationState, "PLAYING"); game.advance(0.08); assert.equal(game.lastCrisisResult, true); });
test("20. failure still advances to the next crisis", () => { const game = makeGame(); reachCrisis(game); game.entities.forEach((e) => put(game, e, null)); game.advance(5.01); game.advance(TRANSITION_CONFIG.crisisResult + 0.01); assert.equal(game.finalPhase.phaseIndex, 1); assert.equal(game.presentationState, "PLAYING"); });
test("21. final verdict depends only on crisis successes", () => { for (const [successes, verdict] of [[3, "Компания растёт"], [2, "Бизнес удержался"], [1, "Компания обанкротилась"], [0, "Компания обанкротилась"]]) { const game = makeGame(); game.finalPhase.successes = successes; game.finish(); assert.equal(game.report.verdict, verdict); } });

test("ineffective and duplicate AI are free", () => { const people = ["ANALYTICS", "DEVELOPMENT"]; const none = calculateMetrics(roster(people)); assert.equal(calculateMetrics(roster(people, ["QA"])).budget, none.budget); assert.equal(calculateMetrics(roster(people, ["ANALYTICS", "ANALYTICS"])).budget, none.budget - WORKER_CONFIG.aiCost); });
test("runtime thresholds are normalized and used by evaluator", () => { const tuning = normalizeCeoRuntimeTuning({ ...createCeoRuntimeTuning(), thresholds: { speedNormal: 60, speedHigh: 50, qualityNormal: 40, qualityHigh: 80, budgetNormal: 55, budgetHigh: 75 } }); assert.equal(tuning.thresholds.speedHigh, 61); const metrics = calculateMetrics(roster(["ANALYTICS", "DESIGN", "DEVELOPMENT", "QA"])); assert.equal(evaluateRequirements(TASK_CONFIG[1], metrics, tuning.thresholds).find((item) => item.metric === "speed").met, false); });
test("context popup provides scenario, hides on interaction, and provides result feedback", () => { const game = makeGame(); assert.equal(game.contextualPopup.text, "Соберите базовую команду"); const human = game.entities[0]; assert.equal(game.grab(human.slot, 7, human.controller.head, 0), true); assert.equal(game.contextualPopup, null); game.release(human.slot, 7, 0, true); setupCurrent(game); game.advance(TRANSITION_CONFIG.normalHold + 0.01); assert.equal(game.contextualPopup.text, "✓ Выполнено"); assert.equal(game.contextualPopup.bubble, "normal"); });

test("all six tasks and three crises have reachable configurations within six humans and two AI", () => {
  const zones = [null, ...ZONE_CONFIG.map((z) => z.id)];
  const all = [...TASK_CONFIG, ...CRISIS_CONFIG];
  for (const directive of all) {
    let reachable = false;
    for (let code = 0; code < 15625 && !reachable; code++) {
      let cursor = code; const humans = [];
      for (let i = 0; i < 6; i++) { const zone = zones[cursor % 5]; cursor = Math.floor(cursor / 5); if (zone) humans.push(zone); }
      for (let aiCode = 0; aiCode < 25 && !reachable; aiCode++) { let aiCursor = aiCode; const ai = []; for (let i = 0; i < 2; i++) { const zone = zones[aiCursor % 5]; aiCursor = Math.floor(aiCursor / 5); if (zone) ai.push(zone); } const metrics = calculateMetrics(roster(humans, ai)); const fakeZones = ZONE_CONFIG.map((z) => ({ id: z.id, humans: humans.filter((h) => h === z.id) })); reachable = evaluateRequirements(directive, metrics).every((r) => r.met) && evaluateStaffRequirements(directive, fakeZones).every((r) => r.met); }
    }
    assert.equal(reachable, true, `${directive.id} is unreachable`);
  }
});
