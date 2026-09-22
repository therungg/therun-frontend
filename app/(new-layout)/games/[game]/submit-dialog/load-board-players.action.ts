'use server';

import {
    type BoardPlayersProbe,
    probeBoardPlayers,
} from '~src/lib/run-view/board-players';

/**
 * What the submit dialog needs to know about the board a runner just picked:
 * does it credit teams, how many runners does it credit, and is that answer
 * about this slice or about the category as a whole.
 *
 * A thin wrapper — the read itself is `probeBoardPlayers`, shared with the
 * run and manual-time pages, because two copies of one board read are two
 * sets of conditions to drift apart. It keeps the probe's distinctions
 * intact rather than collapsing a failed read, an older deploy and a board
 * that credits one runner into the same answer: a board whose policy cannot
 * be read does not block a submission (guide §11.2), but that is the
 * dialog's decision to make from `ok`, not a fact to lose here.
 */
export async function loadBoardPlayersAction(
    gameSlug: string,
    categorySlug: string,
    subcategoryValues: Record<string, string>,
    timing: 'rt' | 'gt',
): Promise<BoardPlayersProbe> {
    return probeBoardPlayers({
        gameSlug,
        categorySlug,
        subcategoryValues,
        timing,
    });
}
