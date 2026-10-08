import { CharacterController, type CharacterBounds } from "../character-controller";
import { GAME_CONFIG, type RoleId, type ZoneId } from "./config";
import type { CeoRuntimeTuning } from "./runtime-tuning";

export type DepartmentType = ZoneId;
export type EntityActivity = "FREE" | "ASSIGNED" | "GRABBED" | "CARRYING" | "FALLING" | "RECOVERING";
type BaseEntity = {
  id: string; slot: number; assignedZoneId: ZoneId | null; returningToMarket: boolean;
  controller: CharacterController;
};
export type HumanEntity = BaseEntity & { type: "human"; role: RoleId | null; displacedAt: number | null };
export type PushCycle = {
  remaining: number; phase: "idle" | "windup" | "strike" | "recovery"; phaseRemaining: number;
  targetId: string | null; zoneId: ZoneId | null; direction: -1 | 1;
};
export type RobotEntity = BaseEntity & { type: "ai"; pushCycle: PushCycle };
export type GameEntity = HumanEntity | RobotEntity;

export function emptyPushCycle(): PushCycle {
  return { remaining: 0, phase: "idle", phaseRemaining: 0, targetId: null, zoneId: null, direction: 1 };
}
export function createHumans(bounds: CharacterBounds, getTuning?: () => CeoRuntimeTuning): HumanEntity[] {
  return Array.from({ length: GAME_CONFIG.humanCount }, (_, index) => ({
    id: `human-${index}`, slot: index, type: "human", role: null, assignedZoneId: null, returningToMarket: false, displacedAt: null,
    controller: new CharacterController(index, bounds, GAME_CONFIG.humanCount, getTuning),
  }));
}
export function createRobots(bounds: CharacterBounds, startIndex = 0, count: number = GAME_CONFIG.robotCount, getTuning?: () => CeoRuntimeTuning): RobotEntity[] {
  return Array.from({ length: Math.max(0, Math.min(count, GAME_CONFIG.robotCount - startIndex)) }, (_, offset) => {
    const index = startIndex + offset;
    return {
      id: `robot-${index}`, slot: GAME_CONFIG.humanCount + index, type: "ai", assignedZoneId: null, returningToMarket: false,
      controller: new CharacterController(index, bounds, GAME_CONFIG.robotCount, getTuning), pushCycle: emptyPushCycle(),
    };
  });
}
export function entityActivity(entity: GameEntity): EntityActivity {
  switch (entity.controller.state) {
    case "GRABBED": return "GRABBED";
    case "CARRYING": return "CARRYING";
    case "THROWN": return "FALLING";
    case "FALLEN":
    case "RECOVERING": return "RECOVERING";
    default: return entity.assignedZoneId ? "ASSIGNED" : "FREE";
  }
}
export function isEntityActive(entity: GameEntity): boolean {
  return entity.assignedZoneId !== null && !entity.returningToMarket &&
    (entity.type === "ai" || entity.role === entity.assignedZoneId) &&
    (entity.controller.state === "IDLE" || entity.controller.state === "WALKING");
}
