import { safeEncodeURI } from "~src/utils/uri";
import { Game } from "~app/games/all-games";

export const getGameUrl = (game: Game) => {
    return safeEncodeURI(game.display);
};
