'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { leaderboardsProfileTag } from '~src/lib/leaderboards-profile';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { getCategoryRoster } from '~src/lib/moderation/mass-mgmt';
import { ModError } from '~src/lib/moderation/mod-fetch';
import {
    revalidateAffectedBoards,
    revalidateRunDetails,
} from '~src/lib/moderation/revalidate-boards';
import {
    editRunRoster,
    type RosterMemberInput,
} from '~src/lib/moderation/run-roster';

type Result<T = unknown> = ({ ok: true } & T) | { error: string };

/** Where the run sits, for the cache tags a roster edit has to expire. */
export interface RosterBoardRef {
    runId: number;
    gameId: number;
    gameSlug: string;
    categoryId: number;
    subcategoryKey: string;
}

/**
 * Change who a run credits.
 *
 * Every rule about WHO may do this lives on the server (`checkRosterEdit`),
 * and its refusals are written to be read by the runner — so this passes the
 * backend's message straight through rather than interpreting it. That
 * matters most for "Someone who took themselves off this run cannot be added
 * back.", which no client-side state can predict: the roster payload carries
 * the run's members, not its history of removals.
 *
 * `affectedNames` are the runners whose credit on this run changed — the
 * names on the roster before the edit plus any account added by it. A
 * credited run shows up on its members' profiles and rankings, so those reads
 * are as stale as the run itself once the roster moves.
 */
export async function editRunRosterAction(
    board: RosterBoardRef,
    participants: RosterMemberInput[],
    affectedNames: string[] = [],
): Promise<Result<{ updated: boolean }>> {
    const session = await getSession();
    if (!session?.username || !session.id) {
        return { error: 'You must be signed in to change who a run credits.' };
    }

    let updated: boolean;
    try {
        const res = await editRunRoster(session.id, board.runId, participants);
        updated = res.updated;
    } catch (e) {
        // The 400s and 403s on this route are runner-facing sentences, not
        // error codes. Show them as given (guide §2).
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Something went wrong. Please try again.' };
    }

    // `updated: false` means the roster sent was already the roster on the
    // run — nothing was written, so nothing is stale.
    if (updated) {
        // All `updateTag`, never `revalidateTag`: this runs inside a server
        // action whose whole point is that the person sees their own edit. A
        // stale-while-revalidate tag would hand them back the roster they
        // just changed and make "Take me off this run" look like it failed.
        revalidateRunDetails([board.runId]);
        try {
            await revalidateAffectedBoards(board.gameId, board.gameSlug, [
                {
                    categoryId: board.categoryId,
                    subcategoryKey: board.subcategoryKey,
                },
            ]);
        } catch {
            // Best-effort; the edit already landed and the TTL catches up.
        }
        // A roster edit is board-mutating in both directions: the run's team
        // key moves, so it can leave the board it was ranked on and re-enter
        // it the moment the roster satisfies the board's player policy again.
        for (const name of new Set(
            [...affectedNames, session.username]
                .map((n) => n.trim())
                .filter(Boolean),
        )) {
            updateTag(leaderboardsProfileTag(name));
            updateTag(`user-rankings:name:${name.toLowerCase()}`);
        }
    }

    return { ok: true, updated };
}

/** An account a moderator can credit on a run. */
export interface RosterCandidate {
    userId: number;
    name: string;
}

/**
 * Accounts a moderator can pick from when crediting someone on a run.
 *
 * A roster write names an account by numeric id, and nothing on the public
 * side hands the frontend one: the search index is keyed by name, and a name
 * sent on its own writes a GUEST row. So the picker is fed from the one
 * moderator read that returns ids next to names — the board's own eligible
 * runs, filtered by runner name.
 *
 * The consequence, and it is a real limit: only runners who already have a
 * run in this category can be found here. Anyone else has to be credited as
 * a guest, or the run's own runners have to add them.
 */
export async function findRosterCandidatesAction(
    gameSlug: string,
    gameId: number,
    categoryId: number,
    query: string,
): Promise<Result<{ candidates: RosterCandidate[] }>> {
    const session = await getSession();
    const term = query.trim();
    if (term.length < 2) return { ok: true, candidates: [] };
    if (!session?.id || !canModerateGame(session, gameSlug)) {
        return { error: 'Not authorized to edit runs for this game.' };
    }
    try {
        const rows = await getCategoryRoster(session.id, gameId, categoryId, {
            runnerName: term,
            limit: 50,
        });
        const seen = new Map<number, RosterCandidate>();
        for (const row of rows) {
            if (row.userId == null) continue; // a guest row has no account
            if (!seen.has(row.userId)) {
                seen.set(row.userId, {
                    userId: row.userId,
                    name: row.runnerName,
                });
            }
        }
        return { ok: true, candidates: [...seen.values()].slice(0, 8) };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Could not search for runners. Please try again.' };
    }
}
