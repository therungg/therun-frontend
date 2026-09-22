import type {
    SelfAnonymizeApplyResult,
    SelfAnonymizeState,
    SelfDeleteManualTimeResult,
    SelfManualTimeInput,
    SelfManualTimeResult,
    SelfMoveRunInput,
    SelfMoveRunResult,
    SelfRunVerdictInput,
    SelfRunVerdictResult,
    UserEligibleRunRow,
} from '../../../types/moderation.types';
import { meFetch } from './mod-fetch';
import type { RosterMemberInput } from './run-roster';

/** Self-assert a manual time on your own runner (§E1). Trust-gated server-side. */
export function selfCreateManualTime(
    sessionId: string,
    input: SelfManualTimeInput,
): Promise<SelfManualTimeResult> {
    return meFetch('/v1/me/manual-times', {
        sessionId,
        method: 'POST',
        body: input,
    });
}

/**
 * Change who a manual time credits.
 *
 * Body-dispatched on the SAME route a filing uses: `manualTimeId` is what
 * makes this an edit rather than a submission, and the body then carries
 * `manualTimeId` and `participants` and NOTHING ELSE — any other field is a
 * 400 that names it (docs/frontend-guide-co-op-runs.md §11.3). Despite the
 * `/me/` path it is not owner-only: a partner taking themselves off and a
 * moderator repairing a roster both come through here, and the server's
 * `checkRosterEdit` decides which of them may do what.
 *
 * Send the WHOLE roster you want, not a delta. A two-clock submission is two
 * rows and one result — the edit rewrites the seats on both. `updated: false`
 * means the roster sent is the roster it already had: success, not a retry.
 */
export function editManualTimeRoster(
    sessionId: string,
    manualTimeId: number,
    participants: RosterMemberInput[],
): Promise<{ updated: boolean }> {
    return meFetch('/v1/me/manual-times', {
        sessionId,
        method: 'POST',
        body: { manualTimeId, participants },
    });
}

/** Delete your own manual time (§E2). No reason required. */
export function selfDeleteManualTime(
    sessionId: string,
    id: number,
): Promise<SelfDeleteManualTimeResult> {
    return meFetch(`/v1/me/manual-times/${id}`, {
        sessionId,
        method: 'DELETE',
    });
}

/** Self reject/unreject one of your own finished runs (§E3). */
export function selfRunVerdict(
    sessionId: string,
    runId: number,
    input: SelfRunVerdictInput,
): Promise<SelfRunVerdictResult> {
    return meFetch(`/v1/me/runs/${runId}/verdict`, {
        sessionId,
        method: 'POST',
        body: input,
    });
}

/** Your own eligible-runs roster in a game (owner counterpart of the mod route). */
export function selfEligibleRuns(
    sessionId: string,
    gameId: number,
): Promise<UserEligibleRunRow[]> {
    return meFetch('/v1/me/eligible-runs', {
        sessionId,
        query: { gameId },
    });
}

/**
 * Move your own run to a different category/subcategory board. Always
 * re-verifies (demotes verified -> pending) and is refused if the run sits
 * under a moderator-placed board override.
 */
export function selfMoveRun(
    sessionId: string,
    runId: number,
    input: SelfMoveRunInput,
): Promise<SelfMoveRunResult> {
    return meFetch(`/v1/me/runs/${runId}/move`, {
        sessionId,
        method: 'POST',
        body: input,
    });
}

/** Read whether the caller is currently hidden (by any covering rule) in a game. */
export function selfAnonymizeState(
    sessionId: string,
    gameId: number,
): Promise<SelfAnonymizeState> {
    return meFetch('/v1/me/anonymize', {
        sessionId,
        query: { gameId },
    });
}

/**
 * Apply the caller's own game-wide "hide my identity" rule. `alreadyExists`
 * does not prove the caller owns the resulting rule — re-GET via
 * `selfAnonymizeState` to learn `selfApplied`.
 */
export function selfAnonymizeApply(
    sessionId: string,
    gameId: number,
): Promise<SelfAnonymizeApplyResult> {
    return meFetch('/v1/me/anonymize', {
        sessionId,
        method: 'POST',
        body: { gameId },
    });
}

/**
 * Lift the caller's own self-applied rule for a game. Returns the actual
 * resulting state — may still report `hidden: true` (with `selfApplied:
 * false`) if a moderator's overlapping rule survives.
 */
export function selfAnonymizeLift(
    sessionId: string,
    gameId: number,
): Promise<SelfAnonymizeState> {
    return meFetch('/v1/me/anonymize', {
        sessionId,
        method: 'DELETE',
        body: { gameId },
    });
}
