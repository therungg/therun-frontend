'use server';

import { getSession } from '~src/actions/session.action';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { ModError } from '~src/lib/moderation/mod-fetch';
import {
    revalidateAffectedBoards,
    revalidateRunDetails,
} from '~src/lib/moderation/revalidate-boards';
import { editRun } from '~src/lib/moderation/run-edit';
import { normalizeVodUrl } from '~src/lib/vod-url';

type Fail = { error: string };

/**
 * The edit endpoint demands a reason (min 10 chars) because it is the generic
 * run-edit path, and most of what it can change is destructive. Attaching
 * evidence isn't: the mod-log row already records who did it and the
 * before/after values, so a typed reason would add nothing but a keystroke
 * tax on the one action we want to be a paste and a click. Stamp the fixed
 * sentence and keep the flow instant.
 */
const ATTACH_REASON = 'Attached video evidence from the board mod drawer.';
const CLEAR_REASON = 'Removed the video link from the board mod drawer.';

/**
 * Set (or clear, with `null`) a run's video link straight from the run
 * inspector. Board reads are cache-busted for the run's own board so the
 * moderator sees their own paste land.
 */
export async function attachVodAction(
    gameSlug: string,
    runId: number,
    rawUrl: string | null,
    board: { categorySlug: string; subcategoryKey: string },
): Promise<{ ok: true; url: string | null } | Fail> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    let url: string | null = null;
    if (rawUrl !== null) {
        const check = normalizeVodUrl(rawUrl);
        if (!check.ok) return { error: check.error };
        url = check.url;
    }

    try {
        await editRun(session.id, runId, {
            vodUrl: url,
            reason: url === null ? CLEAR_REASON : ATTACH_REASON,
        });
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Could not save the video link. Please try again.' };
    }

    // The run's row renders its VOD, so the board's cached read is stale even
    // though board membership didn't change. Map the slug we were given back
    // to its id — revalidateAffectedBoards works in category ids.
    try {
        const { categories } = await resolveCategory(game.id);
        const category = categories.find((c) => c.name === board.categorySlug);
        if (category) {
            await revalidateAffectedBoards(game.id, game.name, [
                {
                    categoryId: category.id,
                    subcategoryKey: board.subcategoryKey,
                },
            ]);
        }
    } catch {
        // Best-effort cache invalidation; the edit itself already landed.
    }
    revalidateRunDetails([runId]);

    return { ok: true, url };
}
