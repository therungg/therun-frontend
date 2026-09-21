'use server';

import { isSameRunner } from '~app/(new-layout)/games/[game]/shared/is-same-runner';
import { getSession } from '~src/actions/session.action';
import { getGameIdentifiers } from '~src/lib/game-mgmt';
import {
    getManualTimeByIdAsViewer,
    getRunByIdAsViewer,
} from '~src/lib/run-detail-viewer';
import {
    removalEmptiesRoster,
    rosterBody,
    rosterIsEditable,
} from '~src/lib/run-view/roster';
import type {
    ManualTimeDetail,
    RunDetail,
    RunParticipant,
} from '../../types/leaderboards.types';
import { editRunRosterAction, type RosterTarget } from './run-roster.action';

/**
 * Which entry a bell row is about, as the client may name it: a run's notice
 * carries `runId`, a manual time's carries `manualTimeId` with `runId: null`
 * (guide §11.8). Nothing else from the payload is trusted — see below.
 */
export interface NotificationEntryRef {
    runId?: number | null;
    manualTimeId?: number | null;
}

/** The fields this action reads; both detail payloads carry all of them. */
type EntryDetail = Pick<
    RunDetail,
    | 'gameId'
    | 'gameDisplay'
    | 'categoryId'
    | 'subcategoryKey'
    | 'runnerName'
    | 'userId'
    | 'isGuest'
    | 'participants'
> &
    Pick<ManualTimeDetail, 'gameId'> & {
        country?: string | null;
        picture?: string | null;
    };

type NotMeResult =
    | { ok: true }
    /** The control can't act safely here — the row should link to the run
     * page instead, with this sentence next to it, and drop the button
     * rather than show an error (guide's own tone: this is a fact about the
     * run, not a failure). */
    | { blocked: true; reason: string }
    | { error: string };

/**
 * "Not me" from inside the bell — the credit notice's one-click way out
 * (guide §3 rule 3: anyone may always remove themselves).
 *
 * Takes ONLY the run id from the client. Every board coordinate this needs
 * for cache invalidation — gameId, categorySlug's category id, subcategoryKey
 * — is read back off the run itself, never trusted from the notification
 * payload: a client-supplied gameId/categoryId would let a forged call drop
 * an arbitrary board's cache while nominally acting on the caller's own run.
 * The actual write is runId-scoped on the backend regardless (`checkRosterEdit`
 * decides who may do what from the session and the run, not from anything
 * this action passes in) — this is about not trusting the invalidation
 * target, not about authorization.
 *
 * It goes through exactly the rules the run page does, not a shortcut: the
 * notification payload's roster is a snapshot at send time, so this reads the
 * run's CURRENT roster, as this viewer, before deciding anything. Two cases
 * refuse to act and hand back a reason to show instead of a broken button:
 * a masked member freezes the whole roster (`rosterIsEditable`), and removing
 * the last member would re-credit the filer instead of leaving nobody
 * credited (`removalEmptiesRoster`) — both cases the run page's own roster
 * editor already refuses the same way. A viewer no longer on the run (they
 * already left, or were removed, since the notice was sent) is the same
 * shape of answer: nothing to remove, so this reads as blocked, not an error.
 *
 * The write itself is `editRunRosterAction`, the same action the run page's
 * roster editor calls — one place decides the cache invalidation and the
 * refusal-passthrough, so the bell and the run page cannot drift.
 */
export async function notificationTakeMeOffAction(
    ref: NotificationEntryRef,
): Promise<NotMeResult> {
    const session = await getSession();
    if (!session?.username || !session.id) {
        return { error: 'You must be signed in to change who a run credits.' };
    }

    // WHICH id the client sent is the only thing taken from it — a manual
    // time's bell carries `manualTimeId` with `runId: null` (guide §11.8),
    // so branch on that and on nothing else. Everything the write needs is
    // read back off the authoritative entry below.
    const target: RosterTarget | null =
        typeof ref.manualTimeId === 'number'
            ? { kind: 'manual', id: ref.manualTimeId }
            : typeof ref.runId === 'number'
              ? { kind: 'run', id: ref.runId }
              : null;
    if (!target) {
        return { error: 'This notice does not name an entry to change.' };
    }
    // One word, whichever kind this is. To a runner everything they file is
    // a run: the bell is not the entry's own page, and a bell that says
    // "time" next to another that says "run" reads as two different features.
    // The reads return null only on a 404 — anything else (a backend 5xx, a
    // network blip) throws, and an uncaught throw here would reject the
    // server action and leave the confirm step frozen with no error shown
    // (`editRunRosterAction`'s own `readEntry` wraps the same calls for the
    // same reason).
    let run: EntryDetail | null;
    try {
        run =
            target.kind === 'manual'
                ? await getManualTimeByIdAsViewer(target.id, session.id)
                : await getRunByIdAsViewer(target.id, session.id);
    } catch {
        return {
            error: 'This run could not be loaded right now. Try again.',
        };
    }
    if (!run) {
        return {
            error: 'This run could not be loaded. Open its page instead.',
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
        // Not a failure — the roster moved since the notice was sent (they
        // already left, or a moderator removed them). Say so plainly and
        // drop the button; there is nothing left for it to do.
        return {
            blocked: true,
            reason: 'You are not on this run.',
        };
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

    // Read straight off the authoritative entry, not off anything the client
    // sent. `gameSlug` has no field of its own on either payload — resolved
    // from `gameId` the way every other id-only caller does; a game's
    // display name is an acceptable fallback (the run route's `resolveGame`
    // accepts it too — see buildRunHref's own comment) if the slug lookup
    // comes back empty, so a lookup gap never turns into a silently dropped
    // write.
    const { slug } = await getGameIdentifiers(run.gameId);
    const gameSlug = slug ?? run.gameDisplay;

    const res = await editRunRosterAction(
        {
            target,
            gameId: run.gameId,
            gameSlug,
            categoryId: run.categoryId,
            subcategoryKey: run.subcategoryKey,
        },
        rosterBody(members, (m) => m === me),
    );
    if ('error' in res) return { error: res.error };
    return { ok: true };
}
