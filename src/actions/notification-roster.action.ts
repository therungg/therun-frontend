'use server';

import { isSameRunner } from '~app/(new-layout)/games/[game]/shared/is-same-runner';
import { getSession } from '~src/actions/session.action';
import { getRunByIdAsViewer } from '~src/lib/run-detail-viewer';
import {
    removalEmptiesRoster,
    rosterBody,
    rosterIsEditable,
} from '~src/lib/run-view/roster';
import type { RunParticipant } from '../../types/leaderboards.types';
import { editRunRosterAction, type RosterBoardRef } from './run-roster.action';

type NotMeResult =
    | { ok: true }
    /** The control can't act safely here — the row should link to the run
     * page instead, with this sentence next to it. */
    | { blocked: true; reason: string }
    | { error: string };

/**
 * "Not me" from inside the bell — the credit notice's one-click way out
 * (guide §3 rule 3: anyone may always remove themselves).
 *
 * It goes through exactly the rules the run page does, not a shortcut: the
 * notification payload's roster is a snapshot at send time, so this reads the
 * run's CURRENT roster, as this viewer, before deciding anything. Two cases
 * refuse to act and hand back a reason to show instead of a broken button:
 * a masked member freezes the whole roster (`rosterIsEditable`), and removing
 * the last member would re-credit the filer instead of leaving nobody
 * credited (`removalEmptiesRoster`) — both cases the run page's own roster
 * editor already refuses the same way.
 *
 * The write itself is `editRunRosterAction`, the same action the run page's
 * roster editor calls — one place decides the cache invalidation and the
 * refusal-passthrough, so the bell and the run page cannot drift.
 */
export async function notificationTakeMeOffAction(
    board: RosterBoardRef,
): Promise<NotMeResult> {
    const session = await getSession();
    if (!session?.username || !session.id) {
        return { error: 'You must be signed in to change who a run credits.' };
    }

    const run = await getRunByIdAsViewer(board.runId, session.id);
    if (!run) {
        return {
            error: 'This run could not be loaded. Open it on the run page instead.',
        };
    }

    const members: RunParticipant[] =
        run.participants && run.participants.length > 0
            ? run.participants
            : [
                  {
                      userId: run.userId,
                      name: run.runnerName,
                      isGuest: run.isGuest,
                      country: run.country ?? null,
                      picture: run.picture ?? null,
                  },
              ];

    const me = members.find(
        (m) => m.userId != null && isSameRunner(session.username, m.name),
    );
    if (!me) {
        return { error: 'You are not on this run.' };
    }

    if (!rosterIsEditable(members)) {
        return {
            blocked: true,
            reason: 'One of the runners on this run has hidden their identity, so who it credits cannot be changed here.',
        };
    }

    if (removalEmptiesRoster(members, me)) {
        return {
            blocked: true,
            reason: 'A run always credits someone, so you cannot take yourself off while you are the only runner on it.',
        };
    }

    const res = await editRunRosterAction(
        board,
        rosterBody(members, (m) => m === me),
    );
    if ('error' in res) return { error: res.error };
    return { ok: true };
}
