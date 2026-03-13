import { Game } from '~app/(new-layout)/games/games.types';
import { safeEncodeURI } from '~src/utils/uri';

export const getGameUrl = (game: Game) => {
    return safeEncodeURI(game.display);
};
