import { safeEncodeURI } from "~src/utils/uri";
import { Game } from "~app/(old-layout)/games/games.types";

export const getGameUrl = (game: Game) => {
    return safeEncodeURI(game.display);
};
