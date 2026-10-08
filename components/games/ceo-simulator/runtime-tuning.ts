import { AI_CONFIG, GAME_CONFIG, LANDING_EFFECT_CONFIG, METRIC_ZONE_CONFIG, TRAIL_CONFIG, TRANSITION_CONFIG, WORKER_CONFIG } from "./config";

export type CeoRuntimeTuning = {
  game: {
    grabLiftThreshold: number;
    throwHorizontalVelocityTransfer: number; throwVerticalVelocityTransfer: number; throwDepthMultiplier: number;
    grabDepthShareMin: number; grabDepthShareMax: number; maxThrowVelocity: number; gravity: number; pointerSampleWindowMs: number;
  };
  shadow: { growth: number; maxHeightRatio: number; opacity: number };
  ai: { -readonly [K in keyof typeof AI_CONFIG]: number };
  trail: { -readonly [K in keyof typeof TRAIL_CONFIG]: number };
  landing: { -readonly [K in keyof typeof LANDING_EFFECT_CONFIG]: number };
  balance: { humanCost: number; aiCost: number; aiSpeedOneHuman: number; aiSpeedTwoHumans: number };
  thresholds: { speedNormal: number; speedHigh: number; qualityNormal: number; qualityHigh: number; budgetNormal: number; budgetHigh: number };
  transition: { -readonly [K in keyof typeof TRANSITION_CONFIG]: number };
};

export type NumberField = { key: string; label: string; min: number; max: number; step: number };

export const GAME_TUNING_FIELDS: readonly NumberField[] = [
  { key: "grabLiftThreshold", label: "Порог подъёма", min: 1, max: 500, step: 1 },
  { key: "throwHorizontalVelocityTransfer", label: "Бросок X", min: 0, max: 3, step: 0.01 },
  { key: "throwVerticalVelocityTransfer", label: "Бросок Y", min: 0, max: 3, step: 0.01 },
  { key: "throwDepthMultiplier", label: "Глубина броска", min: -2, max: 2, step: 0.01 },
  { key: "grabDepthShareMin", label: "Глубина min", min: 0, max: 1, step: 0.01 },
  { key: "grabDepthShareMax", label: "Глубина max", min: 0, max: 1, step: 0.01 },
  { key: "maxThrowVelocity", label: "Макс. скорость", min: 1, max: 5000, step: 10 },
  { key: "gravity", label: "Гравитация", min: 1, max: 5000, step: 10 },
  { key: "pointerSampleWindowMs", label: "Окно курсора, мс", min: 1, max: 1000, step: 1 },
];
export const BALANCE_TUNING_FIELDS: readonly NumberField[] = [
  { key: "humanCost", label: "Стоимость человека", min: 0, max: 100, step: 1 }, { key: "aiCost", label: "Стоимость AI", min: 0, max: 100, step: 1 },
  { key: "aiSpeedOneHuman", label: "AI + 1 человек", min: 0, max: 100, step: 1 }, { key: "aiSpeedTwoHumans", label: "AI + 2+ человека", min: 0, max: 100, step: 1 },
];
export const THRESHOLD_TUNING_FIELDS: readonly NumberField[] = [
  { key: "speedNormal", label: "Speed: нормально", min: 1, max: 99, step: 1 }, { key: "speedHigh", label: "Speed: высоко", min: 1, max: 100, step: 1 },
  { key: "qualityNormal", label: "Quality: нормально", min: 1, max: 99, step: 1 }, { key: "qualityHigh", label: "Quality: высоко", min: 1, max: 100, step: 1 },
  { key: "budgetNormal", label: "Budget: нормально", min: 1, max: 99, step: 1 }, { key: "budgetHigh", label: "Budget: высоко", min: 1, max: 100, step: 1 },
];
export const TRANSITION_TUNING_FIELDS: readonly NumberField[] = Object.entries(TRANSITION_CONFIG).map(([key, value]) => ({ key, label: key, min: 0.01, max: 10, step: 0.05, value }));
export const SHADOW_TUNING_FIELDS: readonly NumberField[] = [
  { key: "growth", label: "Рост тени", min: 0, max: 5, step: 0.05 },
  { key: "maxHeightRatio", label: "Макс. высота тени", min: 0, max: 10, step: 0.1 },
  { key: "opacity", label: "Прозрачность тени", min: 0, max: 1, step: 0.01 },
];
export const AI_TUNING_FIELDS: readonly NumberField[] = [
  { key: "pushInterval", label: "Интервал", min: 0.01, max: 60, step: 0.1 }, { key: "firstPushMin", label: "Первый толчок min", min: 0, max: 60, step: 0.1 },
  { key: "firstPushMax", label: "Первый толчок max", min: 0, max: 60, step: 0.1 }, { key: "kickWindupDuration", label: "Замах", min: 0.01, max: 10, step: 0.01 },
  { key: "kickStrikeDuration", label: "Удар", min: 0.01, max: 10, step: 0.01 }, { key: "kickRecoveryDuration", label: "Восстановление", min: 0.01, max: 10, step: 0.01 },
  { key: "pushStrengthToMarket", label: "Сила к рынку", min: 0, max: 3, step: 0.05 }, { key: "verticalImpulse", label: "Импульс Y", min: 0, max: 3000, step: 10 },
  { key: "flightPlanarSpeed", label: "Скорость полёта", min: 1, max: 3000, step: 10 }, { key: "minimumFlightDuration", label: "Мин. полёт", min: 0.01, max: 10, step: 0.05 },
  { key: "bodyWindupAngle", label: "Угол корпуса: замах", min: 0, max: 3.14, step: 0.01 }, { key: "bodyStrikeAngle", label: "Угол корпуса: удар", min: 0, max: 3.14, step: 0.01 },
  { key: "legWindupAngle", label: "Угол ноги: замах", min: 0, max: 3.14, step: 0.01 }, { key: "legStrikeAngle", label: "Угол ноги: удар", min: 0, max: 3.14, step: 0.01 },
];
export const TRAIL_TUNING_FIELDS: readonly NumberField[] = [
  { key: "pointHistory", label: "Точек", min: 2, max: 100, step: 1 }, { key: "historyDuration", label: "История, с", min: 0.01, max: 10, step: 0.01 },
  { key: "fadeDuration", label: "Затухание, с", min: 0.01, max: 10, step: 0.01 }, { key: "minVelocity", label: "Мин. скорость", min: 0, max: 5000, step: 10 },
  { key: "minDropHeight", label: "Мин. высота", min: 0, max: 1000, step: 1 }, { key: "opacity", label: "Прозрачность", min: 0, max: 1, step: 0.01 },
  { key: "strokeWidth", label: "Толщина", min: 0.1, max: 20, step: 0.1 },
];
export const LANDING_TUNING_FIELDS: readonly NumberField[] = [
  { key: "lineLength", label: "Длина линии", min: 0, max: 100, step: 1 }, { key: "centerGap", label: "Gap от центра", min: 0, max: 200, step: 1 },
  { key: "duration", label: "Длительность, с", min: 0.01, max: 10, step: 0.01 },
  { key: "opacity", label: "Прозрачность", min: 0, max: 1, step: 0.01 }, { key: "strokeWidth", label: "Толщина", min: 0.1, max: 20, step: 0.1 },
];

export function createCeoRuntimeTuning(): CeoRuntimeTuning {
  return {
    game: { grabLiftThreshold: GAME_CONFIG.grabLiftThreshold, throwHorizontalVelocityTransfer: GAME_CONFIG.throwHorizontalVelocityTransfer, throwVerticalVelocityTransfer: GAME_CONFIG.throwVerticalVelocityTransfer, throwDepthMultiplier: GAME_CONFIG.throwDepthMultiplier, grabDepthShareMin: GAME_CONFIG.grabDepthShareMin, grabDepthShareMax: GAME_CONFIG.grabDepthShareMax, maxThrowVelocity: GAME_CONFIG.maxThrowVelocity, gravity: GAME_CONFIG.gravity, pointerSampleWindowMs: GAME_CONFIG.pointerSampleWindowMs },
    shadow: { ...GAME_CONFIG.shadow }, ai: { ...AI_CONFIG }, trail: { ...TRAIL_CONFIG }, landing: { ...LANDING_EFFECT_CONFIG },
    balance: { ...WORKER_CONFIG }, thresholds: { speedNormal: METRIC_ZONE_CONFIG.speed[1].min, speedHigh: METRIC_ZONE_CONFIG.speed[2].min, qualityNormal: METRIC_ZONE_CONFIG.quality[1].min, qualityHigh: METRIC_ZONE_CONFIG.quality[2].min, budgetNormal: METRIC_ZONE_CONFIG.budget[1].min, budgetHigh: METRIC_ZONE_CONFIG.budget[2].min }, transition: { ...TRANSITION_CONFIG },
  };
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export function normalizeCeoRuntimeTuning(value: CeoRuntimeTuning): CeoRuntimeTuning {
  const next = structuredClone(value);
  const defaults = createCeoRuntimeTuning();
  for (const [group, fields] of [["game", GAME_TUNING_FIELDS], ["shadow", SHADOW_TUNING_FIELDS], ["ai", AI_TUNING_FIELDS], ["trail", TRAIL_TUNING_FIELDS], ["landing", LANDING_TUNING_FIELDS], ["balance", BALANCE_TUNING_FIELDS], ["thresholds", THRESHOLD_TUNING_FIELDS], ["transition", TRANSITION_TUNING_FIELDS]] as const) {
    for (const field of fields) {
      const candidate = (next[group] as Record<string, number>)[field.key];
      const fallback = (defaults[group] as Record<string, number>)[field.key];
      (next[group] as Record<string, number>)[field.key] = clamp(Number.isFinite(candidate) ? candidate : fallback, field.min, field.max);
    }
  }
  next.trail.pointHistory = Math.max(2, Math.round(next.trail.pointHistory));
  if (next.game.grabDepthShareMin > next.game.grabDepthShareMax) next.game.grabDepthShareMax = next.game.grabDepthShareMin;
  if (next.ai.firstPushMin > next.ai.firstPushMax) next.ai.firstPushMax = next.ai.firstPushMin;
  for (const metric of ["speed", "quality", "budget"] as const) { const normal = `${metric}Normal` as const, high = `${metric}High` as const; if (next.thresholds[normal] >= next.thresholds[high]) next.thresholds[high] = Math.min(100, next.thresholds[normal] + 1); }
  return next;
}
