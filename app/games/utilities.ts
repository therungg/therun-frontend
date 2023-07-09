import { safeEncodeURI } from "~src/utils/uri";
import { Game } from "~app/games/games.types";

export const getGameUrl = (game: Game) => {
    return safeEncodeURI(game.display);
};
