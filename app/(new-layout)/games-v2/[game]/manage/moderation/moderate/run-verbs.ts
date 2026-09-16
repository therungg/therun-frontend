import type { LeaderboardEntry } from '../../../../../../../types/leaderboards.types';
import type { HistoryEvent } from '../../../../../../../types/moderation.types';
import { UNDO_VERIFY_REASON, undoReason } from '../shared/action-model';
import {
    manualTimeVerdictAction,
    updateManualTimeAction,
} from '../shared/actions/manual-times.action';
import { markRunsAction } from '../shared/actions/marks.action';
import { restoreRunsAction } from '../shared/actions/restore.action';
import { applyVerdictsAction } from '../shared/actions/verdicts.action';
import type { UndoResult } from '../shared/undo-toast';
import { requestVideoAction } from '../worklist/actions/worklist.action';
import type { ModerateVerb, RunVerbState, VerbAvailability } from './verbs';

export type RunStatus = LeaderboardEntry['verificationStatus'];

const EXCLUDE_ACTIONS = new Set([
    'exclude_run',
    'bulk_exclude',
    'exclude_via_rule',
]);
const INCLUDE_ACTIONS = new Set(['include_run', 'bulk_include']);

/**
 * Removed and marked are not on a board entry. Both are read from the run's
 * history instead: the newest exclude/include event decides removed, the
 * newest mark/unmark event decides marked. `history` is newest first.
 * Null when the history holds no event of that kind.
 */
export function flagsFromHistory(history: HistoryEvent[]): {
    excluded: boolean | null;
    marked: boolean | null;
} {
    let excluded: boolean | null = null;
    let marked: boolean | null = null;
    for (const e of history) {
        if (excluded === null) {
            if (EXCLUDE_ACTIONS.has(e.action)) excluded = true;
            else if (INCLUDE_ACTIONS.has(e.action)) excluded = false;
        }
        if (marked === null) {
            if (e.action === 'mark_run') marked = true;
            else if (e.action === 'unmark_run') marked = false;
        }
        if (excluded !== null && marked !== null) break;
    }
    return { excluded, marked };
}

export function runVerbState(
    entry: LeaderboardEntry,
    opts: {
        status?: RunStatus;
        excluded?: boolean;
        marked: boolean;
        inScope: boolean;
        scopeLabel?: string;
    },
): RunVerbState {
    return {
        status: opts.status ?? entry.verificationStatus,
        // A board entry carries no exclusion flag; the caller passes the one
        // read from history (flagsFromHistory) once it has loaded.
        excluded:
            opts.excluded ??
            Boolean((entry as { excluded?: boolean }).excluded),
        hasVideo: Boolean(entry.vodUrl),
        isManual: entry.source === 'manual',
        marked: opts.marked,
        inScope: opts.inScope,
        scopeLabel: opts.scopeLabel,
    };
}

const NOT_FOR_MANUAL = 'Not for manual times';

/**
 * A manual time has no run behind it: no pending-again, no video request,
 * no mark, no restore and no run-scoped identity rule. Those verbs stay in
 * place, greyed, with the reason.
 */
export function runAvailability(
    list: VerbAvailability[],
    isManual: boolean,
): VerbAvailability[] {
    if (!isManual) return list;
    const off: ReadonlySet<ModerateVerb> = new Set([
        'send_back',
        'ask_video',
        'mark',
        'restore',
        'hide_identity',
        'retime',
    ]);
    return list.map((a) =>
        off.has(a.verb) && a.enabled
            ? { verb: a.verb, enabled: false, reason: NOT_FOR_MANUAL }
            : a,
    );
}

export interface LightVerbContext {
    gameSlug: string;
    runId: number | null;
    manualTimeId: number | null;
}

export type LightVerbResult =
    | { error: string }
    | {
          ok: true;
          /** Null when the verb has no true inverse: plain toast. */
          undo: (() => Promise<UndoResult>) | null;
          /** The state the run is in once the verb landed. */
          status?: RunStatus;
          excluded?: boolean;
          marked?: boolean;
      };

type LightVerb = 'approve' | 'restore' | 'send_back' | 'ask_video' | 'mark';

export const LIGHT_REASON = {
    approve: 'Approved. No issues found.',
    restore: 'Restored after review.',
    send_back: 'Verification unset. Back to pending.',
} as const;

const unwrap = async <T extends object>(
    p: Promise<T | { error: string }>,
): Promise<UndoResult> => {
    const res = await p;
    return 'error' in res ? { error: res.error } : { ok: true };
};

/** One-click verbs: the call, and the inverse the undo toast runs. */
export const runVerbHandlers: Record<
    LightVerb,
    (ctx: LightVerbContext, current: RunStatus) => Promise<LightVerbResult>
> = {
    approve: async ({ gameSlug, runId, manualTimeId }) => {
        if (runId == null) {
            if (manualTimeId == null) return { error: 'Nothing to approve.' };
            const res = await manualTimeVerdictAction(
                gameSlug,
                manualTimeId,
                'verify',
                LIGHT_REASON.approve,
            );
            if ('error' in res) return res;
            // A manual verdict has no unverify.
            return { ok: true, undo: null, status: 'verified' };
        }
        const res = await applyVerdictsAction(
            gameSlug,
            'verify',
            [runId],
            LIGHT_REASON.approve,
        );
        if ('error' in res) return res;
        return {
            ok: true,
            status: 'verified',
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
    restore: async ({ gameSlug, runId }, current) => {
        if (runId == null) return { error: 'Manual times have no restore.' };
        const res = await restoreRunsAction(
            gameSlug,
            [runId],
            LIGHT_REASON.restore,
        );
        if ('error' in res) return res;
        // Declined runs go back to pending; removed runs keep their status.
        return {
            ok: true,
            undo: null,
            status: current === 'rejected' ? 'pending' : current,
            excluded: false,
        };
    },
    send_back: async ({ gameSlug, runId }) => {
        if (runId == null) return { error: 'Not for manual times.' };
        const res = await applyVerdictsAction(
            gameSlug,
            'unverify',
            [runId],
            LIGHT_REASON.send_back,
        );
        if ('error' in res) return res;
        return {
            ok: true,
            status: 'pending',
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
        if (runId == null) return { error: 'Not for manual times.' };
        const res = await requestVideoAction(gameSlug, [runId]);
        if ('error' in res) return res;
        return { ok: true, undo: null };
    },
    mark: async ({ gameSlug, runId }) => {
        if (runId == null) return { error: 'Not for manual times.' };
        const res = await markRunsAction(gameSlug, [runId], true);
        if ('error' in res) return res;
        return {
            ok: true,
            marked: true,
            undo: () => unwrap(markRunsAction(gameSlug, [runId], false)),
        };
    },
};

export const isLightRunVerb = (verb: ModerateVerb): verb is LightVerb =>
    verb in runVerbHandlers;

/** Undo for a corrected manual time: put the old time back. */
export const revertManualTime = (
    gameSlug: string,
    manualTimeId: number,
    oldTimeMs: number,
): Promise<UndoResult> =>
    unwrap(
        updateManualTimeAction(gameSlug, manualTimeId, {
            reason: 'Undo of set time',
            timeMs: oldTimeMs,
        }),
    );
