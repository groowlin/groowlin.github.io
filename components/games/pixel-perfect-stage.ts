import type { GameProgress } from "./game-logic";

export type PixelPerfectStage = "intro" | "play" | "final-result";

export function stageForProgress(progress: GameProgress): PixelPerfectStage {
  if (progress.completed) return "final-result";
  if (progress.attempts.length > 0) return "play";
  return "intro";
}

export function stageAfterAttempt(progress: GameProgress): PixelPerfectStage {
  return progress.completed ? "final-result" : "play";
}

export function resetPixelPerfect(stage: "intro" | "play") {
  return {
    stage,
    progress: { attempts: [], results: null, completed: false } satisfies GameProgress
  };
}
