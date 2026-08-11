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
