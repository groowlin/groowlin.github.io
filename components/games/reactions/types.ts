export type ReactionMode = "campaign" | "endless";
export type ReactionReply = { id: string; title: string; body: string };
export type ReactionResult = { gap: number | null; error: number | null };
export type ReactionState = {
  gameId: string;
  mode: ReactionMode;
  currentGap: number | null;
  currentError: number | null;
  previousGap: number | null;
  previousError: number | null;
  bestError: number | null;
  attempt: number;
  outOfBoundsCount: number;
  violationCount: number;
  history: ReactionResult[];
  seenMilestones: string[];
  seenSpecials: string[];
  lastReplyId: string | null;
};
export type ReactionEvent = { type: "attempt"; gap: number } | { type: "out-of-bounds" } | { type: "overlap" };
export type ReactionRule = {
  id: string;
  replies: readonly ReactionReply[];
  matches: (state: ReactionState, config: ReactionConfig) => boolean;
};
export type ReactionConfig = {
  gameId: string;
  targetGap: number;
  shared: {
    outOfBounds: readonly (readonly ReactionReply[])[];
    zero: readonly ReactionReply[];
    perfect: readonly ReactionReply[];
    ranges: readonly { maxError: number; replies: readonly ReactionReply[] }[];
  };
  campaign: {
    maxAttempts: number;
    perfect: readonly (readonly ReactionReply[])[];
    specials: readonly ReactionRule[];
    rules: readonly ReactionRule[];
  };
  endless: {
    enabled: boolean;
    specials: readonly ReactionRule[];
    milestones: readonly { attempt: number; id: string; replies: readonly ReactionReply[] }[];
  };
};
