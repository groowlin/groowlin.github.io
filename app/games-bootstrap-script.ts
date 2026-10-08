import { GAMES_SESSION_KEY, parseGamesSession } from "@/components/games/session";

export const gamesBootstrapScript = `(()=>{try{const state=(${parseGamesSession.toString()})(sessionStorage.getItem(${JSON.stringify(GAMES_SESSION_KEY)}));document.documentElement.dataset.gamesOpen=state?.isOpen?'true':'false'}catch{document.documentElement.dataset.gamesOpen='false'}})();`;
