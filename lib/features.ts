// Server-side build flag: games are available only when explicitly enabled.
export const gamesEnabled = process.env.ENABLE_GAMES === "true";
