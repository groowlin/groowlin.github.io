import { createCeoRuntimeTuning, type CeoRuntimeTuning } from "./ceo-simulator/runtime-tuning";
import { screenToWorld, worldToScreen, type WorldPlane } from "./ceo-simulator/zones";

export type CharacterState = "IDLE" | "WALKING" | "GRABBED" | "CARRYING" | "THROWN" | "FALLEN" | "RECOVERING";
export type CharacterPoint = { x: number; y: number };
export type CharacterBounds = { width: number; height: number; radius?: number };
export type CharacterWorkArea = { left: number; right: number; top: number; bottom: number };
export type CharacterParticle = CharacterPoint & { vx: number; vy: number };
type PointerSample = CharacterPoint & { time: number };
type CharacterPose = { head: CharacterPoint; body: CharacterPoint; leftLeg: CharacterPoint; rightLeg: CharacterPoint; rotation: number };

export const CHARACTER_CONFIG = {
  count: 5,
  size: 44,
  headRadius: 12,
  headStroke: 3.2,
  neckOffset: 11,
  bodyLength: 19,
  bodyHalfWidth: 4,
  legLength: 8,
  legSpread: 4,
  legStroke: 4,
  walkingSpeedMin: 20,
  walkingSpeedMax: 36,
  walkDurationMin: 1.5,
  walkDurationMax: 5,
  idleDurationMin: 0.5,
  idleDurationMax: 3,
  directionChangeChance: 0.35,
  initiallyIdleChance: 0.2,
  walkFrequency: 7,
  walkStride: 3,
  walkLift: 2,
  bodySway: 0.8,
  headBob: 0.8,
  mass: 2,
  maxParticleVelocity: 2200,
  bodyStiffness: 340,
  bodyDamping: 26,
  legStiffness: 110,
  legDamping: 28,
  legMaxAngle: 0.65,
  carryBodyMaxAngle: 0.8,
  headBoundaryPadding: 1,
  boundaryAngleSteps: 6,
  relativeReleaseVelocity: 0.35,
  throwSpinScale: 0.002,
  maxAngularVelocity: 8,
  angularDrag: 0.7,
  wallBounce: 0.25,
  workAreaPadding: 4,
  workSpeedScale: 0.45,
  workMoveDurationMin: 1.5,
  workMoveDurationMax: 4,
  workIdleDurationMin: 0.4,
  workIdleDurationMax: 1.8,
  workArrivalThreshold: 1.5,
  scriptedFallDuration: 0.2,
  scriptedRecoveryDuration: 0.4,
  pointerSampleLimit: 12,
  pointerMotionThreshold: 0.2,
  fixedStep: 1 / 120,
  maxFrameDelta: 0.05,
  maxSubsteps: 8,
} as const;

const C = CHARACTER_CONFIG;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(Math.max(min, max), value));
const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);
const particle = (x: number, y: number): CharacterParticle => ({ x, y, vx: 0, vy: 0 });
const rotate = (x: number, y: number, angle: number): CharacterPoint => ({ x: x * Math.cos(angle) - y * Math.sin(angle), y: x * Math.sin(angle) + y * Math.cos(angle) });
const angleDelta = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const HEAD_BOUNDARY_RADIUS = C.headRadius + C.headStroke / 2 + C.headBoundaryPadding;

function poseAt(head: CharacterPoint, rotation: number): CharacterPose {
  return poseWithAngles(head, rotation, rotation, rotation, rotation);
}

function poseWithAngles(head: CharacterPoint, bodyAngle: number, leftAngle: number, rightAngle: number, rotation: number): CharacterPose {
  const body = rotate(0, C.bodyLength, bodyAngle);
  const leftHip = rotate(-C.bodyHalfWidth, C.bodyLength, bodyAngle);
  const rightHip = rotate(C.bodyHalfWidth, C.bodyLength, bodyAngle);
  const leftLeg = rotate(0, C.legLength, leftAngle);
  const rightLeg = rotate(0, C.legLength, rightAngle);
  return {
    head: { ...head },
    body: { x: head.x + body.x, y: head.y + body.y },
    leftLeg: { x: head.x + leftHip.x + leftLeg.x, y: head.y + leftHip.y + leftLeg.y },
    rightLeg: { x: head.x + rightHip.x + rightLeg.x, y: head.y + rightHip.y + rightLeg.y },
    rotation,
  };
}

function limitVelocity(point: { vx: number; vy: number }, maximum: number) {
  const speed = Math.hypot(point.vx, point.vy);
  if (speed > maximum) {
    point.vx *= maximum / speed;
    point.vy *= maximum / speed;
  }
}

function spring(point: CharacterParticle, target: CharacterPoint, velocity: CharacterPoint, stiffness: number, damping: number, gravity: number, dt: number) {
  point.vx += (stiffness * (target.x - point.x) - damping * (point.vx - velocity.x)) / C.mass * dt;
  point.vy += ((stiffness * (target.y - point.y) - damping * (point.vy - velocity.y)) / C.mass + gravity) * dt;
  limitVelocity(point, C.maxParticleVelocity);
  point.x += point.vx * dt;
  point.y += point.vy * dt;
}

function constrainLength(point: CharacterParticle, anchor: CharacterParticle, length: number) {
  const dx = point.x - anchor.x;
  const dy = point.y - anchor.y;
  const distance = Math.hypot(dx, dy);
  const nx = distance ? dx / distance : 0;
  const ny = distance ? dy / distance : 1;
  point.x = anchor.x + nx * length;
  point.y = anchor.y + ny * length;
  const separatingSpeed = (point.vx - anchor.vx) * nx + (point.vy - anchor.vy) * ny;
  point.vx -= separatingSpeed * nx;
  point.vy -= separatingSpeed * ny;
}

function projectRounded(point: CharacterPoint, radius: number, bounds: CharacterBounds): CharacterPoint {
  const left = radius;
  const right = Math.max(left, bounds.width - radius);
  const top = radius;
  const bottom = Math.max(top, bounds.height - radius);
  const corner = Math.max(0, Math.min(bounds.radius ?? 0, bounds.width / 2, bounds.height / 2) - radius);
  const x = clamp(point.x, left, right);
  const y = clamp(point.y, top, bottom);
  if (!corner) return { x, y };
  const cx = clamp(x, left + corner, right - corner);
  const cy = clamp(y, top + corner, bottom - corner);
  const dx = x - cx;
  const dy = y - cy;
  const distance = Math.hypot(dx, dy);
  return distance > corner ? { x: cx + dx * corner / distance, y: cy + dy * corner / distance } : { x, y };
}

export class CharacterController {
  state: CharacterState;
  direction: -1 | 1;
  readonly walkingSpeed = randomBetween(C.walkingSpeedMin, C.walkingSpeedMax);
  walkPhase = Math.random() * Math.PI * 2;
  movementTimer = randomBetween(C.walkDurationMin, C.walkDurationMax);
  idleTimer = randomBetween(C.idleDurationMin, C.idleDurationMax);
  readonly head: CharacterParticle;
  readonly body: CharacterParticle;
  readonly leftLeg: CharacterParticle;
  readonly rightLeg: CharacterParticle;
  rotation = 0;
  angularVelocity = 0;
  impactCount: number = 0;
  grabbedPointerId: number | null = null;
  worldPosition: CharacterPoint = { x: 0, y: 0 };
  height = 0;
  flightTrail: (CharacterPoint & { age: number })[] = [];
  landingEffect: { point: CharacterPoint; elapsed: number } | null = null;
  private bounds: CharacterBounds;
  private plane: WorldPlane | null = null;
  private freeArea: CharacterWorkArea | null = null;
  private kick = { phase: "idle" as "idle" | "windup" | "strike" | "recovery", progress: 0, direction: 1 as -1 | 1 };
  private verticalVelocity = 0;
  private planarVelocity: CharacterPoint = { x: 0, y: 0 };
  private flightEnd: CharacterPoint | null = null;
  private flightElapsed = 0;
  private flightDuration = 0;
  private flightEffectsEligible = false;
  private flightEffectsStarted = false;
  private trailFadeElapsed: number | null = null;
  private grabOffset: CharacterPoint = { x: 0, y: 0 };
  private grabStartPointer: CharacterPoint = { x: 0, y: 0 };
  private grabStartHeight = 0;
  private grabTarget: CharacterPoint = { x: 0, y: 0 };
  private pointerSamples: PointerSample[] = [];
  private lastMotionTime = 0;
  private constrainedSamples: PointerSample[] = [];
  private lastConstrainedMotionTime = 0;
  private workArea: CharacterWorkArea | null = null;
  private workTarget: CharacterPoint | null = null;
  private recoveryElapsed = 0;
  private recoveryStart: CharacterPose | null = null;
  private recoveryTarget: CharacterPose | null = null;

  private readonly getTuning: () => CeoRuntimeTuning;

  constructor(index: number, bounds: CharacterBounds, population: number = C.count, getTuning?: () => CeoRuntimeTuning) {
    const defaults = getTuning ? null : createCeoRuntimeTuning();
    this.getTuning = getTuning ?? (() => defaults!);
    this.bounds = bounds;
    this.direction = Math.random() < 0.5 ? -1 : 1;
    this.state = Math.random() < C.initiallyIdleChance ? "IDLE" : "WALKING";
    const margin = C.headRadius + C.headStroke / 2;
    const total = Number.isFinite(population) ? Math.max(1, Math.floor(population)) : C.count;
    const x = margin + (Math.max(0, bounds.width - margin * 2) * (clamp(index, 0, total - 1) + 1)) / (total + 1);
    const y = bounds.height / 2;
    this.worldPosition = { x, y: y + C.bodyLength + C.legLength + C.legStroke / 2 };
    this.head = particle(x, y);
    this.body = particle(x, y + C.bodyLength);
    this.leftLeg = particle(x - C.bodyHalfWidth, y + C.bodyLength + C.legLength);
    this.rightLeg = particle(x + C.bodyHalfWidth, y + C.bodyLength + C.legLength);
    this.enforceRigidPose();
  }

  private screenGround() { return this.plane ? worldToScreen(this.worldPosition, this.plane) : { ...this.worldPosition }; }
  private standingHeadY() { return this.screenGround().y - C.bodyLength - C.legLength - C.legStroke / 2; }
  private particles() { return [this.head, this.body, this.leftLeg, this.rightLeg]; }

  private hip(side: -1 | 1): CharacterParticle {
    const dx = this.body.x - this.head.x;
    const dy = this.body.y - this.head.y;
    const length = Math.hypot(dx, dy) || C.bodyLength;
    const ox = dy / length * C.bodyHalfWidth * side;
    const oy = -dx / length * C.bodyHalfWidth * side;
    const omega = (dx * (this.body.vy - this.head.vy) - dy * (this.body.vx - this.head.vx)) / (length * length);
    return { x: this.body.x + ox, y: this.body.y + oy, vx: this.body.vx - omega * oy, vy: this.body.vy + omega * ox };
  }

  private containsDisc(point: CharacterPoint, radius: number, region: CharacterWorkArea | null) {
    if (region && (point.x < region.left + radius || point.x > region.right - radius || point.y < region.top + radius || point.y > region.bottom - radius)) return false;
    const projected = projectRounded(point, radius, this.bounds);
    return Math.hypot(projected.x - point.x, projected.y - point.y) < 0.000001;
  }

  private projectDisc(point: CharacterPoint, radius: number, region: CharacterWorkArea | null): CharacterPoint {
    let projected = projectRounded(point, radius, this.bounds);
    if (!region) return projected;
    projected = projectRounded({ x: clamp(projected.x, region.left + radius, region.right - radius), y: clamp(projected.y, region.top + radius, region.bottom - radius) }, radius, this.bounds);
    if (this.containsDisc(projected, radius, region)) return projected;
    return projectRounded({ x: (region.left + region.right) / 2, y: (region.top + region.bottom) / 2 }, radius, this.bounds);
  }

  private fitRod(point: CharacterParticle, anchor: CharacterParticle, length: number, radius: number, region: CharacterWorkArea | null) {
    constrainLength(point, anchor, length);
    if (this.containsDisc(point, radius, region)) return;
    const desired = Math.atan2(point.y - anchor.y, point.x - anchor.x);
    const center = this.projectDisc(region ? { x: (region.left + region.right) / 2, y: (region.top + region.bottom) / 2 } : { x: this.bounds.width / 2, y: this.bounds.height / 2 }, radius, region);
    const inward = Math.atan2(center.y - anchor.y, center.x - anchor.x);
    const delta = angleDelta(inward, desired);
    let safe = 0;
    let unsafe = 1;
    for (let index = 0; index < C.boundaryAngleSteps; index += 1) {
      const middle = (safe + unsafe) / 2;
      const angle = inward + delta * middle;
      const candidate = { x: anchor.x + Math.cos(angle) * length, y: anchor.y + Math.sin(angle) * length };
      if (this.containsDisc(candidate, radius, region)) safe = middle;
      else unsafe = middle;
    }
    const angle = inward + delta * safe;
    const x = anchor.x + Math.cos(angle) * length;
    const y = anchor.y + Math.sin(angle) * length;
    const outwardX = point.x - x;
    const outwardY = point.y - y;
    const distance = Math.hypot(outwardX, outwardY);
    if (distance) {
      const speed = (point.vx - anchor.vx) * outwardX / distance + (point.vy - anchor.vy) * outwardY / distance;
      if (speed > 0) { point.vx -= speed * outwardX / distance; point.vy -= speed * outwardY / distance; }
    }
    point.x = x;
    point.y = y;
    constrainLength(point, anchor, length);
  }

  private enforceRigidPose(region: CharacterWorkArea | null = null) {
    if (this.state === "THROWN" || this.grabbedPointerId !== null || this.height > 0) {
      // Height is not floor depth: a tossed or held figure may extend above the card.
      constrainLength(this.body, this.head, C.bodyLength);
      constrainLength(this.leftLeg, this.hip(-1), C.legLength);
      constrainLength(this.rightLeg, this.hip(1), C.legLength);
      this.constrainLegAngles();
      return;
    }
    const head = this.projectDisc(this.head, HEAD_BOUNDARY_RADIUS, region);
    const dx = this.head.x - head.x;
    const dy = this.head.y - head.y;
    const distance = Math.hypot(dx, dy);
    if (distance) {
      const outwardSpeed = (this.head.vx * dx + this.head.vy * dy) / distance;
      if (outwardSpeed > 0) {
        this.head.vx -= outwardSpeed * dx / distance;
        this.head.vy -= outwardSpeed * dy / distance;
      }
      this.head.x = head.x;
      this.head.y = head.y;
    }
    this.fitRod(this.body, this.head, C.bodyLength, C.bodyHalfWidth + C.legStroke / 2, region);
    this.fitRod(this.leftLeg, this.hip(-1), C.legLength, C.legStroke / 2, region);
    this.fitRod(this.rightLeg, this.hip(1), C.legLength, C.legStroke / 2, region);
    this.constrainLegAngles();
  }

  private constrainLegAngles() {
    const bodyAngle = Math.atan2(-(this.body.x - this.head.x), this.body.y - this.head.y);
    for (const [foot, side] of [[this.leftLeg, -1], [this.rightLeg, 1]] as const) {
      const hip = this.hip(side);
      const current = Math.atan2(-(foot.x - hip.x), foot.y - hip.y);
      const limit = this.kick.phase === "idle" ? C.legMaxAngle : this.getTuning().ai.legStrikeAngle;
      const angle = bodyAngle + clamp(angleDelta(bodyAngle, current), -limit, limit);
      const offset = rotate(0, C.legLength, angle);
      if (Math.abs(angleDelta(current, angle)) > 0.000001) {
        foot.x = hip.x + offset.x;
        foot.y = hip.y + offset.y;
        foot.vx = hip.vx;
        foot.vy = hip.vy;
      }
    }
  }

  getCenter(): CharacterPoint {
    const bounds = this.extents();
    return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
  }

  getGroundPosition(): CharacterPoint { return { ...this.worldPosition }; }

  setKick(phase: "idle" | "windup" | "strike" | "recovery", progress: number, direction: -1 | 1) {
    this.kick = { phase, progress: clamp(progress, 0, 1), direction };
    if (phase !== "idle") this.direction = direction;
  }

  private groundFromScreen(point: CharacterPoint) {
    return this.plane ? screenToWorld(point, this.plane) : { ...point };
  }

  private clampGroundToCard(point: CharacterPoint) {
    const standingHeight = C.bodyLength + C.legLength + C.legStroke / 2;
    const backLine = this.plane ? worldToScreen({ x: 0, y: this.plane.bounds.bottom }, this.plane).y : standingHeight + HEAD_BOUNDARY_RADIUS;
    const head = projectRounded({ x: point.x, y: Math.max(backLine, point.y) - standingHeight }, HEAD_BOUNDARY_RADIUS, this.bounds);
    return { x: head.x, y: Math.min(this.bounds.height - C.legStroke / 2, head.y + standingHeight) };
  }

  private screenVelocityToWorld(velocity: CharacterPoint): CharacterPoint {
    if (!this.plane) return { ...velocity };
    const origin = this.plane.origin;
    const start = screenToWorld(origin, this.plane);
    const end = screenToWorld({ x: origin.x + velocity.x, y: origin.y + velocity.y }, this.plane);
    return { x: end.x - start.x, y: end.y - start.y };
  }

  configurePlane(plane: WorldPlane, freeArea: CharacterWorkArea, initialPosition?: CharacterPoint) {
    const previousGround = this.screenGround();
    this.plane = plane;
    this.freeArea = { ...freeArea };
    this.worldPosition = initialPosition ? { ...initialPosition } : this.worldPosition;
    this.worldPosition = this.groundFromScreen(this.clampGroundToCard(this.screenGround()));
    const ground = this.screenGround();
    if (initialPosition) {
      this.height = 0;
      this.applyPose(poseAt({ x: ground.x, y: this.standingHeadY() }, 0));
    } else {
      this.translate(ground.x - previousGround.x, ground.y - previousGround.y);
    }
    this.workTarget = null;
    this.flightTrail = [];
    this.landingEffect = null;
    this.trailFadeElapsed = null;
    if (this.state === "RECOVERING") this.beginRecovery();
    this.enforceRigidPose();
  }

  private effectiveWorkArea(): CharacterWorkArea | null {
    return this.workArea ?? this.freeArea;
  }

  private isInside(point: CharacterPoint, area: CharacterWorkArea) {
    return point.x >= area.left && point.x <= area.right && point.y >= area.top && point.y <= area.bottom;
  }

  private clampWorkPoint(point: CharacterPoint, area: CharacterWorkArea): CharacterPoint {
    return { x: clamp(point.x, area.left, area.right), y: clamp(point.y, area.top, area.bottom) };
  }

  private randomWorkTarget(area: CharacterWorkArea): CharacterPoint {
    return { x: randomBetween(area.left, area.right), y: randomBetween(area.top, area.bottom) };
  }

  setWorkArea(area: CharacterWorkArea | null) {
    const valid = area && [area.left, area.right, area.top, area.bottom].every(Number.isFinite) && area.right > area.left && area.bottom > area.top;
    const next = valid ? { ...area } : null;
    const previous = this.workArea;
    if ((!next && !previous) || (next && previous && next.left === previous.left && next.right === previous.right && next.top === previous.top && next.bottom === previous.bottom)) return;
    this.workArea = next;
    this.workTarget = null;
    if (this.state === "RECOVERING") this.beginRecovery();
  }

  setWorkTarget(point: CharacterPoint) {
    if (!this.workArea || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    const area = this.effectiveWorkArea();
    const next = area ? this.clampWorkPoint(point, area) : { ...point };
    const previous = this.workTarget;
    this.workTarget = next;
    if ((!previous || previous.x !== next.x || previous.y !== next.y) && (this.state === "IDLE" || this.state === "WALKING")) this.state = "WALKING";
  }

  private startFlight(planarScreenVelocity: CharacterPoint, verticalVelocity: number, landingWorld?: CharacterPoint) {
    this.verticalVelocity = verticalVelocity;
    this.flightElapsed = 0;
    const gravity = Math.max(this.getTuning().game.gravity, 0.000001);
    this.flightDuration = Math.max(C.fixedStep, (verticalVelocity + Math.sqrt(verticalVelocity ** 2 + 2 * gravity * this.height)) / gravity);
    if (landingWorld) {
      const screenEnd = this.plane ? worldToScreen(landingWorld, this.plane) : landingWorld;
      this.flightEnd = this.groundFromScreen(this.clampGroundToCard(screenEnd));
      this.planarVelocity = { x: (this.flightEnd.x - this.worldPosition.x) / this.flightDuration, y: (this.flightEnd.y - this.worldPosition.y) / this.flightDuration };
    } else {
      this.flightEnd = null;
      this.planarVelocity = this.screenVelocityToWorld(planarScreenVelocity);
    }
    this.recoveryElapsed = 0;
    this.recoveryStart = null;
    this.recoveryTarget = null;
    this.pointerSamples = [];
    this.constrainedSamples = [];
    this.kick.phase = "idle";
    this.flightTrail = [];
    this.landingEffect = null;
    this.state = "THROWN";
    this.startFlightEffects(planarScreenVelocity, verticalVelocity);
  }

  launch(velocity: CharacterPoint, recoverAfterLanding = true, landingWorld?: CharacterPoint): boolean {
    if (this.grabbedPointerId !== null || !Number.isFinite(velocity.x) || !Number.isFinite(velocity.y)) return false;
    const physics = this.getTuning().game;
    const next = { vx: clamp(velocity.x, -physics.maxThrowVelocity, physics.maxThrowVelocity), vy: clamp(velocity.y, -physics.maxThrowVelocity, physics.maxThrowVelocity) };
    if (landingWorld) {
      const destination = this.clampGroundToCard(this.plane ? worldToScreen(landingWorld, this.plane) : landingWorld);
      const source = this.screenGround();
      const tuning = this.getTuning();
      const duration = Math.max(tuning.ai.minimumFlightDuration, Math.hypot(destination.x - source.x, destination.y - source.y) / tuning.ai.flightPlanarSpeed, 2 * Math.max(0, -next.vy) / tuning.game.gravity);
      // Choose airtime from travel distance, then solve the same gravity equation as a throw.
      next.vy = -(physics.gravity * duration / 2 - this.height / duration);
      next.vx = (destination.x - source.x) / duration;
    }
    for (const point of this.particles()) { point.vx = next.vx; point.vy = next.vy; }
    this.rotation = Math.atan2(-(this.body.x - this.head.x), this.body.y - this.head.y);
    this.angularVelocity = clamp(next.vx * C.throwSpinScale, -C.maxAngularVelocity, C.maxAngularVelocity);
    void recoverAfterLanding;
    this.startFlight({ x: next.vx, y: 0 }, Math.max(0, -next.vy), landingWorld);
    this.enforceRigidPose();
    return true;
  }

  resize(bounds: CharacterBounds) {
    this.bounds = bounds;
    this.enforceRigidPose();
  }

  grab(pointerId: number, point: CharacterPoint, time: number) {
    if (this.grabbedPointerId !== null) return false;
    this.grabbedPointerId = pointerId;
    this.grabOffset = { x: point.x - this.head.x, y: point.y - this.head.y };
    this.grabStartPointer = { ...point };
    this.grabStartHeight = this.height;
    this.grabTarget = { x: this.head.x, y: this.head.y };
    this.pointerSamples = [{ ...point, time }];
    this.lastMotionTime = time;
    this.constrainedSamples = [{ ...this.grabTarget, time }];
    this.lastConstrainedMotionTime = time;
    // Catching an airborne toy preserves its position; grounded grabs never auto-lift.
    this.state = this.height > 0 ? "CARRYING" : "GRABBED";
    this.angularVelocity = 0;
    this.verticalVelocity = 0;
    this.planarVelocity = { x: 0, y: 0 };
    this.flightEnd = null;
    this.kick.phase = "idle";
    this.flightTrail = [];
    this.landingEffect = null;
    this.flightEffectsEligible = false;
    this.flightEffectsStarted = false;
    this.trailFadeElapsed = null;
    this.recoveryElapsed = 0;
    this.recoveryStart = null;
    this.recoveryTarget = null;
    return true;
  }

  private updateGrabTarget(point: CharacterPoint) {
    const dx = point.x - this.grabStartPointer.x;
    const dy = point.y - this.grabStartPointer.y;
    const horizontalShare = Math.abs(dx) / Math.max(1, Math.abs(dx) + Math.abs(dy));
    const tuning = this.getTuning().game;
    const depthShare = tuning.grabDepthShareMin + (tuning.grabDepthShareMax - tuning.grabDepthShareMin) * horizontalShare;
    const requestedHeight = Math.max(0, this.grabStartHeight - dy * (1 - depthShare));
    const standingHeight = C.bodyLength + C.legLength + C.legStroke / 2;
    const target = projectRounded({ x: point.x - this.grabOffset.x, y: point.y - this.grabOffset.y }, HEAD_BOUNDARY_RADIUS, this.bounds);
    const ground = this.clampGroundToCard({ x: target.x, y: target.y + standingHeight + requestedHeight });
    this.worldPosition = this.groundFromScreen(ground);
    this.height = requestedHeight <= 1e-7 ? 0 : Math.max(0, ground.y - standingHeight - target.y);
    if (this.height > 0 && Math.abs(dy) >= this.getTuning().game.grabLiftThreshold) this.state = "CARRYING";
    this.grabTarget = { x: ground.x, y: this.standingHeadY() - this.height };
  }

  moveGrab(pointerId: number, point: CharacterPoint, time: number) {
    if (this.grabbedPointerId !== pointerId) return;
    const previous = this.pointerSamples[this.pointerSamples.length - 1];
    const sampleTime = Math.max(time, previous?.time ?? time);
    if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) > C.pointerMotionThreshold) this.lastMotionTime = sampleTime;
    this.pointerSamples.push({ ...point, time: sampleTime });
    this.pointerSamples = this.pointerSamples.filter((sample) => sampleTime - sample.time <= this.getTuning().game.pointerSampleWindowMs).slice(-C.pointerSampleLimit);
    this.updateGrabTarget(point);
    const previousTarget = this.constrainedSamples[this.constrainedSamples.length - 1];
    if (!previousTarget || Math.hypot(this.grabTarget.x - previousTarget.x, this.grabTarget.y - previousTarget.y) > C.pointerMotionThreshold) this.lastConstrainedMotionTime = sampleTime;
    this.constrainedSamples.push({ ...this.grabTarget, time: sampleTime });
    this.constrainedSamples = this.constrainedSamples.filter((sample) => sampleTime - sample.time <= this.getTuning().game.pointerSampleWindowMs).slice(-C.pointerSampleLimit);
  }

  rebaseGrab(point: CharacterPoint, time: number) {
    if (this.grabbedPointerId === null) return;
    this.grabOffset = { x: point.x - this.head.x, y: point.y - this.head.y };
    this.grabStartPointer = { ...point };
    this.grabStartHeight = this.height;
    this.pointerSamples = [{ ...point, time }];
    this.lastMotionTime = time;
    this.grabTarget = { x: this.head.x, y: this.head.y };
    this.constrainedSamples = [{ ...this.grabTarget, time }];
    this.lastConstrainedMotionTime = time;
    this.head.vx = 0;
    this.head.vy = 0;
    this.enforceRigidPose();
  }

  private pointerVelocity(time: number, constrained = false) {
    const sampleWindow = this.getTuning().game.pointerSampleWindowMs;
    const samples = (constrained ? this.constrainedSamples : this.pointerSamples).filter((sample) => time - sample.time <= sampleWindow);
    if (samples.length < 2) return { vx: 0, vy: 0 };
    let weightSum = 0;
    let meanTime = 0;
    let meanX = 0;
    let meanY = 0;
    samples.forEach((sample, index) => {
      const weight = index + 1;
      weightSum += weight;
      meanTime += ((sample.time - time) / 1000) * weight;
      meanX += sample.x * weight;
      meanY += sample.y * weight;
    });
    meanTime /= weightSum;
    meanX /= weightSum;
    meanY /= weightSum;
    let variance = 0;
    let covarianceX = 0;
    let covarianceY = 0;
    samples.forEach((sample, index) => {
      const delta = (sample.time - time) / 1000 - meanTime;
      const weight = index + 1;
      variance += delta * delta * weight;
      covarianceX += delta * (sample.x - meanX) * weight;
      covarianceY += delta * (sample.y - meanY) * weight;
    });
    if (variance < 0.000001) return { vx: 0, vy: 0 };
    const decay = clamp(1 - (time - (constrained ? this.lastConstrainedMotionTime : this.lastMotionTime)) / sampleWindow, 0, 1);
    const velocity = { vx: covarianceX / variance * decay, vy: covarianceY / variance * decay };
    const tuning = this.getTuning().game;
    limitVelocity(velocity, tuning.maxThrowVelocity / Math.max(tuning.throwHorizontalVelocityTransfer, 0.000001));
    return velocity;
  }

  release(pointerId: number, time: number, cancelled = false) {
    if (this.grabbedPointerId !== pointerId) return;
    const pointer = cancelled ? { vx: 0, vy: 0 } : this.pointerVelocity(time, true);
    const tuning = this.getTuning().game;
    const velocity = { vx: clamp(pointer.vx * tuning.throwHorizontalVelocityTransfer, -tuning.maxThrowVelocity, tuning.maxThrowVelocity), vy: clamp(pointer.vy * tuning.throwVerticalVelocityTransfer, -tuning.maxThrowVelocity, tuning.maxThrowVelocity) };
    const previousHeadVelocity = { x: this.head.vx, y: this.head.vy };
    this.head.x = this.grabTarget.x;
    this.head.y = this.grabTarget.y;
    this.enforceRigidPose();
    this.grabbedPointerId = null;
    if (this.height <= 1e-7 && velocity.vy >= -1e-7) {
      this.pointerSamples = [];
      this.constrainedSamples = [];
      this.startWalkingFromFloor();
      return;
    }
    for (const point of this.particles()) {
      point.vx = velocity.vx + (point.vx - previousHeadVelocity.x) * C.relativeReleaseVelocity;
      point.vy = velocity.vy + (point.vy - previousHeadVelocity.y) * C.relativeReleaseVelocity;
      limitVelocity(point, tuning.maxThrowVelocity);
    }
    this.rotation = Math.atan2(-(this.body.x - this.head.x), this.body.y - this.head.y);
    this.angularVelocity = clamp(velocity.vx * C.throwSpinScale, -C.maxAngularVelocity, C.maxAngularVelocity);
    // Upward flicks primarily add lift; screen-plane drift is deliberately much weaker.
    this.startFlight({ x: velocity.vx, y: pointer.vy * tuning.throwDepthMultiplier }, -velocity.vy);
    if (cancelled) this.flightEffectsEligible = false;
  }

  cancelGrab() {
    const pointerId = this.grabbedPointerId;
    if (pointerId === null) return false;
    this.release(pointerId, 0, true);
    return true;
  }

  private startFlightEffects(planarScreenVelocity: CharacterPoint, verticalVelocity: number) {
    const trail = this.getTuning().trail;
    this.flightEffectsEligible = Math.hypot(planarScreenVelocity.x, planarScreenVelocity.y - verticalVelocity) >= trail.minVelocity || this.height >= trail.minDropHeight;
    this.flightEffectsStarted = false;
    this.trailFadeElapsed = null;
  }

  private updateTrail(screenSpeed: number) {
    if (!this.flightEffectsEligible) return;
    const trail = this.getTuning().trail;
    if (!this.flightEffectsStarted && screenSpeed < trail.minVelocity) return;
    this.flightEffectsStarted = true;
    const last = this.flightTrail[this.flightTrail.length - 1];
    if (last && last.age < trail.historyDuration / (trail.pointHistory - 1)) return;
    this.flightTrail.push({ x: this.head.x, y: this.head.y, age: 0 });
    if (this.flightTrail.length > trail.pointHistory) this.flightTrail.shift();
  }

  private finishTrail() {
    if (this.flightEffectsStarted) {
      const last = this.flightTrail[this.flightTrail.length - 1];
      if (!last || Math.hypot(last.x - this.head.x, last.y - this.head.y) > 0.5) {
        this.flightTrail.push({ x: this.head.x, y: this.head.y, age: 0 });
        if (this.flightTrail.length > this.getTuning().trail.pointHistory) this.flightTrail.shift();
      }
    }
    this.trailFadeElapsed = 0;
  }

  private spawnLandingEffect() {
    if (this.flightEffectsStarted) this.landingEffect = { point: this.screenGround(), elapsed: 0 };
  }

  trailOpacity(age: number) {
    const trail = this.getTuning().trail;
    const fade = this.trailFadeElapsed === null ? 1 : Math.max(0, 1 - this.trailFadeElapsed / trail.fadeDuration);
    return trail.opacity * Math.max(0, 1 - age / trail.historyDuration) * fade;
  }

  private updateEffects(dt: number) {
    for (const point of this.flightTrail) point.age += dt;
    const tuning = this.getTuning();
    this.flightTrail = this.flightTrail.filter((point) => point.age <= tuning.trail.historyDuration);
    if (this.trailFadeElapsed !== null) {
      this.trailFadeElapsed += dt;
      if (this.trailFadeElapsed >= tuning.trail.fadeDuration) this.flightTrail = [];
    }
    if (this.landingEffect) {
      this.landingEffect.elapsed += dt;
      if (this.landingEffect.elapsed >= tuning.landing.duration) this.landingEffect = null;
    }
  }

  update(dt: number, time: number, reducedMotion: boolean) {
    const previousHead = { x: this.head.x, y: this.head.y };
    this.updateEffects(dt);
    if (this.state === "IDLE" || this.state === "WALKING") {
      this.updateWalking(dt, reducedMotion);
    } else if (this.grabbedPointerId !== null) {
      const velocity = this.pointerVelocity(time, true);
      this.head.x = this.grabTarget.x;
      this.head.y = this.grabTarget.y;
      this.head.vx = velocity.vx;
      this.head.vy = velocity.vy;
      spring(this.body, { x: this.head.x, y: this.head.y + C.bodyLength }, { x: 0, y: 0 }, C.bodyStiffness, C.bodyDamping, 0, dt);
      constrainLength(this.body, this.head, C.bodyLength);
      const bodyAngle = clamp(Math.atan2(-(this.body.x - this.head.x), this.body.y - this.head.y), -C.carryBodyMaxAngle, C.carryBodyMaxAngle);
      const bodyOffset = rotate(0, C.bodyLength, bodyAngle);
      this.body.x = this.head.x + bodyOffset.x;
      this.body.y = this.head.y + bodyOffset.y;
      this.updateLegs(dt, bodyAngle, false, true);
    } else if (this.state === "FALLEN") {
      this.recoveryElapsed += dt;
      if (this.recoveryElapsed >= C.scriptedFallDuration) this.beginRecovery();
    } else if (this.state === "RECOVERING") {
      this.updateRecovery(dt);
    } else {
      this.updateFlight(dt);
    }
    this.enforceRigidPose();
    if (this.state === "IDLE" || this.state === "WALKING") this.applyKickPose();
    // Sample the position actually drawn, after every pose constraint has been applied.
    if (this.state === "THROWN") this.updateTrail(Math.hypot(this.head.x - previousHead.x, this.head.y - previousHead.y) / dt);
  }

  private updateWalking(dt: number, reducedMotion: boolean) {
    const area = this.effectiveWorkArea();
    if (!area) return;
    const returning = !this.isInside(this.worldPosition, area);
    if (returning) {
      // Outside the market/assigned area, walk there without snapping the anchor.
      this.state = "WALKING";
      this.workTarget = { x: (area.left + area.right) / 2, y: (area.top + area.bottom) / 2 };
    } else {
      this.workTarget = this.workTarget ? this.clampWorkPoint(this.workTarget, area) : this.randomWorkTarget(area);
      if (this.state === "WALKING") {
        this.movementTimer -= dt;
        if (this.movementTimer <= 0) {
          this.state = "IDLE";
          this.idleTimer = randomBetween(C.workIdleDurationMin, C.workIdleDurationMax);
        }
      } else {
        this.idleTimer -= dt;
        if (this.idleTimer <= 0) {
          this.state = "WALKING";
          this.movementTimer = randomBetween(C.workMoveDurationMin, C.workMoveDurationMax);
          this.workTarget = this.randomWorkTarget(area);
        }
      }
    }
    const previousGround = this.screenGround();
    if (this.state === "WALKING" && this.workTarget && this.kick.phase === "idle") {
      const dx = this.workTarget.x - this.worldPosition.x;
      const dy = this.workTarget.y - this.worldPosition.y;
      const projectedTarget = this.plane ? worldToScreen(this.workTarget, this.plane) : this.workTarget;
      const distance = Math.hypot(projectedTarget.x - previousGround.x, projectedTarget.y - previousGround.y);
      if (distance <= C.workArrivalThreshold) {
        this.state = "IDLE";
        this.idleTimer = randomBetween(C.workIdleDurationMin, C.workIdleDurationMax);
        this.workTarget = null;
      } else {
        const fraction = Math.min(1, this.walkingSpeed * C.workSpeedScale * dt / distance);
        const candidate = { x: this.worldPosition.x + dx * fraction, y: this.worldPosition.y + dy * fraction };
        const workPoint = returning ? candidate : this.clampWorkPoint(candidate, area);
        this.worldPosition = this.groundFromScreen(this.clampGroundToCard(this.plane ? worldToScreen(workPoint, this.plane) : workPoint));
        if (projectedTarget.x !== previousGround.x) this.direction = projectedTarget.x > previousGround.x ? 1 : -1;
        this.walkPhase += dt * C.walkFrequency * C.workSpeedScale;
      }
    }
    const ground = this.screenGround();
    const walking = this.state === "WALKING" && this.kick.phase === "idle";
    this.head.vx = (ground.x - previousGround.x) / dt;
    this.head.vy = (ground.y - previousGround.y) / dt;
    this.head.x = ground.x;
    this.head.y = this.standingHeadY() - (walking && !reducedMotion ? Math.abs(Math.sin(this.walkPhase * 2)) * C.headBob : 0);
    this.height = 0;
    this.rotation = 0;
    const sway = walking && !reducedMotion ? Math.sin(this.walkPhase) * C.bodySway : 0;
    spring(this.body, { x: this.head.x + sway, y: this.head.y + C.bodyLength }, { x: this.head.vx, y: this.head.vy }, C.bodyStiffness, C.bodyDamping, 0, dt);
    constrainLength(this.body, this.head, C.bodyLength);
    this.updateLegs(dt, 0, walking, false);
  }

  private applyKickPose() {
    const { phase, progress, direction } = this.kick;
    if (phase === "idle") return;
    const eased = progress * progress * (3 - 2 * progress);
    let bodyAngle = 0;
    let kickAngle = 0;
    if (phase === "windup") {
      bodyAngle = -direction * this.getTuning().ai.bodyWindupAngle * eased;
      kickAngle = direction * this.getTuning().ai.legWindupAngle * eased;
    } else if (phase === "strike") {
      const ai = this.getTuning().ai;
      bodyAngle = direction * (-ai.bodyWindupAngle + (ai.bodyWindupAngle + ai.bodyStrikeAngle) * eased);
      kickAngle = -direction * ai.legStrikeAngle;
    } else {
      bodyAngle = direction * this.getTuning().ai.bodyStrikeAngle * (1 - eased);
      kickAngle = -direction * this.getTuning().ai.legStrikeAngle * (1 - eased);
    }
    const ground = this.screenGround();
    const standingHeight = C.bodyLength + C.legLength + C.legStroke / 2;
    const head = { x: ground.x + Math.sin(bodyAngle) * standingHeight, y: ground.y - Math.cos(bodyAngle) * standingHeight };
    const leftAngle = direction < 0 ? bodyAngle + kickAngle : 0;
    const rightAngle = direction > 0 ? bodyAngle + kickAngle : 0;
    this.applyPose(poseWithAngles(head, bodyAngle, leftAngle, rightAngle, bodyAngle));
    for (const point of this.particles()) { point.vx = 0; point.vy = 0; }
    this.enforceRigidPose();
  }

  private updateLegs(dt: number, angle: number, walking: boolean, grabbed: boolean) {
    const gravity = this.state === "THROWN" ? this.getTuning().game.gravity : 0;
    for (const [foot, side] of [[this.leftLeg, -1], [this.rightLeg, 1]] as const) {
      const phase = Math.sin(this.walkPhase) * side;
      const hip = this.hip(side);
      const legAngle = angle - (walking ? Math.asin(clamp(phase * C.walkStride / C.legLength, -1, 1)) * this.direction : 0);
      const offset = rotate(0, C.legLength, legAngle);
      spring(foot, { x: hip.x + offset.x, y: hip.y + offset.y }, grabbed ? { x: 0, y: 0 } : { x: hip.vx, y: hip.vy }, C.legStiffness, C.legDamping, gravity, dt);
      constrainLength(foot, hip, C.legLength);
    }
  }

  private updateFlight(dt: number) {
    dt = Math.min(dt, Math.max(0, this.flightDuration - this.flightElapsed));
    const previousHead = { x: this.head.x, y: this.head.y };
    this.flightElapsed += dt;
    const next = { x: this.worldPosition.x + this.planarVelocity.x * dt, y: this.worldPosition.y + this.planarVelocity.y * dt };
    const desiredGround = this.plane ? worldToScreen(next, this.plane) : next;
    const boundedGround = this.clampGroundToCard(desiredGround);
    this.worldPosition = this.groundFromScreen(boundedGround);
    if (Math.abs(desiredGround.x - boundedGround.x) > 0.000001 || Math.abs(desiredGround.y - boundedGround.y) > 0.000001) {
      const screenVelocity = this.plane
        ? { x: (this.planarVelocity.x + this.planarVelocity.y * this.plane.depthSkewX) * this.plane.scaleX, y: -this.planarVelocity.y * this.plane.scaleY }
        : this.planarVelocity;
      if (Math.abs(desiredGround.x - boundedGround.x) > 0.000001) screenVelocity.x *= -C.wallBounce;
      if (Math.abs(desiredGround.y - boundedGround.y) > 0.000001) screenVelocity.y = 0;
      this.planarVelocity = this.screenVelocityToWorld(screenVelocity);
      this.flightEnd = null;
    }
    const gravity = this.getTuning().game.gravity;
    this.height += this.verticalVelocity * dt - gravity * dt * dt / 2;
    this.verticalVelocity -= gravity * dt;
    this.angularVelocity *= Math.exp(-C.angularDrag * dt);
    this.rotation += this.angularVelocity * dt;
    const ground = this.screenGround();
    this.head.x = ground.x;
    this.head.y = this.standingHeadY() - Math.max(0, this.height);
    this.head.vx = dt > 0 ? (this.head.x - previousHead.x) / dt : 0;
    this.head.vy = dt > 0 ? (this.head.y - previousHead.y) / dt : 0;
    const bodyOffset = rotate(0, C.bodyLength, this.rotation);
    spring(this.body, { x: this.head.x + bodyOffset.x, y: this.head.y + bodyOffset.y }, { x: this.head.vx, y: this.head.vy }, C.bodyStiffness, C.bodyDamping, gravity, dt);
    constrainLength(this.body, this.head, C.bodyLength);
    this.updateLegs(dt, this.rotation, false, false);
    if ((this.height <= 0 && this.verticalVelocity <= 0) || this.flightElapsed >= this.flightDuration - 1e-9) {
      if (this.flightEnd && this.flightElapsed >= this.flightDuration) this.worldPosition = { ...this.flightEnd };
      this.height = 0;
      this.verticalVelocity = 0;
      this.planarVelocity = { x: 0, y: 0 };
      this.impactCount += 1;
      this.finishTrail();
      this.spawnLandingEffect();
      this.beginFallen();
    }
  }

  private extents() {
    const discs = [
      { point: this.head, radius: HEAD_BOUNDARY_RADIUS },
      { point: this.body, radius: C.bodyHalfWidth + C.legStroke / 2 },
      { point: this.leftLeg, radius: C.legStroke / 2 },
      { point: this.rightLeg, radius: C.legStroke / 2 },
    ];
    return {
      minX: Math.min(...discs.map(({ point, radius }) => point.x - radius)),
      maxX: Math.max(...discs.map(({ point, radius }) => point.x + radius)),
      minY: Math.min(...discs.map(({ point, radius }) => point.y - radius)),
      maxY: Math.max(...discs.map(({ point, radius }) => point.y + radius)),
    };
  }

  private translate(x: number, y: number) {
    for (const point of this.particles()) { point.x += x; point.y += y; }
  }

  private standingHeadPoint(): CharacterPoint {
    const ground = this.screenGround();
    return { x: ground.x, y: this.standingHeadY() };
  }

  private capturePose(): CharacterPose {
    return { head: { ...this.head }, body: { ...this.body }, leftLeg: { ...this.leftLeg }, rightLeg: { ...this.rightLeg }, rotation: this.rotation };
  }

  private applyPose(pose: CharacterPose) {
    for (const key of ["head", "body", "leftLeg", "rightLeg"] as const) {
      this[key].x = pose[key].x;
      this[key].y = pose[key].y;
    }
    this.rotation = pose.rotation;
  }

  private beginFallen() {
    const side = Math.sign(this.angularVelocity || this.head.vx) || this.direction;
    this.state = "FALLEN";
    this.recoveryElapsed = 0;
    this.applyPose(poseAt(this.head, side * Math.PI / 2));
    this.translate(0, this.screenGround().y - this.extents().maxY);
    for (const point of this.particles()) { point.vx = 0; point.vy = 0; }
    this.angularVelocity = 0;
    this.enforceRigidPose();
  }

  private beginRecovery() {
    this.state = "RECOVERING";
    this.recoveryElapsed = 0;
    this.recoveryStart = this.capturePose();
    this.recoveryTarget = poseAt(this.standingHeadPoint(), 0);
  }

  private updateRecovery(dt: number) {
    const start = this.recoveryStart;
    const target = this.recoveryTarget;
    if (!start || !target) return;
    this.recoveryElapsed += dt;
    const progress = Math.min(1, this.recoveryElapsed / C.scriptedRecoveryDuration);
    const eased = 1 - (1 - progress) ** 3;
    const startBodyAngle = Math.atan2(-(start.body.x - start.head.x), start.body.y - start.head.y);
    const targetBodyAngle = Math.atan2(-(target.body.x - target.head.x), target.body.y - target.head.y);
    const bodyAngle = startBodyAngle + angleDelta(startBodyAngle, targetBodyAngle) * eased;
    const legAngle = (side: -1 | 1) => {
      const key = side === -1 ? "leftLeg" : "rightLeg";
      const startHip = rotate(side * C.bodyHalfWidth, C.bodyLength, startBodyAngle);
      const targetHip = rotate(side * C.bodyHalfWidth, C.bodyLength, targetBodyAngle);
      const from = Math.atan2(-(start[key].x - start.head.x - startHip.x), start[key].y - start.head.y - startHip.y);
      const to = Math.atan2(-(target[key].x - target.head.x - targetHip.x), target[key].y - target.head.y - targetHip.y);
      return from + angleDelta(from, to) * eased;
    };
    this.applyPose(poseWithAngles({ x: start.head.x + (target.head.x - start.head.x) * eased, y: start.head.y + (target.head.y - start.head.y) * eased }, bodyAngle, legAngle(-1), legAngle(1), start.rotation + angleDelta(start.rotation, target.rotation) * eased));
    for (const point of this.particles()) { point.vx = 0; point.vy = 0; }
    if (progress === 1) this.startWalkingFromFloor();
  }

  private startWalkingFromFloor() {
    this.applyPose(poseAt(this.standingHeadPoint(), 0));
    for (const point of this.particles()) { point.vx = 0; point.vy = 0; }
    this.rotation = 0;
    this.angularVelocity = 0;
    this.height = 0;
    this.state = "WALKING";
    this.movementTimer = randomBetween(C.workMoveDurationMin, C.workMoveDurationMax);
    this.workTarget = null;
    this.recoveryElapsed = 0;
    this.recoveryStart = null;
    this.recoveryTarget = null;

    this.flightEnd = null;
  }
}
