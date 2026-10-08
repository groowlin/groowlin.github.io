import { reactionCopy as copy } from "./copy";
import type { ReactionConfig, ReactionState } from "./types";

const lostNearResult = (state: ReactionState) => state.previousError !== null && state.previousError <= 2 && state.currentError! >= 6;

export const pixelPerfectReactionConfig: ReactionConfig = {
  gameId: "pixel-perfect",
  targetGap: 16,
  shared: {
    outOfBounds: [[copy.shared.outOfBounds[0]], [copy.shared.outOfBounds[1]], [copy.shared.outOfBounds[2]], copy.shared.outOfBounds.slice(1)],
    zero: copy.shared.zero,
    perfect: [...copy.campaign.perfectSecond, ...copy.campaign.perfectFinal],
    ranges: [
      { maxError: 2, replies: copy.shared.near },
      { maxError: 5, replies: copy.shared.close },
      { maxError: 9, replies: copy.shared.miss },
      { maxError: 15, replies: copy.shared.strong.slice(0, 2) },
      { maxError: Infinity, replies: copy.shared.strong },
    ],
  },
  campaign: {
    maxAttempts: 5,
    perfect: [copy.shared.perfect, copy.campaign.perfectSecond, copy.campaign.perfectFinal, copy.campaign.perfectFinal, copy.campaign.perfectFinal],
    specials: [{ id: "lost-near-result", replies: copy.shared.rollback, matches: state => state.attempt >= 2 && state.attempt <= 4 && lostNearResult(state) }],
    rules: [
      { id: "final-near", replies: copy.campaign.finalNear.slice(0, 2), matches: (state, config) => state.attempt >= config.campaign.maxAttempts && state.currentError! <= 2 },
      { id: "final-close", replies: [copy.campaign.finalNear[2]], matches: (state, config) => state.attempt >= config.campaign.maxAttempts && state.currentError! <= 5 },
      { id: "final-miss", replies: [copy.campaign.finalOther[0]], matches: (state, config) => state.attempt >= config.campaign.maxAttempts && state.currentError! <= 9 },
      { id: "final-strong", replies: [copy.campaign.finalOther[1]], matches: (state, config) => state.attempt >= config.campaign.maxAttempts && state.currentError! <= 15 },
      { id: "final-other", replies: [copy.campaign.finalOther[2]], matches: (state, config) => state.attempt >= config.campaign.maxAttempts },
      { id: "second-improved", replies: copy.campaign.improved, matches: state => state.attempt >= 2 && state.attempt <= 4 && state.previousError !== null && state.currentError! < state.previousError },
      { id: "second-unchanged", replies: copy.campaign.unchanged, matches: state => state.attempt >= 2 && state.attempt <= 4 && state.previousError !== null && state.currentError === state.previousError },
      { id: "second-worse", replies: copy.campaign.worse, matches: state => state.attempt >= 2 && state.attempt <= 4 && state.previousError !== null && state.currentError! > state.previousError },
      { id: "first-very-strong", replies: [copy.shared.strong[2]], matches: state => state.attempt === 1 && state.currentError! >= 16 },
    ],
  },
  endless: {
    enabled: false,
    specials: [
      { id: "lost-near-result", replies: copy.shared.rollback, matches: lostNearResult },
      { id: "improving-streak", replies: copy.endless.improving, matches: state => {
        const recent = state.history.slice(-3);
        return recent.length === 3 && recent[0].error !== null && recent[1].error !== null && recent[2].error !== null && recent[0].error > recent[1].error && recent[1].error > recent[2].error;
      } },
      { id: "repeated-gap", replies: copy.endless.repeated, matches: state => {
        const recent = state.history.slice(-3);
        return recent.length === 3 && recent.every(result => result.gap !== null && result.gap === recent[0].gap);
      } },
      { id: "oscillating", replies: copy.endless.oscillating, matches: (state, config) => {
        const recent = state.history.slice(-4);
        return recent.length === 4 && recent.every((result, index) => result.error !== null && result.gap !== null && result.error <= 2 && (index === 0 || (recent[index - 1].gap !== null && (result.gap - config.targetGap) * (recent[index - 1].gap! - config.targetGap) < 0)));
      } },
    ],
    milestones: [5, 10, 20, 30].map((attempt, index) => ({ attempt, id: `attempt-${attempt}`, replies: [copy.endless.milestones[index]] })),
  },
};
