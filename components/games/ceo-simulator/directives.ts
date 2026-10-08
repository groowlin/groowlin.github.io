import { METRIC_ZONE_CONFIG, ROLE_CONFIG, TASK_CONFIG, type CrisisConfiguration, type MetricId, type MetricZone, type TaskConfiguration, type TaskId, type ZoneId } from "./config";
import type { GameMetrics } from "./metrics";
import type { DepartmentZone } from "./zones";
export type DirectiveId = TaskId;
export type RequirementDirection = "increase" | "decrease";
export type RequirementProgress = { id: string; metric?: MetricId; zone?: MetricZone; acceptableZones?: MetricZone[]; direction: RequirementDirection; current: number; target: number; met: boolean; label: string };
export type DepartmentProgress = { zoneId: ZoneId; current: number; target: number; met: boolean };
export type CorporateDirective = TaskConfiguration & { completed: boolean };
export function createDirectives(): CorporateDirective[] { return TASK_CONFIG.map((d) => ({ ...d, staffRequirements: d.staffRequirements ? { ...d.staffRequirements } : undefined, metricRequirements: d.metricRequirements ? { ...d.metricRequirements } : undefined, effectiveAiZones: d.effectiveAiZones ? [...d.effectiveAiZones] : undefined, completed: false })); }
export type MetricThresholds = { speedNormal: number; speedHigh: number; qualityNormal: number; qualityHigh: number; budgetNormal: number; budgetHigh: number };
export const DEFAULT_METRIC_THRESHOLDS: MetricThresholds = { speedNormal: METRIC_ZONE_CONFIG.speed[1].min, speedHigh: METRIC_ZONE_CONFIG.speed[2].min, qualityNormal: METRIC_ZONE_CONFIG.quality[1].min, qualityHigh: METRIC_ZONE_CONFIG.quality[2].min, budgetNormal: METRIC_ZONE_CONFIG.budget[1].min, budgetHigh: METRIC_ZONE_CONFIG.budget[2].min };
export function zoneThreshold(metric: MetricId, zone: MetricZone, thresholds: MetricThresholds = DEFAULT_METRIC_THRESHOLDS) { if (zone === "low") return 0; return thresholds[`${metric}${zone === "normal" ? "Normal" : "High"}` as keyof MetricThresholds]; }
export function evaluateRequirements(directive: TaskConfiguration | CrisisConfiguration, metrics: GameMetrics, thresholds: MetricThresholds = DEFAULT_METRIC_THRESHOLDS): RequirementProgress[] {
  const result: RequirementProgress[] = [];
  for (const metric of ["speed", "quality", "budget"] as const) { const zone = directive.metricRequirements?.[metric]; if (!zone) continue; const target = zoneThreshold(metric, zone, thresholds), current = metrics[metric]; result.push({ id: metric, metric, zone, acceptableZones: zone === "normal" ? ["normal", "high"] : [zone], direction: "increase", target, current, met: current >= target, label: `${metric === "speed" ? "Скорость" : metric === "quality" ? "Качество" : "Бюджет"} → ${METRIC_ZONE_CONFIG[metric].find((item) => item.id === zone)!.label}` }); }
  if (directive.effectiveAiCount !== undefined) result.push({ id: "ai-count", direction: "increase", current: metrics.effectiveAI, target: directive.effectiveAiCount, met: metrics.effectiveAI >= directive.effectiveAiCount, label: `${directive.effectiveAiCount} AI → работают с людьми` });
  for (const zoneId of directive.effectiveAiZones ?? []) result.push({ id: `ai-${zoneId}`, direction: "increase", current: metrics.effectiveAiZones.includes(zoneId) ? 1 : 0, target: 1, met: metrics.effectiveAiZones.includes(zoneId), label: `AI → ${ROLE_CONFIG[zoneId].label}` });
  return result;
}
export function evaluateStaffRequirements(directive: TaskConfiguration | CrisisConfiguration, zones: DepartmentZone[]): DepartmentProgress[] { return zones.filter((zone) => (directive.staffRequirements?.[zone.id] ?? 0) > 0).map((zone) => { const current = zone.humans.length, target = directive.staffRequirements?.[zone.id] ?? 0; return { zoneId: zone.id, current, target, met: current >= target }; }); }
