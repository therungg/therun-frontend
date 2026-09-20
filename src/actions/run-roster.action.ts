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
import { getRunByIdAsViewer } from '~src/lib/run-detail-viewer';
import type { RunDetail } from '../../types/leaderboards.types';

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
 * Whose caches this expires is read from the run itself, before and after the
 * write — never taken from the caller. A credited run shows up on its
 * members' profiles and rankings, so a removal has to expire the person who
 * left and an add the person who joined; a name the client supplied would be
 * unvalidated input reaching a cache API.
 */
export async function editRunRosterAction(
    board: RosterBoardRef,
    participants: RosterMemberInput[],
): Promise<Result<{ updated: boolean }>> {
    const session = await getSession();
    if (!session?.username || !session.id) {
        return { error: 'You must be signed in to change who a run credits.' };
    }

    // Read BEFORE the write: whoever is about to lose their credit is only
    // nameable here. Uncached and as this viewer, like every other read on
    // this page that must not be shared between visitors.
    //
    // Retried once, and that is the point of `readRun`: this is the ONLY
    // moment a removed member can be named, so losing it to one flaky read
    // leaves their profile and rankings showing a run they are no longer
    // credited on until the TTL expires. The read after the write has no
    // such window — the roster it names is the one the run now has.
    const before = await readRun(board.runId, session.id, 2);

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
        // And AFTER: an account added by id has no name in the request, and
        // it is that account's profile the new credit shows up on.
        const after = await readRun(board.runId, session.id, 1);
        // A roster edit is board-mutating in both directions: the run's team
        // key moves, so it can leave the board it was ranked on and re-enter
        // it the moment the roster satisfies the board's player policy again.
        for (const name of creditedNames(before, after, session.username)) {
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

/**
 * Everyone whose credit on this run may have moved: the filer and every
 * roster member, as the run looked before the edit and as it looks after,
 * plus the person who made it. A masked member contributes their placeholder
 * name, which is a tag nothing is cached under — harmless, and cheaper than
 * a special case.
 */
/**
 * The run as this viewer sees it, uncached, or null once `attempts` reads have
 * failed. A roster edit is never failed for this: the write has either not
 * happened yet or already landed, and the only cost of giving up is a cache
 * entry that expires on its own.
 */
async function readRun(
    runId: number,
    sessionId: string,
    attempts: number,
): Promise<RunDetail | null> {
    for (let i = 0; i < attempts; i++) {
        try {
            return await getRunByIdAsViewer(runId, sessionId);
        } catch {
            // Fall through to the next attempt, then to null.
        }
    }
    return null;
}

function creditedNames(
    before: RunDetail | null,
    after: RunDetail | null,
    actor: string,
): Set<string> {
    const names = new Set<string>();
    const add = (name: string | null | undefined) => {
        const trimmed = name?.trim();
        if (trimmed) names.add(trimmed);
    };
    for (const run of [before, after]) {
        if (!run) continue;
        add(run.runnerName);
        for (const member of run.participants ?? []) add(member.name);
    }
    add(actor);
    return names;
}
