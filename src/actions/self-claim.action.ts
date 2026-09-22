'use server';

import { getSession } from '~src/actions/session.action';
import { getGameIdentifiers } from '~src/lib/game-mgmt';
import { ModError } from '~src/lib/moderation/mod-fetch';
import {
    revalidateAffectedBoards,
    revalidateRunDetails,
} from '~src/lib/moderation/revalidate-boards';
import { selfCreateManualTime } from '~src/lib/moderation/self-service';
import type {
    FilingStanding,
    SelfManualTimeInput,
} from '../../types/moderation.types';

/** Self-assert / correct your own leaderboard time (§E1). Trust-gated server-side. */
export async function selfClaimTimeAction(input: SelfManualTimeInput): Promise<
    | {
          ok: true;
          applied: 'instant' | 'provisional';
          manualTimeId: number;
          /** Whether the board shows this filing, and what it shows instead
           * (guide §11.9). Absent on an older backend. */
          standing?: FilingStanding;
          /** The same filing came in twice; nothing was written the second
           * time and `manualTimeId` is the row that was already there. */
          resent?: boolean;
      }
    | { error: string }
> {
    const s = await getSession();
    if (!s?.username || !s.id) {
        return { error: 'You must be signed in to submit a time.' };
    }
    try {
        const r = await selfCreateManualTime(s.id, input);
        // The same tags the moderator's door drops, for the same reason: an
        // instantly-applied claim puts a row on the board the success screen
        // links straight to, and a board cached from before it sends the
        // runner to a board their own time is not on. `updateTag` from inside
        // a server action is what makes that read-your-writes.
        //
        // The board is named from what was filed rather than from the
        // backend's `affectedLeaderboards`: the self-serve result carries
        // none, and what was filed is the board it was filed to.
        revalidateRunDetails(
            [],
            [r.manualTimeId, r.secondaryManualTimeId].filter(
                (id): id is number => typeof id === 'number',
            ),
        );
        try {
            const { slug } = await getGameIdentifiers(input.gameId);
            if (slug) {
                await revalidateAffectedBoards(input.gameId, slug, [
                    {
                        categoryId: input.categoryId,
                        subcategoryKey: input.subcategoryKey ?? '',
                    },
                ]);
            }
        } catch {
            // Best-effort: the claim landed, and the TTL catches up.
        }
        return {
            ok: true,
            applied: r.applied,
            manualTimeId: r.manualTimeId,
            standing: r.standing,
            resent: r.resent,
        };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Something went wrong. Please try again.' };
    }
}
