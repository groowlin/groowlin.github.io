import { type CharacterBounds, type CharacterPoint, type CharacterWorkArea } from "../character-controller";
import { FINAL_PHASE_CONFIG, GAME_CONFIG, HINT_CONFIG } from "./config";
import { createCeoRuntimeTuning, type CeoRuntimeTuning } from "./runtime-tuning";
import { createDirectives, evaluateRequirements, evaluateStaffRequirements, type DepartmentProgress, type DirectiveId, type RequirementProgress } from "./directives";
import { createHumans, createRobots, emptyPushCycle, isEntityActive, type GameEntity, type RobotEntity } from "./entities";
import { calculateIncome, calculateMetrics, type GameMetrics } from "./metrics";
import { areaCenter, createPlane, createZones, isInsideArea, rebuildZoneMembership, workAreaFor, worldToScreen, zoneAtPoint, type DepartmentZone, type FieldLayout, type WorldPlane } from "./zones";

export type GamePhase = "NORMAL_TASK" | "FINAL_PHASE" | "FINISHED";
export type PresentationState = "PLAYING" | "TASK_SUCCESS" | "CRISIS_RESULT" | "FINISHED";
export type TransformationReport = {
  averageSpeed: number; averageQuality: number; averageBudget: number; income: number;
  finalActiveHumans: number; finalActiveAI: number; crisisSuccesses: number; verdict: "Компания растёт" | "Бизнес удержался" | "Компания обанкротилась";
};
export type GameStatistics = {
  duration: number; speedIntegral: number; qualityIntegral: number; budgetIntegral: number;
  humansIntegral: number; aiIntegral: number; pushes: number; falls: number;
};

export class CeoGame {
  entities: GameEntity[];
  zones: DepartmentZone[];
  plane: WorldPlane;
  freeArea: CharacterWorkArea = { ...GAME_CONFIG.world.freeArea };
  directives = createDirectives();
  metrics: GameMetrics;
  activeDirectiveIndex = 0;
  completedDirectiveIds: DirectiveId[] = [];
  requirements: RequirementProgress[] = [];
  departmentProgress: DepartmentProgress[] = [];
  phase: GamePhase = "NORMAL_TASK";
  finalPhase = { elapsed: 0, phaseIndex: 0, timer: 0, successes: 0, results: [] as boolean[] };
  presentationState: PresentationState = "PLAYING";
  presentationRemaining = 0;
  holdProgress = 0;
  lastCrisisResult: boolean | null = null;
  statistics: GameStatistics = { duration: 0, speedIntegral: 0, qualityIntegral: 0, budgetIntegral: 0, humansIntegral: 0, aiIntegral: 0, pushes: 0, falls: 0 };
  report: TransformationReport | null = null;
  hint: string | null = null;
  elapsed = 0;
  private scenarioVisibleUntil = 0;
  private activatedDirectiveIds = new Set<DirectiveId>();
  private randomState: number = GAME_CONFIG.seed;
  private lastInteractionAt = 0;

  private readonly getTuning: () => CeoRuntimeTuning;

  constructor(private bounds: CharacterBounds, private layout: FieldLayout, getTuning?: () => CeoRuntimeTuning) {
    const defaults = getTuning ? null : createCeoRuntimeTuning();
    this.getTuning = getTuning ?? (() => defaults!);
    this.plane = createPlane(bounds, layout);
    this.zones = createZones();
    this.entities = createHumans(bounds, this.getTuning);
    for (const entity of this.entities) this.configureEntity(entity, true);
    this.metrics = calculateMetrics(this.entities, this.getTuning().balance);
    this.activateDirective();
  }
  get finished() { return this.phase === "FINISHED"; }
  get interactive() { return !this.finished && this.presentationState === "PLAYING"; }
  get crisisTimeRemaining() { return this.phase === "FINAL_PHASE" && this.interactive ? Math.max(0, this.getTuning().transition.crisisTimer - this.finalPhase.timer) : null; }
  get contextualPopup() {
    if (this.presentationState === "TASK_SUCCESS") return { text: "✓ Выполнено", bubble: "normal" as const, warning: "!" as const };
    if (this.presentationState === "CRISIS_RESULT") return { text: this.lastCrisisResult ? "✓ Выполнено" : "✕ Не выполнено", bubble: this.lastCrisisResult ? "normal" as const : "shout" as const, warning: this.lastCrisisResult ? "!" as const : "!!" as const };
    if (this.hint) return { text: this.hint, bubble: "whisper" as const, warning: "!" as const };
    const directive = this.currentDirective;
    return this.elapsed <= this.scenarioVisibleUntil ? { text: directive.popup, bubble: directive.bubble, warning: directive.warning } : null;
  }
  get currentDirective() {
    if (this.phase !== "NORMAL_TASK") return { ...FINAL_PHASE_CONFIG.phases[this.finalPhase.phaseIndex], completed: false };
    return this.directives[this.activeDirectiveIndex];
  }
  entityAt(slot: number) { return this.entities.find((entity) => entity.slot === slot); }
  private random() {
    this.randomState = (Math.imul(this.randomState, 1664525) + 1013904223) >>> 0;
    return this.randomState / 4294967296;
  }
  private spawnPosition(slot: number): CharacterPoint {
    const { spawnColumns, spawnRows, spawnJitter } = GAME_CONFIG.world;
    const column = slot % spawnColumns, row = Math.floor(slot / spawnColumns) % spawnRows;
    return {
      x: this.freeArea.left + (this.freeArea.right - this.freeArea.left) * (column + 1) / (spawnColumns + 1) + (this.random() - 0.5) * spawnJitter,
      y: this.freeArea.top + (this.freeArea.bottom - this.freeArea.top) * (row + 1) / (spawnRows + 1) + (this.random() - 0.5) * spawnJitter,
    };
  }
  private configureEntity(entity: GameEntity, initial = false) {
    entity.controller.configurePlane(this.plane, this.freeArea, initial ? this.spawnPosition(entity.slot) : undefined);
    const zone = this.zones.find((candidate) => candidate.id === entity.assignedZoneId);
    entity.controller.setWorkArea(zone ? workAreaFor(zone) : null);
  }
  private updateComposition() {
    rebuildZoneMembership(this.zones, this.entities);
    this.metrics = calculateMetrics(this.entities, this.getTuning().balance);
    const directive = this.currentDirective;
    this.requirements = evaluateRequirements(directive, this.metrics, this.getTuning().thresholds);
    this.departmentProgress = this.phase === "NORMAL_TASK" ? evaluateStaffRequirements(this.directives[this.activeDirectiveIndex], this.zones) : [];
    for (const entity of this.entities) {
      if (entity.type === "human" && isEntityActive(entity)) entity.displacedAt = null;
    }
    this.updateHint();
  }
  private activateDirective() {
    const directive = this.directives[this.activeDirectiveIndex];
    if (!this.activatedDirectiveIds.has(directive.id)) {
      this.activatedDirectiveIds.add(directive.id);
      if (directive.spawnRobots > 0) {
        const existing = this.entities.filter((entity) => entity.type === "ai").length;
        const robots = createRobots(this.bounds, existing, directive.spawnRobots, this.getTuning);
        for (const robot of robots) this.configureEntity(robot, true);
        this.entities.push(...robots);
      }
    }
    this.scenarioVisibleUntil = this.elapsed + 3;
    this.updateComposition();
  }
  resize(bounds: CharacterBounds, layout: FieldLayout) {
    this.bounds = bounds; this.layout = layout;
    this.plane = createPlane(bounds, layout);
    for (const entity of this.entities) { entity.controller.resize(bounds); this.configureEntity(entity); }
    if (!this.finished) this.updateComposition();
  }
  grab(slot: number, pointerId: number, point: CharacterPoint, time: number) {
    const entity = this.entityAt(slot);
    if (!this.interactive || !entity || !entity.controller.grab(pointerId, point, time)) return false;
    this.lastInteractionAt = this.elapsed;
    this.scenarioVisibleUntil = -1;
    entity.assignedZoneId = null;
    entity.controller.setWorkArea(null);
    if (entity.type === "ai") this.clearPushCycle(entity);
    for (const robot of this.entities) {
      if (robot.type === "ai" && robot.pushCycle.targetId === entity.id) this.cancelTarget(robot);
    }
    this.updateComposition();
    return true;
  }
  release(slot: number, pointerId: number, time: number, cancelled = false) {
    const entity = this.entityAt(slot);
    if (this.finished || !entity || entity.controller.grabbedPointerId !== pointerId) return;
    this.lastInteractionAt = this.elapsed;
    entity.controller.release(pointerId, time, cancelled);
    if (entity.controller.state === "IDLE" || entity.controller.state === "WALKING") this.settleEntity(entity);
    this.updateComposition();
  }
  private settleEntity(entity: GameEntity) {
    const ground = entity.controller.getGroundPosition();
    const zone = zoneAtPoint(this.zones, ground);
    if (zone) {
      entity.assignedZoneId = zone.id;
      entity.returningToMarket = false;
      if (entity.type === "human") entity.role = zone.id;
      entity.controller.setWorkArea(workAreaFor(zone));
      return;
    }
    entity.assignedZoneId = null;
    entity.returningToMarket = !isInsideArea(ground, this.freeArea);
    entity.controller.setWorkArea(null);
    // Every accessible point outside a department belongs to the labor market.
    // FREE_AREA only limits autonomous wandering, never assignment or role changes.
    if (entity.type === "human") entity.role = null;
  }
  updatePhysics(dt: number, time: number, reducedMotion: boolean) {
    if (this.finished) return false;
    let impacted = false;
    for (const entity of this.entities) {
      const before = entity.controller.impactCount;
      entity.controller.update(dt, time, reducedMotion);
      const landed = entity.controller.impactCount > before;
      if (landed) {
        impacted = true; this.statistics.falls += 1;
        this.settleEntity(entity);
      }
      const state = entity.controller.state;
      if (state === "GRABBED" || state === "CARRYING" || state === "THROWN") continue;
      if (state === "IDLE" || state === "WALKING") this.settleEntity(entity);
    }
    this.updateComposition();
    return impacted;
  }
  advance(seconds: number) {
    if (this.finished || !Number.isFinite(seconds) || seconds <= 0) return;
    let remaining = seconds;
    while (remaining > 1e-9 && !this.finished) {
      const slice = Math.min(remaining, 0.05, this.interactive ? Number.POSITIVE_INFINITY : Math.max(this.presentationRemaining, 1e-9));
      this.elapsed += slice;
      if (this.interactive) {
        this.updateAI(slice);
        if (this.phase === "FINAL_PHASE") this.sampleFinal(slice);
      }
      this.updateComposition();
      remaining -= slice;
      if (!this.interactive) { this.presentationRemaining -= slice; if (this.presentationRemaining <= 1e-9) this.advancePresentation(); continue; }
      const conditions = [...this.departmentProgress, ...this.requirements];
      const met = conditions.length > 0 && conditions.every((requirement) => requirement.met);
      this.holdProgress = met ? this.holdProgress + slice : 0;
      if (this.phase === "NORMAL_TASK") {
        if (this.holdProgress + 1e-9 >= this.getTuning().transition.normalHold) { this.completeTask(); return; }
      } else {
        this.finalPhase.elapsed += slice; this.finalPhase.timer += slice;
        if (this.holdProgress + 1e-9 >= this.getTuning().transition.crisisHold) { this.completeCrisis(true); return; }
        else if (this.finalPhase.timer + 1e-9 >= this.getTuning().transition.crisisTimer) { this.completeCrisis(false); return; }
      }
    }
    if (!this.finished) this.updateComposition();
  }
  private advancePresentation() {
    if (this.presentationState === "TASK_SUCCESS") {
      if (this.activeDirectiveIndex < this.directives.length - 1) { this.activeDirectiveIndex += 1; this.activateDirective(); }
      else { this.phase = "FINAL_PHASE"; this.finalPhase.phaseIndex = 0; this.scenarioVisibleUntil = this.elapsed + 3; this.updateComposition(); }
      this.presentationState = "PLAYING"; this.presentationRemaining = 0; this.holdProgress = 0; if (this.phase === "FINAL_PHASE") this.finalPhase.timer = 0;
    } else if (this.presentationState === "CRISIS_RESULT") {
      if (this.finalPhase.phaseIndex >= FINAL_PHASE_CONFIG.phases.length - 1) this.finish();
      else { this.finalPhase.phaseIndex += 1; this.finalPhase.timer = 0; this.holdProgress = 0; this.lastCrisisResult = null; this.scenarioVisibleUntil = this.elapsed + 3; this.updateComposition(); this.presentationState = "PLAYING"; this.presentationRemaining = 0; }
    }
  }
  private completeTask() { const task = this.directives[this.activeDirectiveIndex]; task.completed = true; this.completedDirectiveIds.push(task.id); this.holdProgress = 0; this.presentationState = "TASK_SUCCESS"; this.presentationRemaining = this.getTuning().transition.success; }
  private completeCrisis(success: boolean) { this.lastCrisisResult = success; this.finalPhase.results.push(success); if (success) this.finalPhase.successes += 1; this.holdProgress = 0; this.presentationState = "CRISIS_RESULT"; this.presentationRemaining = this.getTuning().transition.crisisResult; }
  private sampleFinal(seconds: number) {
    const statistics = this.statistics;
    statistics.duration += seconds;
    statistics.speedIntegral += this.metrics.speed * seconds;
    statistics.qualityIntegral += this.metrics.quality * seconds;
    statistics.budgetIntegral += this.metrics.budget * seconds;
    statistics.humansIntegral += this.metrics.activeHumans * seconds;
    statistics.aiIntegral += this.metrics.activeAI * seconds;
  }
  private finish() {
    const duration = this.statistics.duration || 1;
    const averageSpeed = this.statistics.speedIntegral / duration;
    const averageQuality = this.statistics.qualityIntegral / duration;
    const averageBudget = this.statistics.budgetIntegral / duration;
    this.report = {
      averageSpeed, averageQuality, averageBudget,
      income: calculateIncome({ speed: averageSpeed, quality: averageQuality, budget: averageBudget }),
      finalActiveHumans: this.metrics.activeHumans, finalActiveAI: this.metrics.activeAI, crisisSuccesses: this.finalPhase.successes,
      verdict: this.finalPhase.successes === 3 ? "Компания растёт" : this.finalPhase.successes === 2 ? "Бизнес удержался" : "Компания обанкротилась",
    };
    this.phase = "FINISHED"; this.presentationState = "FINISHED"; this.hint = null;
    for (const entity of this.entities) if (entity.type === "ai") this.clearPushCycle(entity);
  }
  private updateHint() {
    if (this.finished) { this.hint = null; return; }
    const idle = this.elapsed - this.lastInteractionAt >= HINT_CONFIG.delay;
    const blocked = this.metrics.blockedBy;
    const capped = this.metrics.baseSpeed > this.metrics.speed || this.metrics.baseQuality > this.metrics.quality;
    const conditions: Record<typeof HINT_CONFIG.rules[number]["trigger"], boolean> = {
      "all-free": idle && this.metrics.activeHumans === 0,
      "no-development": idle && blocked.includes("DEVELOPMENT"),
      "low-budget": idle && this.metrics.budget <= HINT_CONFIG.lowBudgetThreshold,
      "ineffective-ai": idle && this.metrics.activeAI > this.metrics.effectiveAI,
      "low-quality": idle && this.metrics.quality < this.getTuning().thresholds.qualityNormal,
      "no-analytics": idle && capped && blocked.includes("ANALYTICS"),
      "no-design": idle && capped && blocked.includes("DESIGN"),
      "no-qa": idle && capped && blocked.includes("QA"),
      "displaced": this.entities.some((entity) => entity.type === "human" && !isEntityActive(entity) && entity.displacedAt !== null && this.elapsed - entity.displacedAt >= HINT_CONFIG.unreturnedPushDelay),
    };
    let selected: typeof HINT_CONFIG.rules[number] | null = null;
    for (const rule of HINT_CONFIG.rules) if (conditions[rule.trigger] && (!selected || rule.priority > selected.priority)) selected = rule;
    this.hint = selected?.text ?? null;
  }
  private clearPushCycle(robot: RobotEntity) {
    robot.pushCycle = emptyPushCycle();
    robot.controller.setKick("idle", 0, 1);
  }
  private cancelTarget(robot: RobotEntity) {
    robot.pushCycle.targetId = null;
    robot.pushCycle.phase = "idle"; robot.pushCycle.phaseRemaining = 0;
    robot.pushCycle.remaining = this.getTuning().ai.pushInterval;
    robot.controller.setKick("idle", 0, robot.pushCycle.direction);
  }
  private pushHuman(human: GameEntity) {
    const ground = human.controller.getGroundPosition(), market = areaCenter(this.freeArea);
    const ai = this.getTuning().ai;
    const landing = { x: ground.x + (market.x - ground.x) * ai.pushStrengthToMarket, y: ground.y + (market.y - ground.y) * ai.pushStrengthToMarket };
    const source = worldToScreen(ground, this.plane), destination = worldToScreen(landing, this.plane);
    human.controller.setWorkArea(null);
    if (human.controller.launch({ x: destination.x - source.x, y: -ai.verticalImpulse }, true, landing)) {
      human.assignedZoneId = null; human.returningToMarket = true;
      if (human.type === "human") human.displacedAt = this.elapsed;
      this.statistics.pushes += 1;
    }
  }
  private updateAI(seconds: number) {
    const ai = this.getTuning().ai;
    const reserved = new Set(this.entities.flatMap((entity) => entity.type === "ai" && entity.pushCycle.targetId ? [entity.pushCycle.targetId] : []));
    for (const robot of this.entities) {
      if (robot.type !== "ai") continue;
      if (!isEntityActive(robot)) { this.clearPushCycle(robot); continue; }
      const cycle = robot.pushCycle;
      if (cycle.zoneId !== robot.assignedZoneId) {
        cycle.zoneId = robot.assignedZoneId;
        cycle.targetId = null; cycle.phase = "idle"; cycle.phaseRemaining = 0;
        cycle.remaining = ai.firstPushMin + this.random() * (ai.firstPushMax - ai.firstPushMin);
      }
      if (cycle.phase === "windup") {
        const human = this.entities.find((candidate) => candidate.id === cycle.targetId);
        if (!human || human.type !== "human" || !isEntityActive(human) || human.assignedZoneId !== robot.assignedZoneId) {
          if (cycle.targetId) reserved.delete(cycle.targetId);
          this.cancelTarget(robot); continue;
        }
        cycle.phaseRemaining -= seconds;
        robot.controller.setKick("windup", 1 - Math.max(0, cycle.phaseRemaining) / ai.kickWindupDuration, cycle.direction);
        if (cycle.phaseRemaining <= 1e-9) {
          cycle.phase = "strike"; cycle.phaseRemaining = ai.kickStrikeDuration;
          robot.controller.setKick("strike", 0, cycle.direction);
          this.pushHuman(human);
        }
        continue;
      }
      if (cycle.phase === "strike" || cycle.phase === "recovery") {
        const duration = cycle.phase === "strike" ? ai.kickStrikeDuration : ai.kickRecoveryDuration;
        cycle.phaseRemaining -= seconds;
        robot.controller.setKick(cycle.phase, 1 - Math.max(0, cycle.phaseRemaining) / duration, cycle.direction);
        if (cycle.phaseRemaining <= 1e-9) {
          if (cycle.phase === "strike") { cycle.phase = "recovery"; cycle.phaseRemaining = ai.kickRecoveryDuration; }
          else {
            if (cycle.targetId) reserved.delete(cycle.targetId);
            this.cancelTarget(robot);
            cycle.remaining = Math.max(0, ai.pushInterval - ai.kickWindupDuration - ai.kickStrikeDuration - ai.kickRecoveryDuration);
          }
        }
        continue;
      }
      cycle.remaining -= seconds;
      if (cycle.remaining > 1e-9) continue;
      const candidates = this.entities.filter((entity) => entity.type === "human" && isEntityActive(entity) && entity.assignedZoneId === robot.assignedZoneId && !reserved.has(entity.id));
      const human = candidates[Math.floor(this.random() * candidates.length)];
      if (!human) { cycle.remaining = ai.pushInterval; continue; }
      const source = worldToScreen(human.controller.getGroundPosition(), this.plane);
      const destination = worldToScreen(areaCenter(this.freeArea), this.plane);
      cycle.direction = destination.x >= source.x ? 1 : -1;
      cycle.targetId = human.id; cycle.phase = "windup"; cycle.phaseRemaining = ai.kickWindupDuration;
      reserved.add(human.id);
      robot.controller.setKick("windup", 0, cycle.direction);
    }
  }
}
