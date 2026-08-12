'use server';

import { getRunnerGameEntries } from '~src/lib/leaderboards-v1';
import type { RunnerEntriesResult } from '../../types/leaderboards.types';

/**
 * Client-callable lookup for the submit dialog's runner step: what does this
 * runner already hold on this game's boards?
 *
 * Public data — no session gate, the backend route is public too. A failure
 * is surfaced as a message rather than thrown, because the step renders the
 * result inline and a rejected action would blank the dialog mid-flow.
 */
export async function lookupRunnerEntriesAction(
    gameId: number,
    ref: { username: string } | { guestName: string },
): Promise<RunnerEntriesResult | { error: string }> {
    try {
        return await getRunnerGameEntries(gameId, ref);
    } catch {
        return { error: 'Could not check this runner. Try again.' };
    }
}
