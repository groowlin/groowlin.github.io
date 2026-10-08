import type { ReactionConfig, ReactionEvent, ReactionMode, ReactionReply, ReactionState } from "./types";

export function createReactionState(gameId = "pixel-perfect", mode: ReactionMode = "campaign"): ReactionState {
  return {
    gameId, mode, currentGap: null, currentError: null, previousGap: null, previousError: null,
    bestError: null, attempt: 0, outOfBoundsCount: 0, violationCount: 0, history: [], seenMilestones: [], seenSpecials: [], lastReplyId: null,
  };
}

/** Rebuild analytics without selecting or consuming any reactions. */
export function hydrateReactionState(gaps: (number | null)[], gameId = "pixel-perfect", mode: ReactionMode = "campaign", targetGap = 16): ReactionState {
  const state = createReactionState(gameId, mode);
  const history = gaps.filter(gap => gap === null || Number.isFinite(gap)).map(gap => ({ gap, error: gap === null ? null : Math.abs(gap - targetGap) }));
  const measured = history.filter((result): result is {gap: number; error: number} => result.gap !== null);
  const current = measured.at(-1);
  const previous = measured.at(-2);
  return {
    ...state, history, attempt: history.length, currentGap: current?.gap ?? null, currentError: current?.error ?? null,
    previousGap: previous?.gap ?? null, previousError: previous?.error ?? null,
    bestError: measured.length ? Math.min(...measured.map(result => result.error)) : null,
    violationCount: history.length - measured.length,
  };
}

/** Validate derived counters/history and only accept configured reply/event IDs. */
export function parseReactionState(raw: string | null, config: ReactionConfig): ReactionState | null {
  if (!raw) return null;
  try {
    const state = JSON.parse(raw) as ReactionState;
    if (!state || state.gameId !== config.gameId || !["campaign", "endless"].includes(state.mode)) return null;
    if (state.mode === "endless" && !config.endless.enabled) return null;
    if (!Number.isSafeInteger(state.attempt) || state.attempt < 0 || !Number.isSafeInteger(state.outOfBoundsCount) || state.outOfBoundsCount < 0) return null;
    if (!Array.isArray(state.history) || state.history.length !== state.attempt || state.history.some(result => !result || (result.gap === null ? result.error !== null : !Number.isFinite(result.gap) || result.error !== Math.abs(result.gap - config.targetGap)))) return null;
    if (state.mode === "campaign" && (state.attempt > config.campaign.maxAttempts || state.history.slice(0, -1).some(result => result.error === 0))) return null;
    const analytics = hydrateReactionState(state.history.map(result => result.gap), config.gameId, state.mode, config.targetGap);
    if (state.violationCount !== analytics.violationCount || state.outOfBoundsCount > state.violationCount) return null;
    for (const key of ["currentGap", "currentError", "previousGap", "previousError", "bestError"] as const) {
      if (state[key] !== analytics[key]) return null;
    }
    const specials = config[state.mode].specials;
    const milestones = state.mode === "endless" ? config.endless.milestones : [];
    const validIds = (value: unknown, allowed: string[]): value is string[] => Array.isArray(value) && new Set(value).size === value.length && value.every(id => typeof id === "string" && allowed.includes(id));
    if (!validIds(state.seenSpecials, specials.map(rule => rule.id)) || !validIds(state.seenMilestones, milestones.filter(rule => rule.attempt <= state.attempt).map(rule => rule.id))) return null;
    const replies = [
      ...config.shared.outOfBounds.flat(), ...config.shared.zero, ...config.shared.perfect, ...config.shared.ranges.flatMap(range => range.replies),
      ...(state.mode === "campaign" ? [...config.campaign.perfect.flat(), ...config.campaign.rules.flatMap(rule => rule.replies)] : milestones.flatMap(rule => rule.replies)),
      ...specials.flatMap(rule => rule.replies),
    ];
    if (state.lastReplyId !== null && !replies.some(reply => reply.id === state.lastReplyId)) return null;
    return { ...analytics, outOfBoundsCount: state.outOfBoundsCount, seenSpecials: state.seenSpecials, seenMilestones: state.seenMilestones, lastReplyId: state.lastReplyId };
  } catch {
    return null;
  }
}

/** Pure selection: callers own session lifetime and completion/navigation. */
export function reactToEvent(
  previous: ReactionState,
  event: ReactionEvent,
  config: ReactionConfig,
  random: () => number = Math.random,
): { state: ReactionState; reply: ReactionReply | null } {
  if (previous.gameId !== config.gameId) throw new Error("Reaction config does not match game");
  if (previous.mode === "endless" && !config.endless.enabled) return { state: previous, reply: null };
  if (previous.mode === "campaign" && (previous.attempt >= config.campaign.maxAttempts || previous.currentError === 0)) {
    return { state: previous, reply: null };
  }
  if (event.type === "attempt" && !Number.isFinite(event.gap)) return { state: previous, reply: null };
  const state: ReactionState = { ...previous };
  const choose = (pool: readonly ReactionReply[]) => {
    const eligible = pool.filter(reply => reply.id !== previous.lastReplyId);
    if (eligible.length === 0) return null;
    const index = Math.min(eligible.length - 1, Math.max(0, Math.floor(random() * eligible.length)));
    const reply = eligible[index];
    state.lastReplyId = reply.id;
    return reply;
  };
  const finish = (pool: readonly ReactionReply[]) => ({ state, reply: choose(pool) });
  if (event.type === "out-of-bounds" || event.type === "overlap") {
    state.outOfBoundsCount += event.type === "out-of-bounds" ? 1 : 0;
    state.violationCount += 1;
    state.attempt += 1;
    state.history = [...previous.history, { gap: null, error: null }];
    const pool = config.shared.outOfBounds[Math.min(state.violationCount - 1, config.shared.outOfBounds.length - 1)];
    return finish(pool);
  }
  state.previousGap = previous.currentGap;
  state.previousError = previous.currentError;
  state.currentGap = event.gap;
  state.currentError = Math.abs(event.gap - config.targetGap);
  state.bestError = Math.min(previous.bestError ?? Infinity, state.currentError);
  state.attempt += 1;
  state.history = [...previous.history, { gap: event.gap, error: state.currentError }];

  if (state.currentGap === 0) return finish(config.shared.zero);
  if (state.currentError === 0) {
    const pool = state.mode === "campaign" ? config.campaign.perfect[Math.min(state.attempt - 1, config.campaign.perfect.length - 1)] : config.shared.perfect;
    return finish(pool);
  }
  for (const rule of config[state.mode].specials) {
    if (!state.seenSpecials.includes(rule.id) && rule.matches(state, config)) {
      const reply = choose(rule.replies);
      if (reply) {
        state.seenSpecials = [...previous.seenSpecials, rule.id];
        return { state, reply };
      }
    }
  }
  if (state.mode === "endless") {
    for (const milestone of config.endless.milestones) {
      if (state.attempt >= milestone.attempt && !state.seenMilestones.includes(milestone.id)) {
        const reply = choose(milestone.replies);
        if (reply) {
          state.seenMilestones = [...previous.seenMilestones, milestone.id];
          return { state, reply };
        }
      }
    }
  } else {
    for (const rule of config.campaign.rules) {
      if (rule.matches(state, config)) {
        const reply = choose(rule.replies);
        if (reply) return { state, reply };
      }
    }
  }
  const range = config.shared.ranges.find(range => state.currentError! <= range.maxError);
  return finish(range?.replies ?? []);
}
