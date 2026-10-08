export type RoleId = "ANALYTICS" | "DESIGN" | "DEVELOPMENT" | "QA";
export type ZoneId = RoleId;
export type TaskId = "BUILD_CORE" | "BUILD_MVP" | "RELEASE_FIRE" | "AUTOMATE" | "CUSTOMER_COMPLAINTS" | "FEATURE_TOMORROW";
export type CrisisId = "CUT_COSTS" | "UNHAPPY_CUSTOMERS" | "RELEASE_TODAY";
export type MetricId = "speed" | "quality" | "budget";
export type MetricZone = "low" | "normal" | "high";

export const ROLE_CONFIG: Record<RoleId, { id: RoleId; label: string; contourColor: string }> = {
  ANALYTICS: { id: "ANALYTICS", label: "Аналитика", contourColor: "#87b895" }, DESIGN: { id: "DESIGN", label: "Дизайн", contourColor: "#e2c66f" },
  DEVELOPMENT: { id: "DEVELOPMENT", label: "Разработка", contourColor: "#83aade" }, QA: { id: "QA", label: "Тестирование", contourColor: "#d58b8c" },
};
export const ZONE_CONFIG = [
  { id: "ANALYTICS", type: "ANALYTICS", role: "ANALYTICS", label: "Аналитика", roleColor: ROLE_CONFIG.ANALYTICS.contourColor, speedContribution: 10, qualityContribution: 10, geometry: { x: -160, y: 550, width: 240, height: 400 } },
  { id: "DESIGN", type: "DESIGN", role: "DESIGN", label: "Дизайн", roleColor: ROLE_CONFIG.DESIGN.contourColor, speedContribution: 8, qualityContribution: 25, geometry: { x: 140, y: 550, width: 240, height: 400 } },
  { id: "DEVELOPMENT", type: "DEVELOPMENT", role: "DEVELOPMENT", label: "Разработка", roleColor: ROLE_CONFIG.DEVELOPMENT.contourColor, speedContribution: 28, qualityContribution: 5, geometry: { x: 440, y: 550, width: 240, height: 400 } },
  { id: "QA", type: "QA", role: "QA", label: "Тестирование", roleColor: ROLE_CONFIG.QA.contourColor, speedContribution: 7, qualityContribution: 25, geometry: { x: 740, y: 550, width: 240, height: 400 } },
] as const;
export const WORKER_CONFIG = { humanCost: 13, aiCost: 2, aiSpeedOneHuman: 20, aiSpeedTwoHumans: 40 } as const;
export const DEPENDENCY_CONFIG = { noDevelopmentSpeed: 0, noAnalyticsSpeedPenalty: 10, noAnalyticsQualityPenalty: 10, noDesignQualityPenalty: 20, noQaQualityPenalty: 20 } as const;
export const METRIC_ZONE_CONFIG = {
  speed: [{ id: "low", min: 0, max: 34, label: "Медленно" }, { id: "normal", min: 35, max: 69, label: "Нормально" }, { id: "high", min: 70, max: 100, label: "Быстро" }],
  quality: [{ id: "low", min: 0, max: 34, label: "Низкое" }, { id: "normal", min: 35, max: 69, label: "Нормальное" }, { id: "high", min: 70, max: 100, label: "Высокое" }],
  budget: [{ id: "low", min: 0, max: 44, label: "Критично" }, { id: "normal", min: 45, max: 69, label: "Стабильно" }, { id: "high", min: 70, max: 100, label: "Запас" }],
} as const satisfies Record<MetricId, readonly { id: MetricZone; min: number; max: number; label: string }[]>;
export type BubbleKind = "normal" | "think" | "robot" | "shout" | "whisper";
export type TaskConfiguration = { id: TaskId; title: string; popup: string; bubble: BubbleKind; warning: "!" | "!!" | "!!!"; spawnRobots: number; staffRequirements?: Partial<Record<ZoneId, number>>; metricRequirements?: Partial<Record<MetricId, MetricZone>>; effectiveAiCount?: number; effectiveAiZones?: ZoneId[] };
export const TASK_CONFIG: readonly TaskConfiguration[] = [
  { id: "BUILD_CORE", title: "Собери команду", popup: "Соберите базовую команду", bubble: "normal", warning: "!", spawnRobots: 0, staffRequirements: { ANALYTICS: 1, DESIGN: 1, DEVELOPMENT: 1 } },
  { id: "BUILD_MVP", title: "Собрать MVP", popup: "Нужно собрать рабочий MVP", bubble: "think", warning: "!", spawnRobots: 0, staffRequirements: { QA: 1 }, metricRequirements: { speed: "normal", quality: "normal" } },
  { id: "RELEASE_FIRE", title: "Релиз горит", popup: "Релиз горит — нужно ускориться", bubble: "shout", warning: "!!", spawnRobots: 0, staffRequirements: { DEVELOPMENT: 2 }, metricRequirements: { speed: "high", budget: "normal" } },
  { id: "AUTOMATE", title: "Автоматизировать процессы", popup: "ИИ ускоряет отдел только рядом с сотрудником", bubble: "robot", warning: "!", spawnRobots: 2, metricRequirements: { speed: "high", quality: "normal", budget: "normal" }, effectiveAiCount: 2 },
  { id: "CUSTOMER_COMPLAINTS", title: "Клиенты жалуются", popup: "Клиенты недовольны — верните качество", bubble: "shout", warning: "!!", spawnRobots: 0, metricRequirements: { quality: "high", speed: "normal", budget: "normal" }, effectiveAiZones: ["QA"] },
  { id: "FEATURE_TOMORROW", title: "Фичу нужно завтра", popup: "Нужно быстро собрать компактную команду", bubble: "shout", warning: "!!", spawnRobots: 0, metricRequirements: { speed: "high", quality: "normal", budget: "normal" }, effectiveAiZones: ["DESIGN", "DEVELOPMENT"] },
];
export type CrisisConfiguration = { id: CrisisId; title: string; popup: string; bubble: BubbleKind; warning: "!" | "!!" | "!!!"; metricRequirements: Partial<Record<MetricId, MetricZone>>; staffRequirements?: Partial<Record<ZoneId, number>>; effectiveAiCount?: number; effectiveAiZones?: ZoneId[] };
export const CRISIS_CONFIG: readonly CrisisConfiguration[] = [
  { id: "CUT_COSTS", title: "Сократите расходы", popup: "Сократите расходы", bubble: "shout", warning: "!!", metricRequirements: { budget: "high", speed: "normal" } },
  { id: "UNHAPPY_CUSTOMERS", title: "Клиенты недовольны", popup: "Клиенты снова жалуются", bubble: "shout", warning: "!!", metricRequirements: { quality: "high", budget: "normal" } },
  { id: "RELEASE_TODAY", title: "Релиз сегодня", popup: "Релиз сегодня — ускоряйтесь", bubble: "shout", warning: "!!!", metricRequirements: { speed: "high", budget: "high" } },
];
export const FINAL_PHASE_CONFIG = { title: "Финальный кризис", phases: CRISIS_CONFIG } as const;
export const TRANSITION_CONFIG = { normalHold: 1, crisisHold: 0.7, crisisTimer: 5, success: 0.5, crisisResult: 0.5 } as const;
export const AI_CONFIG = { pushInterval: 6, firstPushMin: 1.9, firstPushMax: 3.9, kickWindupDuration: 0.22, kickStrikeDuration: 0.1, kickRecoveryDuration: 0.18, pushStrengthToMarket: 1, verticalImpulse: 380, flightPlanarSpeed: 220, minimumFlightDuration: 0.65, bodyWindupAngle: 0.38, bodyStrikeAngle: 0.48, legWindupAngle: 0.4, legStrikeAngle: 1.1 } as const;
export const TRAIL_CONFIG = { pointHistory: 12, historyDuration: 0.2, fadeDuration: 0.12, minVelocity: 100, minDropHeight: 56, opacity: 0.12, strokeWidth: 3.2 } as const;
export const LANDING_EFFECT_CONFIG = { lineLength: 16, centerGap: 40, duration: 0.12, opacity: 0.4, strokeWidth: 1.6 } as const;
export const HINT_CONFIG = { delay: 4, lowBudgetThreshold: 45, unreturnedPushDelay: 8, pulseDurationMs: 1800, opacityMin: 0.45, opacityMax: 0.75, rules: [
  { trigger: "all-free", priority: 90, text: "Назначьте сотрудников в отделы" }, { trigger: "no-development", priority: 80, text: "Без Разработки продукт не движется" }, { trigger: "low-budget", priority: 70, text: "Бюджет проседает — попробуйте сократить команду" }, { trigger: "ineffective-ai", priority: 65, text: "ИИ работает только рядом с человеком" }, { trigger: "low-quality", priority: 55, text: "Нужно больше качества — попробуйте Дизайн или Тестирование" }, { trigger: "no-analytics", priority: 50, text: "Без Аналитики скорость и качество снижаются" }, { trigger: "no-design", priority: 40, text: "Без Дизайна качество снижается" }, { trigger: "no-qa", priority: 30, text: "Без Тестирования качество снижается" }, { trigger: "displaced", priority: 20, text: "Верните сотрудника в команду" },
] } as const;
export const GAME_CONFIG = { humanCount: 6, robotCount: 2, seed: 47021, directiveAdvanceDelay: TRANSITION_CONFIG.normalHold, grabLiftThreshold: 40, throwHorizontalVelocityTransfer: 0.3, throwVerticalVelocityTransfer: 0.45, throwDepthMultiplier: 0.1, grabDepthShareMin: 0.7, grabDepthShareMax: 0.95, maxThrowVelocity: 1500, gravity: 1400, pointerSampleWindowMs: 80, departments: ZONE_CONFIG, directives: TASK_CONFIG, metrics: { min: 0, max: 100, initialBudget: 100 }, world: { width: 1000, depth: 1000, depthSkewX: 0.4, depthScaleY: 0.55, characterClearance: 44, workInset: 24, hintClearance: 24, spawnJitter: 16, spawnColumns: 6, spawnRows: 3, freeArea: { left: 40, right: 930, top: 40, bottom: 300 } }, shadow: { growth: 0.4, maxHeightRatio: 2, opacity: 0.2 }, ai: AI_CONFIG, report: { speedMultiplier: 1, qualityMultiplier: 1, budgetMultiplier: 1 } } as const;
