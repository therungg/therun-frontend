import { Game } from '~app/(new-layout)/games/games.types';
import { safeEncodeURI } from '~src/utils/uri';

export const getGameUrl = (game: Game) => {
    // Link by the canonical slug (games.name), not the display label. getGame()
    // normalizes the param to the slug anyway, so passing the slug is idempotent
    // and avoids relying on display→slug fuzzy-matching for punctuated names.
    return safeEncodeURI(game.game);
};
