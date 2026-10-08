"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { CHARACTER_CONFIG, type CharacterController, type CharacterBounds, type CharacterPoint } from "./character-controller";
import { GAME_CONFIG, HINT_CONFIG, METRIC_ZONE_CONFIG } from "./ceo-simulator/config";
import type { CeoRuntimeTuning } from "./ceo-simulator/runtime-tuning";
import { CeoGame } from "./ceo-simulator/game-state";
import { entityActivity, type GameEntity } from "./ceo-simulator/entities";
import { worldToScreen, zonePolygon, type FieldLayout, type WorldPlane } from "./ceo-simulator/zones";
import styles from "./character-playground.module.css";

type Props = { active: boolean; resetWhenHidden: boolean; getTuning: () => CeoRuntimeTuning; restartCommand: number };
type CharacterNodes = {
  root: SVGGElement | null;
  head: SVGGElement | null;
  body: SVGPathElement | null;
  leftLeg: SVGPathElement | null;
  rightLeg: SVGPathElement | null;
  hitArea: SVGRectElement | null;
  shadow: SVGEllipseElement | null;
};
type ZoneNodes = { polygon: SVGPolygonElement | null; label: SVGTextElement | null; requirement: SVGTextElement | null; aiMarker: SVGTextElement | null };
type MetricNodes = { track: HTMLDivElement | null; fill: HTMLSpanElement | null; segments: (HTMLSpanElement | null)[] };
type OwnedPointer = { index: number; clientX: number; clientY: number };
type Runtime = {
  setActivity: (active: boolean, resetWhenHidden: boolean) => void;
  down: (index: number, event: ReactPointerEvent<SVGRectElement>) => void;
  move: (event: ReactPointerEvent<SVGSVGElement>) => void;
  up: (event: ReactPointerEvent<SVGSVGElement>, cancelled: boolean) => void;
  restart: () => void;
};

const C = CHARACTER_CONFIG;
const ENTITY_SLOTS = Array.from({ length: GAME_CONFIG.humanCount + GAME_CONFIG.robotCount }, (_, index) => index);
const METRICS = [{ id: "speed", label: "Скорость" }, { id: "quality", label: "Качество" }, { id: "budget", label: "Бюджет" }] as const;
const METRIC_ZONE_COLORS = ["#d58b8c", "#e2c66f", "#87b895"] as const;
const REPORT_ITEMS = [
  { id: "averageSpeed", label: "Средняя скорость" },
  { id: "averageQuality", label: "Среднее качество" },
  { id: "averageBudget", label: "Средний бюджет" },
  { id: "income", label: "Доход" },
  { id: "finalActiveHumans", label: "Людей в работе" },
  { id: "finalActiveAI", label: "AI в работе" },
] as const;
const HEAD_SCALE = C.headRadius / 15;
const HEAD_PATH = "M -3 -15 C -8 -16 -13 -9 -15 -3 C -18 4 -10 15 -2 15 C 7 17 14 10 15 2 C 15 -5 10 -13 5 -14 Z";
const ROBOT_PATH = "M -10 -14 H 10 Q 15 -14 15 -9 V 10 Q 15 15 10 15 H -10 Q -15 15 -15 10 V -9 Q -15 -14 -10 -14 Z";

function setText(node: Element | null, text: string) {
  if (node && node.textContent !== text) node.textContent = text;
}
function setAttribute(node: Element | null, name: string, value: string) {
  if (node && node.getAttribute(name) !== value) node.setAttribute(name, value);
}
function drawCharacter(nodes: CharacterNodes, entity: GameEntity, plane: WorldPlane, tuning: CeoRuntimeTuning) {
  const character = entity.controller;
  const { head, body, leftLeg, rightLeg } = character;
  const length = Math.hypot(body.x - head.x, body.y - head.y) || 1;
  const down = { x: (body.x - head.x) / length, y: (body.y - head.y) / length };
  const across = { x: down.y, y: -down.x };
  const neck = { x: head.x + down.x * C.neckOffset, y: head.y + down.y * C.neckOffset };
  const width = C.bodyHalfWidth;
  nodes.body?.setAttribute("d", "M " + (neck.x - across.x * width) + " " + (neck.y - across.y * width) + " L " + (body.x - across.x * width) + " " + (body.y - across.y * width) + " L " + (body.x + across.x * width) + " " + (body.y + across.y * width) + " L " + (neck.x + across.x * width) + " " + (neck.y + across.y * width) + " Z");
  for (const [node, foot, side] of [[nodes.leftLeg, leftLeg, -1], [nodes.rightLeg, rightLeg, 1]] as const) {
    const origin = { x: body.x + across.x * width * side, y: body.y + across.y * width * side };
    const path = "M " + origin.x + " " + origin.y + " Q " + ((origin.x + foot.x) / 2) + " " + ((origin.y + foot.y) / 2) + " " + foot.x + " " + foot.y;
    node?.setAttribute("d", path);
  }
  nodes.head?.setAttribute("transform", "translate(" + head.x + " " + head.y + ") rotate(" + (character.rotation * 180 / Math.PI) + ")");
  nodes.hitArea?.setAttribute("x", String(head.x - C.size / 2));
  nodes.hitArea?.setAttribute("y", String(head.y - C.size / 2));
  const role = entity.type === "human" ? entity.role : null;
  setAttribute(nodes.root, "data-role", role ?? "");
  setAttribute(nodes.root, "data-state", character.state);
  setAttribute(nodes.root, "data-activity", entityActivity(entity));
  setAttribute(nodes.root, "data-zone", entity.assignedZoneId ?? "");
  const ground = worldToScreen(character.getGroundPosition(), plane);
  const lift = Math.min(tuning.shadow.maxHeightRatio, character.height / tuning.game.grabLiftThreshold);
  const shadowScale = 1 + lift * tuning.shadow.growth;
  setAttribute(nodes.shadow, "cx", String(ground.x));
  setAttribute(nodes.shadow, "cy", String(ground.y));
  setAttribute(nodes.shadow, "rx", String(C.headRadius * shadowScale));
  setAttribute(nodes.shadow, "ry", String(C.legLength * shadowScale * plane.scaleY / plane.scaleX));
  setAttribute(nodes.shadow, "opacity", String(character.height > 0 ? tuning.shadow.opacity / shadowScale : 0));
  nodes.root?.removeAttribute("visibility");
}

function drawTrail(context: CanvasRenderingContext2D, character: CharacterController, tuning: CeoRuntimeTuning) {
  const trail = character.flightTrail;
  context.lineWidth = tuning.trail.strokeWidth;
  for (let index = 1; index < trail.length; index += 1) {
    const from = trail[index - 1], to = trail[index];
    context.globalAlpha = character.trailOpacity((from.age + to.age) / 2);
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  }
}

function drawLandingEffect(context: CanvasRenderingContext2D, character: CharacterController, tuning: CeoRuntimeTuning) {
  const landing = character.landingEffect;
  if (!landing) return;
  context.lineWidth = tuning.landing.strokeWidth;
  const diagonalLength = tuning.landing.lineLength / Math.SQRT2;
  const halfCenterGap = tuning.landing.centerGap / 2;
  const progress = Math.min(1, landing.elapsed / tuning.landing.duration);
  for (const direction of [-1, 1]) {
    const offsetX = direction * diagonalLength;
    const offsetY = -diagonalLength;
    const startX = landing.point.x + direction * halfCenterGap + offsetX * progress;
    const startY = landing.point.y + offsetY * progress;
    context.globalAlpha = tuning.landing.opacity * (1 - progress);
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(startX + offsetX, startY + offsetY);
    context.stroke();
  }
}

export function CharacterPlayground({ active, resetWhenHidden, getTuning, restartCommand }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<SVGSVGElement>(null);
  const trailEffectsRef = useRef<HTMLCanvasElement>(null);
  const landingEffectsRef = useRef<HTMLCanvasElement>(null);
  const characterLayerRef = useRef<SVGGElement>(null);
  const heldOverlayRef = useRef<SVGSVGElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const bubbleTextRef = useRef<HTMLParagraphElement>(null);
  const bubbleWarningRef = useRef<HTMLSpanElement>(null);
  const countdownRef = useRef<HTMLSpanElement>(null);
  const aiCountRef = useRef<HTMLSpanElement>(null);
  const verdictRef = useRef<HTMLParagraphElement>(null);
  const metricsRef = useRef<MetricNodes[]>(METRICS.map(() => ({ track: null, fill: null, segments: [null, null, null] })));
  const reportRef = useRef<HTMLDivElement>(null);
  const reportValuesRef = useRef<(HTMLElement | null)[]>(REPORT_ITEMS.map(() => null));
  const restartRef = useRef<HTMLButtonElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const nodesRef = useRef<CharacterNodes[]>(ENTITY_SLOTS.map(() => ({ root: null, head: null, body: null, leftLeg: null, rightLeg: null, hitArea: null, shadow: null })));
  const heldNodesRef = useRef<CharacterNodes[]>(ENTITY_SLOTS.map(() => ({ root: null, head: null, body: null, leftLeg: null, rightLeg: null, hitArea: null, shadow: null })));
  const zonesRef = useRef<ZoneNodes[]>(GAME_CONFIG.departments.map(() => ({ polygon: null, label: null, requirement: null, aiMarker: null })));

  useEffect(() => {
    const field = fieldRef.current;
    const root = rootRef.current;
    const header = headerRef.current;
    if (!field || !root || !header) return;
    const trailEffects = trailEffectsRef.current;
    const landingEffects = landingEffectsRef.current;
    const trailEffectsContext = trailEffects?.getContext("2d") ?? null;
    const landingEffectsContext = landingEffects?.getContext("2d") ?? null;
    const frame = root.closest<HTMLElement>("[data-game-frame]");
    let game: CeoGame | null = null;
    let bounds: CharacterBounds = { width: 0, height: 0 };
    let layout: FieldLayout | null = null;
    let enabled = false;
    let pendingReset = false;
    let animationFrame = 0;
    let previousTime = 0;
    let accumulator = 0;
    let disposed = false;
    let impactAnimation: Animation | null = null;
    let bubbleSignature = "";
    let bubbleDesiredSignature = "";
    let bubbleToken = 0;
    let bubbleTimer = 0;
    let bubbleFrame = 0;
    const previousRequirementState = new Map<string, boolean>();
    const successTimers = new Map<string, number>();
    const interfaceTextStates = new Map<string, { desired: string; displayed: string; timer: number; frame: number }>();
    const pointers = new Map<number, OwnedPointer>();
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionPreference.matches;
    root.style.setProperty("--hint-pulse-duration", HINT_CONFIG.pulseDurationMs + "ms");
    root.style.setProperty("--hint-opacity-min", String(HINT_CONFIG.opacityMin));
    root.style.setProperty("--hint-opacity-max", String(HINT_CONFIG.opacityMax));

    function updateBubble() {
      const popup = game?.contextualPopup ?? null;
      const signature = popup ? `${popup.bubble}\u0000${popup.warning}\u0000${popup.text}` : "";
      if (signature === bubbleDesiredSignature) return;
      bubbleDesiredSignature = signature;
      const token = ++bubbleToken;
      if (bubbleTimer) window.clearTimeout(bubbleTimer);
      if (bubbleFrame) cancelAnimationFrame(bubbleFrame);
      const reveal = () => {
        if (disposed || token !== bubbleToken || !popup) return;
        setAttribute(bubbleRef.current, "data-kind", popup.bubble);
        setText(bubbleTextRef.current, popup.text);
        setText(bubbleWarningRef.current, popup.warning);
        bubbleSignature = signature;
        bubbleFrame = requestAnimationFrame(() => {
          bubbleFrame = 0;
          if (!disposed && token === bubbleToken) setAttribute(bubbleRef.current, "data-visible", "true");
        });
      };
      setAttribute(bubbleRef.current, "data-visible", "false");
      if (!popup) {
        bubbleTimer = window.setTimeout(() => {
          bubbleTimer = 0;
          if (!disposed && token === bubbleToken) {
            setText(bubbleTextRef.current, "");
            setText(bubbleWarningRef.current, "");
            bubbleSignature = "";
          }
        }, 220);
      } else if (bubbleSignature) {
        bubbleTimer = window.setTimeout(() => { bubbleTimer = 0; reveal(); }, 220);
      } else reveal();
    }

    function triggerMetricSuccess(key: string, track: HTMLDivElement | null) {
      if (!track) return;
      const existing = successTimers.get(key);
      if (existing) window.clearTimeout(existing);
      setAttribute(track, "data-success", "false");
      requestAnimationFrame(() => {
        if (disposed) return;
        setAttribute(track, "data-success", "true");
        successTimers.set(key, window.setTimeout(() => {
          setAttribute(track, "data-success", "false");
          successTimers.delete(key);
        }, 350));
      });
    }

    function transitionInterfaceText(key: string, node: Element | null, text: string) {
      if (!node) return;
      const state = interfaceTextStates.get(key) ?? { desired: "", displayed: "", timer: 0, frame: 0 };
      if (state.desired === text) return;
      state.desired = text;
      if (state.timer) window.clearTimeout(state.timer);
      if (state.frame) cancelAnimationFrame(state.frame);
      setAttribute(node, "data-visible", "false");
      const reveal = () => {
        if (disposed || state.desired !== text || !text) return;
        setText(node, text);
        state.displayed = text;
        state.frame = requestAnimationFrame(() => {
          state.frame = 0;
          if (!disposed && state.desired === text) setAttribute(node, "data-visible", "true");
        });
      };
      if (state.displayed) {
        state.timer = window.setTimeout(() => {
          state.timer = 0;
          if (state.desired !== text) return;
          if (!text) state.displayed = "";
          else reveal();
        }, 220);
      } else reveal();
      interfaceTextStates.set(key, state);
    }

    function drawInterface() {
      if (!game) return;
      const transition = getTuning().transition;
      root!.style.setProperty("--ceo-task-success-duration", transition.success + "s");
      root!.style.setProperty("--ceo-crisis-result-duration", transition.crisisResult + "s");
      updateBubble();
      if (countdownRef.current) {
        setAttribute(countdownRef.current, "data-visible", game.crisisTimeRemaining === null ? "false" : "true");
        if (game.crisisTimeRemaining !== null) setText(countdownRef.current, game.crisisTimeRemaining.toFixed(1) + " с");
        countdownRef.current.style.setProperty("--countdown-progress", String((game.crisisTimeRemaining ?? 0) / getTuning().transition.crisisTimer));
      }
      const aiCountRequirement = game.requirements.find((item) => item.id === "ai-count");
      if (aiCountRef.current) {
        setAttribute(aiCountRef.current, "data-met", aiCountRequirement?.met ? "true" : "false");
        transitionInterfaceText("ai-count", aiCountRef.current, aiCountRequirement ? `AI ${aiCountRequirement.current}/${aiCountRequirement.target}` : "");
      }
      METRICS.forEach((metric, index) => {
        const nodes = metricsRef.current[index];
        const requirement = game!.requirements.find((candidate) => candidate.metric === metric.id);
        const value = game!.metrics[metric.id];
        setAttribute(nodes.track, "aria-valuenow", String(value));
        if (requirement) setAttribute(nodes.track, "aria-valuetext", requirement.met ? "Условие выполнено" : "Условие не выполнено");
        else nodes.track?.removeAttribute("aria-valuetext");
        setAttribute(nodes.track, "data-met", requirement?.met ? "true" : "false");
        if (nodes.fill) {
          nodes.fill.style.width = value / GAME_CONFIG.metrics.max * 100 + "%";
        }
        const thresholds = getTuning().thresholds;
        const normal = thresholds[`${metric.id}Normal` as keyof typeof thresholds];
        const high = thresholds[`${metric.id}High` as keyof typeof thresholds];
        const widths = [normal, high - normal, GAME_CONFIG.metrics.max - high];
        const currentZoneIndex = value < normal ? 0 : value < high ? 1 : 2;
        nodes.track?.style.setProperty("--metric-fill-color", METRIC_ZONE_COLORS[currentZoneIndex]);
        let segmentLeft = 0;
        nodes.segments.forEach((segment, segmentIndex) => {
          if (segment) {
            segment.style.left = segmentLeft + "%";
            segment.style.width = widths[segmentIndex] + "%";
          }
          segmentLeft += widths[segmentIndex];
          const zone = ["low", "normal", "high"][segmentIndex];
          setAttribute(segment, "data-target", requirement?.acceptableZones?.includes(zone as "low" | "normal" | "high") ? "true" : "false");
          setAttribute(segment, "data-unmet", requirement && !requirement.met && requirement.acceptableZones?.includes(zone as "low" | "normal" | "high") ? "true" : "false");
        });
        const requirementKey = `${game!.currentDirective.id}:${metric.id}`;
        const previousMet = previousRequirementState.get(requirementKey);
        if (previousMet === false && requirement?.met) triggerMetricSuccess(requirementKey, nodes.track);
        if (requirement) previousRequirementState.set(requirementKey, requirement.met);
      });
      game.zones.forEach((zone, index) => {
        const progress = game!.departmentProgress.find((item) => item.zoneId === zone.id);
        const aiRequirement = game!.requirements.find((item) => item.id === `ai-${zone.id}`);
        const aiPlaced = game!.entities.some((entity) => entity.type === "ai" && entity.assignedZoneId === zone.id);
        const aiActive = game!.entities.some((entity) => entity.type === "ai" && entity.assignedZoneId === zone.id && game!.entities.some((human) => human.type === "human" && human.assignedZoneId === zone.id && entityActivity(human) === "ASSIGNED"));
        const showAiMarker = Boolean(aiRequirement || (aiCountRequirement && aiPlaced));
        const label = GAME_CONFIG.departments[index].label;
        setText(zonesRef.current[index].label, label);
        transitionInterfaceText(`department-${zone.id}`, zonesRef.current[index].requirement, progress ? `${progress.current}/${progress.target}` : "");
        setAttribute(zonesRef.current[index].requirement, "data-met", progress?.met ? "true" : "false");
        transitionInterfaceText(`ai-zone-${zone.id}`, zonesRef.current[index].aiMarker, showAiMarker ? "AI" : "");
        setAttribute(zonesRef.current[index].aiMarker, "data-active", aiActive ? "true" : "false");
      });
      for (const entity of game.entities) {
        if (entity.type !== "ai") continue;
        const hasCoworker = Boolean(entity.assignedZoneId && game.entities.some((human) => human.type === "human" && human.assignedZoneId === entity.assignedZoneId && entityActivity(human) === "ASSIGNED"));
        setAttribute(nodesRef.current[entity.slot].root, "data-coworker", hasCoworker ? "true" : "false");
        setAttribute(heldNodesRef.current[entity.slot].root, "data-coworker", hasCoworker ? "true" : "false");
      }
      setAttribute(root, "data-phase", game.phase);
      setAttribute(root, "data-presentation", game.presentationState);
      setAttribute(root, "data-directive", game.currentDirective.id);
      if (reportRef.current) {
        setAttribute(reportRef.current, "data-visible", game.finished ? "true" : "false");
        setAttribute(reportRef.current, "aria-hidden", game.finished ? "false" : "true");
      }
      if (game.report) {
        const report = game.report;
        REPORT_ITEMS.forEach((item, index) => setText(reportValuesRef.current[index], String(Math.round(report[item.id]))));
        setText(verdictRef.current, report.verdict);
      }
    }

    function draw() {
      if (!game) return;
      trailEffectsContext?.clearRect(0, 0, bounds.width, bounds.height);
      landingEffectsContext?.clearRect(0, 0, bounds.width, bounds.height);
      for (const index of ENTITY_SLOTS) {
        const entity = game.entityAt(index);
        if (entity) {
          drawCharacter(nodesRef.current[index], entity, game.plane, getTuning());
          drawCharacter(heldNodesRef.current[index], entity, game.plane, getTuning());
          const held = entity.controller.grabbedPointerId !== null;
          setAttribute(nodesRef.current[index].root, "visibility", held ? "hidden" : "visible");
          setAttribute(heldNodesRef.current[index].root, "visibility", held ? "visible" : "hidden");
          const tuning = getTuning();
          if (trailEffectsContext) drawTrail(trailEffectsContext, entity.controller, tuning);
          if (landingEffectsContext) drawLandingEffect(landingEffectsContext, entity.controller, tuning);
        }
        else {
          setAttribute(nodesRef.current[index].root, "visibility", "hidden");
          setAttribute(heldNodesRef.current[index].root, "visibility", "hidden");
          setAttribute(nodesRef.current[index].shadow, "opacity", "0");
        }
      }
      const layer = characterLayerRef.current;
      if (layer) {
        const ordered = [...game.entities].sort((a, b) => {
          const heldA = a.controller.height > 0 || a.controller.grabbedPointerId !== null ? 1 : 0;
          const heldB = b.controller.height > 0 || b.controller.grabbedPointerId !== null ? 1 : 0;
          return heldA - heldB || worldToScreen(a.controller.worldPosition, game!.plane).y - worldToScreen(b.controller.worldPosition, game!.plane).y || a.slot - b.slot;
        });
        let previous: Element | null = null;
        for (const entity of ordered) {
          const node = nodesRef.current[entity.slot].root;
          if (!node) continue;
          const next: Element | null = previous ? previous.nextElementSibling : layer.firstElementChild;
          if (next !== node) layer.insertBefore(node, next);
          previous = node;
        }
      }
      drawInterface();
    }

    function drawZones() {
      if (!game || !layout) return;
      game.zones.forEach((zone, index) => {
        const { polygon, label, requirement, aiMarker } = zonesRef.current[index];
        const corners = zonePolygon(zone, game!.plane);
        setAttribute(polygon, "points", corners.map((point) => point.x + "," + point.y).join(" "));
        const center = worldToScreen({ x: zone.bounds.x + zone.bounds.width / 2, y: zone.bounds.y }, game!.plane);
        label?.setAttribute("x", String(center.x));
        label?.setAttribute("y", String(center.y + layout!.gap + layout!.labelHeight / 2));
        requirement?.setAttribute("x", String(center.x));
        requirement?.setAttribute("y", String(center.y + layout!.gap + layout!.labelHeight / 2 + layout!.labelHeight));
        aiMarker?.setAttribute("x", String(center.x));
        aiMarker?.setAttribute("y", String(center.y + layout!.gap + layout!.labelHeight / 2 + layout!.labelHeight * 2));
      });
    }

    // Measurements occur on input or layout changes, never in the animation loop.
    function localPoint(clientX: number, clientY: number): CharacterPoint | null {
      const matrix = field!.getScreenCTM();
      if (!matrix) return null;
      const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
      return Number.isFinite(point.x) && Number.isFinite(point.y) ? { x: point.x, y: point.y } : null;
    }

    function releaseCapture(pointerId: number) {
      if (field!.hasPointerCapture(pointerId)) field!.releasePointerCapture(pointerId);
    }

    function releasePointers() {
      const now = performance.now();
      for (const [pointerId, owned] of pointers) {
        pointers.delete(pointerId);
        if (!game?.finished) game?.release(owned.index, pointerId, now, true);
        releaseCapture(pointerId);
      }
      for (const entity of game?.entities ?? []) {
        const pointerId = entity.controller.grabbedPointerId;
        if (pointerId === null) continue;
        if (game?.finished) entity.controller.cancelGrab();
        else game?.release(entity.slot, pointerId, now, true);
      }
    }

    function stop() {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      previousTime = 0;
      accumulator = 0;
      impactAnimation?.cancel();
      impactAnimation = null;
    }

    function shakeCard() {
      if (reducedMotion || !frame) return;
      impactAnimation?.cancel();
      impactAnimation = frame.animate([
        { transform: "translate(0, 0)" },
        { transform: "translate(-2px, 1px)" },
        { transform: "translate(2px, -1px)" },
        { transform: "translate(-1px, 0)" },
        { transform: "translate(0, 0)" },
      ], { duration: 180, easing: "ease-out" });
    }

    function tick(time: number) {
      animationFrame = 0;
      if (disposed || !enabled || document.hidden || !game) return;
      const elapsed = previousTime ? Math.max(0, (time - previousTime) / 1000) : 0;
      previousTime = time;
      const wasFinished = game.finished;
      game.advance(elapsed);
      if (!wasFinished && game.finished) {
        releasePointers();
        stop();
        draw();
        restartRef.current?.focus({ preventScroll: true });
        return;
      }
      accumulator = Math.min(accumulator + Math.min(C.maxFrameDelta, elapsed), C.fixedStep * C.maxSubsteps);
      let substeps = 0;
      let impacted = false;
      while (accumulator >= C.fixedStep && substeps < C.maxSubsteps) {
        impacted = game.updatePhysics(C.fixedStep, time, reducedMotion) || impacted;
        accumulator -= C.fixedStep;
        substeps += 1;
      }
      if (impacted) shakeCard();
      draw();
      animationFrame = requestAnimationFrame(tick);
    }

    function start() {
      if (disposed || !enabled || document.hidden || animationFrame || !game || game.finished) return;
      previousTime = 0;
      accumulator = 0;
      animationFrame = requestAnimationFrame(tick);
    }

    function createGame() {
      if (!bounds.width || !bounds.height || !layout) return;
      bubbleToken += 1;
      if (bubbleTimer) { window.clearTimeout(bubbleTimer); bubbleTimer = 0; }
      if (bubbleFrame) { cancelAnimationFrame(bubbleFrame); bubbleFrame = 0; }
      for (const timer of successTimers.values()) window.clearTimeout(timer);
      successTimers.clear();
      for (const state of interfaceTextStates.values()) {
        if (state.timer) window.clearTimeout(state.timer);
        if (state.frame) cancelAnimationFrame(state.frame);
      }
      interfaceTextStates.clear();
      for (const metric of metricsRef.current) setAttribute(metric.track, "data-success", "false");
      previousRequirementState.clear();
      bubbleSignature = "";
      bubbleDesiredSignature = "";
      setAttribute(bubbleRef.current, "data-visible", "false");
      game = new CeoGame(bounds, layout, getTuning);
      drawZones();
      draw();
    }

    function measure() {
      const width = field!.clientWidth;
      const height = field!.clientHeight;
      if (!width || !height) return;
      const style = getComputedStyle(root!);
      const label = zonesRef.current[0].label;

      const radius = parseFloat(style.borderTopLeftRadius) || 0;
      const nextLayout: FieldLayout = {
        inset: parseFloat(style.paddingLeft),
        gap: parseFloat(style.columnGap),
        headerBottom: header!.offsetTop + header!.offsetHeight,
        labelHeight: label ? parseFloat(getComputedStyle(label).lineHeight) : parseFloat(style.lineHeight),

      };
      if (width === bounds.width && height === bounds.height && radius === bounds.radius && layout && Object.keys(nextLayout).every((key) => nextLayout[key as keyof FieldLayout] === layout![key as keyof FieldLayout])) return;
      bounds = { width, height, radius };
      for (const [effects, effectsContext] of [[trailEffects, trailEffectsContext], [landingEffects, landingEffectsContext]] as const) {
        if (!effects || !effectsContext) continue;
        const pixelRatio = window.devicePixelRatio || 1;
        effects.width = Math.round(width * pixelRatio);
        effects.height = Math.round(height * pixelRatio);
        effectsContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        effectsContext.strokeStyle = getComputedStyle(effects).color;
        effectsContext.lineCap = "round";
      }
      layout = nextLayout;
      field!.setAttribute("viewBox", `0 0 ${width} ${height}`);
      heldOverlayRef.current?.setAttribute("viewBox", `0 0 ${width} ${height}`);
      if (!game) createGame();
      else {
        game.resize(bounds, layout);
        for (const owned of pointers.values()) {
          const point = localPoint(owned.clientX, owned.clientY);
          if (point) game.entityAt(owned.index)?.controller.rebaseGrab(point, performance.now());
        }
        drawZones();
        draw();
      }
      start();
    }

    const runtime: Runtime = {
      setActivity(nextActive, reset) {
        enabled = nextActive;
        if (!enabled) {
          stop();
          releasePointers();
          if (reset) pendingReset = true;
          return;
        }
        if (pendingReset) {
          createGame();
          pendingReset = false;
        }
        start();
      },
      down(index, event) {
        if (!enabled || document.hidden || event.button !== 0 || pointers.has(event.pointerId) || !game) return;
        const point = localPoint(event.clientX, event.clientY);
        if (!point || !game.grab(index, event.pointerId, point, event.timeStamp)) return;
        event.preventDefault();
        pointers.set(event.pointerId, { index, clientX: event.clientX, clientY: event.clientY });
        // Sorting character groups cannot invalidate capture on the stable field.
        try { field!.setPointerCapture(event.pointerId); }
        catch {
          pointers.delete(event.pointerId);
          game.release(index, event.pointerId, event.timeStamp, true);
          return;
        }
        draw();
      },
      move(event) {
        const owned = pointers.get(event.pointerId);
        if (!enabled || !owned) return;
        const character = game?.entityAt(owned.index)?.controller;
        const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? [];
        const samples = coalesced.length ? coalesced : [event.nativeEvent];
        for (const sample of samples) {
          const point = localPoint(sample.clientX, sample.clientY);
          if (point) character?.moveGrab(event.pointerId, point, sample.timeStamp);
        }
        owned.clientX = event.clientX;
        owned.clientY = event.clientY;
      },
      up(event, cancelled) {
        if (event.type === "lostpointercapture" && event.currentTarget.hasPointerCapture(event.pointerId)) return;
        const owned = pointers.get(event.pointerId);
        if (!owned) return;
        if (!cancelled) {
          const point = localPoint(event.clientX, event.clientY);
          if (point) game?.entityAt(owned.index)?.controller.moveGrab(event.pointerId, point, event.timeStamp);
        }
        pointers.delete(event.pointerId);
        game?.release(owned.index, event.pointerId, event.timeStamp, cancelled);
        releaseCapture(event.pointerId);
        draw();
      },
      restart() {
        if (!enabled) return;
        stop();
        releasePointers();
        pendingReset = false;
        createGame();
        start();
      },
    };
    runtimeRef.current = runtime;
    const observer = new ResizeObserver(measure);
    observer.observe(field);
    observer.observe(header);
    const onVisibilityChange = () => {
      if (document.hidden) { stop(); releasePointers(); }
      else start();
    };
    const onMotionChange = () => {
      reducedMotion = motionPreference.matches;
      if (reducedMotion) { impactAnimation?.cancel(); impactAnimation = null; }
    };
    const onWindowBlur = () => { releasePointers(); draw(); };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);
    motionPreference.addEventListener("change", onMotionChange);
    measure();

    return () => {
      disposed = true;
      enabled = false;
      stop();
      if (bubbleTimer) window.clearTimeout(bubbleTimer);
      if (bubbleFrame) cancelAnimationFrame(bubbleFrame);
      for (const timer of successTimers.values()) window.clearTimeout(timer);
      successTimers.clear();
      for (const state of interfaceTextStates.values()) {
        if (state.timer) window.clearTimeout(state.timer);
        if (state.frame) cancelAnimationFrame(state.frame);
      }
      interfaceTextStates.clear();
      releasePointers();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
      motionPreference.removeEventListener("change", onMotionChange);
      if (runtimeRef.current === runtime) runtimeRef.current = null;
    };
  }, [getTuning]);

  useEffect(() => {
    runtimeRef.current?.setActivity(active, resetWhenHidden);
  }, [active, resetWhenHidden]);

  const initialRestartCommand = useRef(restartCommand);
  useEffect(() => {
    if (restartCommand !== initialRestartCommand.current) runtimeRef.current?.restart();
  }, [restartCommand]);

  return (
    <div ref={rootRef} className={styles.game} data-ceo-simulator="" data-phase="NORMAL_TASK">
      <div ref={headerRef} className={styles.header}>
        <div className={styles.metrics} aria-label="Показатели команды">
          {METRICS.map((metric, index) => (
            <div key={metric.id} className={styles.metric}>
              <div className={styles.metricLabel}>
                <span className={styles.metricName}><span className={styles.metricIconSlot} data-role="metric-icon-placeholder" aria-hidden="true" />{metric.label}</span>
                {index === 2 && <><span ref={aiCountRef} className={styles.aiCount} data-visible="false" /><span ref={countdownRef} className={styles.countdown} data-visible="false" /></>}
              </div>
              <div ref={(node) => { metricsRef.current[index].track = node; }} className={styles.metricTrack} role="meter" aria-label={metric.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
                {METRIC_ZONE_CONFIG[metric.id].map((zone, zoneIndex) => <span key={zone.id} ref={(node) => { metricsRef.current[index].segments[zoneIndex] = node; }} className={styles.metricSegment} data-zone={zone.id} />)}
                <span ref={(node) => { metricsRef.current[index].fill = node; }} className={styles.metricFill} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <canvas ref={trailEffectsRef} className={styles.trailEffects} aria-hidden="true" />
      <svg ref={fieldRef} className={styles.field} role="group" aria-label="Симулятор руководителя: аналитика, дизайн, разработка, тестирование и рынок труда" data-character-playground=""
        onPointerMove={(event) => runtimeRef.current?.move(event)}
        onPointerUp={(event) => runtimeRef.current?.up(event, false)}
        onPointerCancel={(event) => runtimeRef.current?.up(event, true)}
        onLostPointerCapture={(event) => runtimeRef.current?.up(event, true)}>
        {GAME_CONFIG.departments.map((department, index) => (
          <g key={department.id} className={styles.zone}>
            <polygon ref={(node) => {
              zonesRef.current[index].polygon = node;
              node?.style.setProperty("--zone-color", department.roleColor);
            }} />
            <text ref={(node) => { zonesRef.current[index].label = node; }} className={styles.zoneLabel}>{department.label}</text>
            <text ref={(node) => { zonesRef.current[index].requirement = node; }} className={styles.zoneRequirement} data-visible="false" />
            <text ref={(node) => { zonesRef.current[index].aiMarker = node; }} className={styles.aiMarker} />
          </g>
        ))}
        <g className={styles.shadows} aria-hidden="true">
          {ENTITY_SLOTS.map((index) => <ellipse key={index} ref={(node) => { nodesRef.current[index].shadow = node; }} className={styles.shadow} opacity={0} />)}
        </g>
        <g ref={characterLayerRef}>
          {ENTITY_SLOTS.map((index) => {
            const robot = index >= GAME_CONFIG.humanCount;
            const headPath = robot ? ROBOT_PATH : HEAD_PATH;
            return (
              <g key={index} ref={(node) => { nodesRef.current[index].root = node; }} className={styles.character + (robot ? " " + styles.robot : "")} visibility="hidden" data-character={index} data-type={robot ? "ai" : "human"}>
                <path ref={(node) => { nodesRef.current[index].leftLeg = node; }} className={styles.leg} strokeWidth={C.legStroke} />
                <path ref={(node) => { nodesRef.current[index].rightLeg = node; }} className={styles.leg} strokeWidth={C.legStroke} />
                <path ref={(node) => { nodesRef.current[index].body = node; }} className={styles.body} strokeWidth={C.headStroke} />
                <g ref={(node) => { nodesRef.current[index].head = node; }}>
                  <g transform={"scale(" + HEAD_SCALE + ")"}>
                    <path className={styles.head} d={headPath} strokeWidth={C.headStroke / HEAD_SCALE} />
                    {robot ? <text className={styles.robotLabel} x={0} y={1}>AI</text> : <><circle className={styles.eye} cx={-5} cy={1} r={2.3} /><circle className={styles.eye} cx={5} cy={1} r={2.3} /></>}
                  </g>
                  {robot && <rect className={styles.aiStateIconSlot} data-role="ai-state-icon-placeholder" aria-hidden="true" x={10} y={-22} width={10} height={10} rx={3} />}
                </g>
                <rect
                  ref={(node) => { nodesRef.current[index].hitArea = node; }}
                  className={styles.headHitArea}
                  width={C.size}
                  height={C.size}
                  onPointerDown={(event) => runtimeRef.current?.down(index, event)}
                />
              </g>
            );
          })}
        </g>
      </svg>
      <canvas ref={landingEffectsRef} className={styles.landingEffects} aria-hidden="true" />
      <svg ref={heldOverlayRef} className={styles.heldOverlay} aria-hidden="true">
        {ENTITY_SLOTS.map((index) => {
          const robot = index >= GAME_CONFIG.humanCount;
          const headPath = robot ? ROBOT_PATH : HEAD_PATH;
          return (
            <g key={index} ref={(node) => { heldNodesRef.current[index].root = node; }} className={styles.character + (robot ? " " + styles.robot : "")} visibility="hidden">
              <path ref={(node) => { heldNodesRef.current[index].leftLeg = node; }} className={styles.leg} strokeWidth={C.legStroke} />
              <path ref={(node) => { heldNodesRef.current[index].rightLeg = node; }} className={styles.leg} strokeWidth={C.legStroke} />
              <path ref={(node) => { heldNodesRef.current[index].body = node; }} className={styles.body} strokeWidth={C.headStroke} />
              <g ref={(node) => { heldNodesRef.current[index].head = node; }}>
                <g transform={"scale(" + HEAD_SCALE + ")"}>
                  <path className={styles.head} d={headPath} strokeWidth={C.headStroke / HEAD_SCALE} />
                  {robot ? <text className={styles.robotLabel} x={0} y={1}>AI</text> : <><circle className={styles.eye} cx={-5} cy={1} r={2.3} /><circle className={styles.eye} cx={5} cy={1} r={2.3} /></>}
                </g>
                {robot && <rect className={styles.aiStateIconSlot} data-role="ai-state-icon-placeholder" aria-hidden="true" x={10} y={-22} width={10} height={10} rx={3} />}
              </g>
            </g>
          );
        })}
      </svg>
      <div ref={bubbleRef} className={styles.contextBubble} data-kind="normal" data-visible="false" role="status" aria-live="polite">
        <span ref={bubbleWarningRef} className={styles.bubbleWarning} aria-hidden="true">!</span>
        <p ref={bubbleTextRef}>Соберите базовую команду</p>
      </div>
      <div ref={reportRef} className={styles.report} data-visible="false" aria-hidden="true" role="status" aria-live="polite">
        <h2>AI-ТРАНСФОРМАЦИЯ ЗАВЕРШЕНА</h2>
        <p ref={verdictRef} className={styles.verdict} />
        <dl className={styles.reportMetrics}>
          {REPORT_ITEMS.map((item, index) => <div key={item.id}><dt>{item.label}</dt><dd><strong ref={(node) => { reportValuesRef.current[index] = node; }}>0</strong></dd></div>)}
        </dl>
        <button ref={restartRef} className={styles.restart} type="button" disabled={!active} onClick={() => runtimeRef.current?.restart()}>НАЧАТЬ ЗАНОВО</button>
      </div>
    </div>
  );
}
