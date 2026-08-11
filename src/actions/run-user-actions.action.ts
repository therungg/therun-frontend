'use server';

import { getSession } from '~src/actions/session.action';
import { ModError } from '~src/lib/moderation/mod-fetch';
import { createReport } from '~src/lib/moderation/reports';
import {
    revalidateAffectedBoards,
    revalidateBoardsForRuleScope,
    revalidateRunDetails,
} from '~src/lib/moderation/revalidate-boards';
import { appealRun, getRunHistory } from '~src/lib/moderation/runs';
import {
    selfAnonymizeApply,
    selfAnonymizeLift,
    selfAnonymizeState,
    selfEligibleRuns,
    selfMoveRun,
    selfRunVerdict,
} from '~src/lib/moderation/self-service';
import type {
    HistoryEvent,
    SelfAnonymizeState,
    UserEligibleRunRow,
} from '../../types/moderation.types';

type Result<T = unknown> = ({ ok: true } & T) | { error: string };

function toError(e: unknown): { error: string } {
    if (e instanceof ModError) return { error: e.message };
    return { error: 'Something went wrong. Please try again.' };
}

/** Report another runner's run (§F1). Any signed-in user. */
export async function reportRunAction(
    runId: number,
    reason: string,
): Promise<Result<{ reported: boolean }>> {
    const s = await getSession();
    if (!s?.username || !s.id) {
        return { error: 'You must be signed in to report a run.' };
    }
    try {
        const r = await createReport(s.id, { runId, reason: reason.trim() });
        return { ok: true, reported: r.reported };
    } catch (e) {
        return toError(e);
    }
}

/** Appeal a verdict on your own run (§G2). */
export async function appealRunAction(
    runId: number,
    reason: string,
): Promise<Result> {
    const s = await getSession();
    if (!s?.username || !s.id) {
        return { error: 'You must be signed in to appeal.' };
    }
    try {
        await appealRun(s.id, runId, { reason: reason.trim() });
        revalidateRunDetails([runId]);
        return { ok: true };
    } catch (e) {
        return toError(e);
    }
}

/** Self reject / unreject your own run (§E3). */
export async function selfRunVerdictAction(
    runId: number,
    action: 'reject' | 'unreject',
    reason?: string,
): Promise<Result<{ applied: 'instant' | 'provisional'; noop?: boolean }>> {
    const s = await getSession();
    if (!s?.username || !s.id) {
        return { error: 'You must be signed in.' };
    }
    try {
        const r = await selfRunVerdict(s.id, runId, {
            action,
            reason: reason?.trim() || undefined,
        });
        revalidateRunDetails([runId]);
        return { ok: true, applied: r.applied, noop: r.noop };
    } catch (e) {
        return toError(e);
    }
}

/** Your own eligible-runs roster in a game — owner counterpart of the mod route. */
export async function loadSelfEligibleRunsAction(
    gameId: number,
): Promise<Result<{ rows: UserEligibleRunRow[] }>> {
    const s = await getSession();
    if (!s?.username || !s.id) {
        return { error: 'You must be signed in.' };
    }
    try {
        const rows = await selfEligibleRuns(s.id, gameId);
        return { ok: true, rows };
    } catch (e) {
        return toError(e);
    }
}

/**
 * Move your own run to a different category/subcategory. Always re-verifies
 * (may demote a verified run to pending on the target board) and is refused
 * if the run sits under a moderator-placed board override.
 *
 * Takes `gameId`/`gameSlug` (not part of the backend's request body) because
 * the board cache invalidation below needs both — mirrors the mod board-move
 * pattern in `submit-run.action.ts` (`revalidateAffectedBoards`).
 */
export async function selfMoveRunAction(
    gameSlug: string,
    gameId: number,
    runId: number,
    target: { categoryId: number; subcategoryKey: string },
): Promise<Result<{ reverify: boolean }>> {
    const s = await getSession();
    if (!s?.username || !s.id) {
        return { error: 'You must be signed in.' };
    }
    try {
        const r = await selfMoveRun(s.id, runId, target);
        revalidateRunDetails([runId]);
        try {
            await revalidateAffectedBoards(gameId, gameSlug, [target]);
        } catch {
            // Best-effort cache invalidation; the move already succeeded.
        }
        return { ok: true, reverify: r.reverify };
    } catch (e) {
        return toError(e);
    }
}

/** Read whether the caller is currently hidden (by any covering rule) in a game. */
export async function selfAnonymizeStateAction(
    gameId: number,
): Promise<Result<{ state: SelfAnonymizeState }>> {
    const s = await getSession();
    if (!s?.username || !s.id) {
        return { error: 'You must be signed in.' };
    }
    try {
        const state = await selfAnonymizeState(s.id, gameId);
        return { ok: true, state };
    } catch (e) {
        return toError(e);
    }
}

/**
 * Apply the caller's own game-wide "hide my identity" rule. The response's
 * `alreadyExists` does not prove ownership of the resulting rule — callers
 * that need to know should follow up with `selfAnonymizeStateAction`.
 */
export async function selfAnonymizeApplyAction(
    gameSlug: string,
    gameId: number,
): Promise<Result<{ displayName: string }>> {
    const s = await getSession();
    if (!s?.username || !s.id) {
        return { error: 'You must be signed in.' };
    }
    try {
        const r = await selfAnonymizeApply(s.id, gameId);
        // Anonymize is a game-wide rule (categoryId: null) spanning every
        // category's boards, not a single (categoryId, subcategoryKey) pair —
        // use the rule-scoped variant, same as a mod's game-wide exclusion rule.
        try {
            await revalidateBoardsForRuleScope(gameId, gameSlug, null);
        } catch {
            // Best-effort cache invalidation; the apply already succeeded.
        }
        return { ok: true, displayName: r.displayName };
    } catch (e) {
        return toError(e);
    }
}

/**
 * Lift the caller's own self-applied "hide my identity" rule for a game.
 * The resulting state may still report `hidden: true` (with
 * `selfApplied: false`) if a moderator's overlapping rule survives.
 */
export async function selfAnonymizeLiftAction(
    gameSlug: string,
    gameId: number,
): Promise<Result<{ state: SelfAnonymizeState }>> {
    const s = await getSession();
    if (!s?.username || !s.id) {
        return { error: 'You must be signed in.' };
    }
    try {
        const state = await selfAnonymizeLift(s.id, gameId);
        try {
            await revalidateBoardsForRuleScope(gameId, gameSlug, null);
        } catch {
            // Best-effort cache invalidation; the lift already succeeded.
        }
        return { ok: true, state };
    } catch (e) {
        return toError(e);
    }
}

/** Public run history timeline (§G1). */
export async function loadRunHistoryAction(
    runId: number,
): Promise<Result<{ events: HistoryEvent[] }>> {
    const s = await getSession();
    try {
        const events = await getRunHistory(runId, s?.id);
        return { ok: true, events };
    } catch (e) {
        return toError(e);
    }
}
