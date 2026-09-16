import type { LeaderboardEntry } from '../../../../../../../types/leaderboards.types';
import { UNDO_VERIFY_REASON, undoReason } from '../shared/action-model';
import { manualTimeVerdictAction } from '../shared/actions/manual-times.action';
import { markRunsAction } from '../shared/actions/marks.action';
import { restoreRunsAction } from '../shared/actions/restore.action';
import { applyVerdictsAction } from '../shared/actions/verdicts.action';
import type { UndoResult } from '../shared/undo-toast';
import { requestVideoAction } from '../worklist/actions/worklist.action';
import type { RunSheetSummary } from './sheet-types';
import {
    type ModerateVerb,
    type RunVerbState,
    runVerbs,
    type VerbAvailability,
} from './verbs';

export type RunStatus = LeaderboardEntry['verificationStatus'];

/**
 * The run's state for the verbs. A run reads it from its loaded summary
 * (status, removed, marked and videos come from the server); before that
 * lands, and for manual times which have no summary, from the entry.
 */
export function runVerbState(
    entry: LeaderboardEntry,
    summary: RunSheetSummary | null,
    opts: { inScope: boolean; scopeLabel?: string },
): RunVerbState {
    return {
        status: summary?.status ?? entry.verificationStatus,
        excluded: summary?.excluded ?? false,
        hasVideo: summary ? summary.vodUrls.length > 0 : Boolean(entry.vodUrl),
        isManual: entry.source === 'manual',
        marked: summary?.marked ?? false,
        inScope: opts.inScope,
        scopeLabel: opts.scopeLabel,
    };
}

const NOT_FOR_MANUAL = 'Not for manual times';

/** Verbs that read removed or marked, which only the summary knows. */
const NEEDS_SUMMARY: ReadonlySet<ModerateVerb> = new Set([
    'remove',
    'restore',
    'mark',
]);

/** A manual time has no run behind it: these need one. */
const NEEDS_RUN: ReadonlySet<ModerateVerb> = new Set([
    'send_back',
    'ask_video',
    'mark',
    'restore',
    'hide_identity',
]);

/**
 * `runVerbs` plus what only the run tab knows: a manual time has no run,
 * a run's removed/marked state is unknown until its summary loads, and Set
 * time files a verified manual time, so it waits for a verdict.
 */
export function runTabVerbs(
    state: RunVerbState,
    opts: { summaryLoaded: boolean; statusKnown?: boolean },
): VerbAvailability[] {
    const off = (verb: ModerateVerb, reason: string): VerbAvailability => ({
        verb,
        enabled: false,
        reason,
    });
    return runVerbs(state).map((a) => {
        if (!a.enabled) return a;
        if (state.isManual) {
            return NEEDS_RUN.has(a.verb) ? off(a.verb, NOT_FOR_MANUAL) : a;
        }
        if (
            !opts.summaryLoaded &&
            (NEEDS_SUMMARY.has(a.verb) ||
                (opts.statusKnown === false &&
                    (a.verb === 'approve' || a.verb === 'decline')))
        ) {
            return off(a.verb, 'Loading');
        }
        if (a.verb === 'set_time' && state.status === 'pending') {
            return off(a.verb, 'Approve or decline first');
        }
        return a;
    });
}

export interface LightVerbContext {
    gameSlug: string;
    runId: number | null;
    manualTimeId: number | null;
    /** Replaces the verb's default reason (Approve only). */
    reason?: string;
}

export type LightVerbResult =
    | { error: string }
    | {
          ok: true;
          /** Null when the verb has no true inverse: plain toast. */
          undo: (() => Promise<UndoResult>) | null;
      };

type LightVerb = 'approve' | 'restore' | 'send_back' | 'ask_video' | 'mark';

export const LIGHT_REASON = {
    approve: 'Approved. No issues found.',
    restore: 'Restored after review.',
    send_back: 'Verification unset. Back to pending.',
} as const;

export const unwrap = async <T extends object>(
    p: Promise<T | { error: string }>,
): Promise<UndoResult> => {
    const res = await p;
    return 'error' in res ? { error: res.error } : { ok: true };
};

/** One-click verbs: the call, and the inverse the undo toast runs. */
export const runVerbHandlers: Record<
    LightVerb,
    (ctx: LightVerbContext) => Promise<LightVerbResult>
> = {
    approve: async ({ gameSlug, runId, manualTimeId, reason }) => {
        if (runId == null) {
            if (manualTimeId == null) return { error: 'Nothing to approve.' };
            const res = await manualTimeVerdictAction(
                gameSlug,
                manualTimeId,
                'verify',
                reason ?? LIGHT_REASON.approve,
            );
            if ('error' in res) return res;
            // A manual verdict has no unverify.
            return { ok: true, undo: null };
        }
        const res = await applyVerdictsAction(
            gameSlug,
            'verify',
            [runId],
            reason ?? LIGHT_REASON.approve,
        );
        if ('error' in res) return res;
        return {
            ok: true,
            undo: () =>
                unwrap(
                    applyVerdictsAction(
                        gameSlug,
                        'unverify',
                        [runId],
                        UNDO_VERIFY_REASON,
                    ),
                ),
        };
    },
    restore: async ({ gameSlug, runId }) => {
        if (runId == null) return { error: 'Manual times have no restore.' };
        const res = await restoreRunsAction(
            gameSlug,
            [runId],
            LIGHT_REASON.restore,
        );
        if ('error' in res) return res;
        return { ok: true, undo: null };
    },
    send_back: async ({ gameSlug, runId }) => {
        if (runId == null) return { error: NOT_FOR_MANUAL };
        const res = await applyVerdictsAction(
            gameSlug,
            'unverify',
            [runId],
            LIGHT_REASON.send_back,
        );
        if ('error' in res) return res;
        return {
            ok: true,
            undo: () =>
                unwrap(
                    applyVerdictsAction(
                        gameSlug,
                        'verify',
                        [runId],
                        undoReason('unverify'),
                    ),
                ),
        };
    },
    ask_video: async ({ gameSlug, runId }) => {
        if (runId == null) return { error: NOT_FOR_MANUAL };
        const res = await requestVideoAction(gameSlug, [runId]);
        if ('error' in res) return res;
        return { ok: true, undo: null };
    },
    mark: async ({ gameSlug, runId }) => {
        if (runId == null) return { error: NOT_FOR_MANUAL };
        const res = await markRunsAction(gameSlug, [runId], true);
        if ('error' in res) return res;
        return {
            ok: true,
            undo: () => unwrap(markRunsAction(gameSlug, [runId], false)),
        };
    },
};

export const isLightRunVerb = (verb: ModerateVerb): verb is LightVerb =>
    verb in runVerbHandlers;
