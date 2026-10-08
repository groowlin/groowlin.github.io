import type { GameProgress } from "./game-logic";

export const GAMES_SESSION_KEY = "portfolio.games.v1";
export type GamesSession = {
  version: 1;
  isOpen: boolean;
  currentGameId: "pixel-perfect" | "characters";
  games: { "pixel-perfect": GameProgress };
};

export function createGamesSession(): GamesSession {
  return { version: 1, isOpen: false, currentGameId: "pixel-perfect", games: { "pixel-perfect": { attempts: [], results: null, completed: false } } };
}

// Self-contained: the same validator is serialized into the pre-hydration bootstrap.
export function parseGamesSession(raw: string | null): GamesSession | null {
  try {
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!value || value.version !== 1 || typeof value.isOpen !== "boolean" || (value.currentGameId !== "pixel-perfect" && value.currentGameId !== "characters")) return null;
    const progress = value.games?.["pixel-perfect"];
    if (!progress || !Array.isArray(progress.attempts) ||
      !progress.attempts.every((gap: unknown) => gap === null || (typeof gap === "number" && Number.isSafeInteger(gap))) ||
      typeof progress.completed !== "boolean") return null;
    const attempts = progress.attempts as (number | null)[];
    const exactIndex = attempts.indexOf(16);
    if (exactIndex >= 0 && exactIndex !== attempts.length - 1) return null;
    if (attempts.length > 5) return null;
    const completed = exactIndex >= 0 || attempts.length === 5;
    if (progress.completed !== completed && !(progress.completed && attempts.length === 3 && exactIndex < 0)) return null;
    let results: GameProgress["results"] = null;
    const measured = attempts.filter((gap): gap is number => gap !== null);
    if (measured.length) {
      const bestGap = measured.reduce((best, gap) => Math.abs(gap - 16) < Math.abs(best - 16) ? gap : best);
      results = { bestGap, deviation: Math.abs(bestGap - 16) };
      if (progress.results?.bestGap !== results.bestGap || progress.results?.deviation !== results.deviation) return null;
    } else if (progress.results !== null) return null;
    return { version: 1, isOpen: value.isOpen, currentGameId: value.currentGameId, games: { "pixel-perfect": { attempts, results, completed } } };
  } catch {
    return null;
  }
}

export function readGamesSession(): GamesSession {
  try { return parseGamesSession(sessionStorage.getItem(GAMES_SESSION_KEY)) ?? createGamesSession(); }
  catch { return createGamesSession(); }
}
