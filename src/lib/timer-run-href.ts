import { safeEncodeURI } from '~src/utils/uri';
import type { TimerPb } from '../../types/runner-profile.types';
import { searchable } from './searchable';
import { userHref } from './user-href';

/**
 * The run page path for a timer run.
 *
 * The run page answers under the game and category the run was UPLOADED
 * as — the two head segments of its key — not under whatever game the
 * profile files it with today. The two drift apart when a game is merged:
 * "Super Mario 64 Category Extensions" folds into "Super Mario 64" in the
 * database, the profile then names the run's game "Super Mario 64", but the
 * run itself still lives at ...Category%20Extensions/31%20Star. A link built
 * from the display name lands on a 404.
 *
 * The display name still makes the better URL and the better page title, so
 * it is kept whenever it names the same game the key does; only a name the
 * key disagrees with is replaced by the key's own slug.
 *
 * Segments past game#category are the qualifiers that tell subcategories
 * apart; the run page wants them back as `$`-joined suffixes on the
 * category.
 */
export function timerRunHref(
    username: string,
    run: Pick<TimerPb, 'game' | 'category' | 'runKey'>,
): string {
    const parts = run.runKey ? run.runKey.split('#') : [];
    const keyGame = parts[0];
    const game =
        keyGame && searchable(run.game) !== keyGame ? keyGame : run.game;
    const category = run.category;
    const qualifiers = parts
        .slice(2)
        .map((part) => `$${safeEncodeURI(part)}`)
        .join('');
    return userHref(
        username,
        `${safeEncodeURI(game)}/${safeEncodeURI(category)}${qualifiers}`,
    );
}
