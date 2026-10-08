import type { CharacterBounds, CharacterPoint, CharacterWorkArea } from "../character-controller";
import { GAME_CONFIG, ZONE_CONFIG, type ZoneId } from "./config";
import { isEntityActive, type GameEntity } from "./entities";

export type ZoneBounds = { x: number; y: number; width: number; height: number };
export type WorldPlane = { bounds: CharacterWorkArea; origin: CharacterPoint; scaleX: number; scaleY: number; depthSkewX: number };
export type DepartmentZone = { id: ZoneId; type: ZoneId; bounds: ZoneBounds; humans: string[]; robots: string[] };
export type FieldLayout = { inset: number; gap: number; headerBottom: number; labelHeight: number; hintHeight?: number };

export function createPlane(field: CharacterBounds, layout: FieldLayout): WorldPlane {
  const config = GAME_CONFIG.world;
  const originY = field.height - layout.inset - (layout.hintHeight ?? config.hintClearance);
  const top = layout.headerBottom + layout.gap + config.characterClearance;
  const width = Math.max(1, field.width - layout.inset * 2);
  const height = Math.max(1, originY - top);
  const departmentLeft = Math.min(...ZONE_CONFIG.map(({ geometry }) => geometry.x + geometry.y * config.depthSkewX));
  const departmentRight = Math.max(...ZONE_CONFIG.map(({ geometry }) => geometry.x + geometry.width + (geometry.y + geometry.height) * config.depthSkewX));
  const backDepth = Math.max(...ZONE_CONFIG.map(({ geometry }) => geometry.y + geometry.height));
  const span = departmentRight - departmentLeft;
  const scaleX = width / span;
  const scaleY = Math.min(scaleX * config.depthScaleY, height / backDepth);
  return {
    bounds: { left: 0, right: config.width, top: 0, bottom: backDepth },
    origin: { x: layout.inset + (width - span * scaleX) / 2 - departmentLeft * scaleX, y: originY },
    scaleX, scaleY, depthSkewX: config.depthSkewX,
  };
}

export function worldToScreen(point: CharacterPoint, plane: WorldPlane): CharacterPoint {
  return { x: plane.origin.x + (point.x + point.y * plane.depthSkewX) * plane.scaleX, y: plane.origin.y - point.y * plane.scaleY };
}
export function screenToWorld(point: CharacterPoint, plane: WorldPlane): CharacterPoint {
  const y = (plane.origin.y - point.y) / plane.scaleY;
  return { x: (point.x - plane.origin.x) / plane.scaleX - y * plane.depthSkewX, y };
}
// Ground depth stops at the departments' back edge; lifted silhouettes have independent height.
export function clampToPlane(point: CharacterPoint, plane: WorldPlane): CharacterPoint {
  // The card, not the nominal world width, owns horizontal ground bounds.
  return { x: point.x, y: Math.max(plane.bounds.top, Math.min(plane.bounds.bottom, point.y)) };
}
export function isInsideArea(point: CharacterPoint, area: CharacterWorkArea): boolean {
  return point.x >= area.left && point.x <= area.right && point.y >= area.top && point.y <= area.bottom;
}
export function areaCenter(area: CharacterWorkArea): CharacterPoint {
  return { x: (area.left + area.right) / 2, y: (area.top + area.bottom) / 2 };
}
export function createZones(): DepartmentZone[] {
  return ZONE_CONFIG.map((zone) => ({ id: zone.id, type: zone.type, bounds: { ...zone.geometry }, humans: [], robots: [] }));
}
export function zonePolygon(zone: DepartmentZone, plane: WorldPlane): CharacterPoint[] {
  const { x, y, width, height } = zone.bounds;
  return [{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }].map((point) => worldToScreen(point, plane));
}
export function workAreaFor(zone: DepartmentZone): CharacterWorkArea {
  const inset = GAME_CONFIG.world.workInset;
  return { left: zone.bounds.x + inset, right: zone.bounds.x + zone.bounds.width - inset, top: zone.bounds.y + inset, bottom: zone.bounds.y + zone.bounds.height - inset };
}
export function zoneAtPoint(zones: DepartmentZone[], point: CharacterPoint) {
  return zones.find(({ bounds }) => point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height) ?? null;
}
export function rebuildZoneMembership(zones: DepartmentZone[], entities: GameEntity[]) {
  for (const zone of zones) { zone.humans.length = 0; zone.robots.length = 0; }
  for (const entity of entities) {
    if (!isEntityActive(entity)) continue;
    const zone = zones.find((candidate) => candidate.id === entity.assignedZoneId);
    if (zone) (entity.type === "human" ? zone.humans : zone.robots).push(entity.id);
  }
}
