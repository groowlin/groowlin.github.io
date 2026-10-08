import { DEPENDENCY_CONFIG, GAME_CONFIG, WORKER_CONFIG, ZONE_CONFIG, type ZoneId } from "./config";
import { isEntityActive, type GameEntity } from "./entities";
export type GameMetrics = { speed: number; quality: number; budget: number; rawExpenses: number; activeHumans: number; activeAI: number; effectiveAI: number; effectiveAiZones: ZoneId[]; baseSpeed: number; baseQuality: number; blockedBy: ZoneId[] };
type Balance = { humanCost: number; aiCost: number; aiSpeedOneHuman: number; aiSpeedTwoHumans: number };
export function calculateMetrics(entities: GameEntity[], balance: Balance = WORKER_CONFIG): GameMetrics {
  const active = entities.filter(isEntityActive), humans = active.filter((entity) => entity.type === "human"), robots = active.filter((entity) => entity.type === "ai");
  let baseSpeed = 0, baseQuality = 0;
  const humanCounts = new Map<ZoneId, number>();
  for (const human of humans) { const zone = ZONE_CONFIG.find((candidate) => candidate.id === human.assignedZoneId); if (!zone) continue; baseSpeed += zone.speedContribution; baseQuality += zone.qualityContribution; humanCounts.set(zone.id, (humanCounts.get(zone.id) ?? 0) + 1); }
  const effectiveAiZones: ZoneId[] = [];
  for (const robot of robots) { const zoneId = robot.assignedZoneId; if (!zoneId || effectiveAiZones.includes(zoneId)) continue; const coworkers = humanCounts.get(zoneId) ?? 0; if (!coworkers) continue; effectiveAiZones.push(zoneId); baseSpeed += coworkers >= 2 ? balance.aiSpeedTwoHumans : balance.aiSpeedOneHuman; }
  let speed = baseSpeed, quality = baseQuality; const blockedBy: ZoneId[] = [];
  if (!humanCounts.has("DEVELOPMENT")) { speed = DEPENDENCY_CONFIG.noDevelopmentSpeed; blockedBy.push("DEVELOPMENT"); }
  if (!humanCounts.has("ANALYTICS")) { speed -= DEPENDENCY_CONFIG.noAnalyticsSpeedPenalty; quality -= DEPENDENCY_CONFIG.noAnalyticsQualityPenalty; blockedBy.push("ANALYTICS"); }
  if (!humanCounts.has("DESIGN")) { quality -= DEPENDENCY_CONFIG.noDesignQualityPenalty; blockedBy.push("DESIGN"); }
  if (!humanCounts.has("QA")) { quality -= DEPENDENCY_CONFIG.noQaQualityPenalty; blockedBy.push("QA"); }
  const clamp = (value: number) => Math.max(GAME_CONFIG.metrics.min, Math.min(GAME_CONFIG.metrics.max, value));
  const rawExpenses = humans.length * balance.humanCost + effectiveAiZones.length * balance.aiCost;
  return { speed: clamp(speed), quality: clamp(quality), budget: clamp(GAME_CONFIG.metrics.initialBudget - rawExpenses), rawExpenses, activeHumans: humans.length, activeAI: robots.length, effectiveAI: effectiveAiZones.length, effectiveAiZones, baseSpeed, baseQuality, blockedBy };
}
export function calculateIncome({ speed, quality, budget }: Pick<GameMetrics, "speed" | "quality" | "budget">): number { const weights = GAME_CONFIG.report; return Math.round(speed * weights.speedMultiplier + quality * weights.qualityMultiplier + budget * weights.budgetMultiplier); }
