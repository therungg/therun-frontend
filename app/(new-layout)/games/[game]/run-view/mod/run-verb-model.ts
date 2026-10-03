import { getFormattedString } from '~src/components/util/datetime';
import type { RejectionReasonKey } from '../../../../../../types/moderation.types';
import {
    type ConfirmResult,
    declineRuns,
    type RunConfirmInput,
    type RunRef,
} from '../../manage/moderation/moderate/run-heavy-verbs';
import { runTabVerbs } from '../../manage/moderation/moderate/run-verbs';
import type { SheetBoard } from '../../manage/moderation/moderate/subject';
import type {
    ModerateVerb,
    RunVerbState,
} from '../../manage/moderation/moderate/verbs';
import { undoReason } from '../../manage/moderation/shared/action-model';
import { applyVerdictsAction } from '../../manage/moderation/shared/actions/verdicts.action';
import { REJECTION_REASONS } from '../../manage/moderation/shared/rejection-reasons';
import type { UndoResult } from '../../manage/moderation/shared/undo-toast';
import { isSameRunner } from '../../shared/is-same-runner';
import type { ModContext } from '../load-run-view';
import type { RunViewModel } from '../run-view';
import { chunkIds } from './reject-scope';

/** The verbs the run view opens a dialog for. Reject has its own. */
export type HeavyVerb = Extract<
    RunConfirmInput['verb'],
    'set_time' | 'retime' | 'move' | 'remove'
>;

export type VerdictVerb =
    | 'verify'
    | 'reject'
    | 'send_back'
    | 'restore'
    | 'remove';

export type VerdictOutcome = {
    verb: VerdictVerb;
    message: string;
    undo: (() => Promise<UndoResult>) | null;
};

/** The run as the shared verb functions take it. */
export function runRefOf(model: RunViewModel, board: SheetBoard): RunRef {
    return {
        runId: model.id,
        userId: model.userId,
        runnerName: model.runnerName,
        timeMs: primaryMsOf(model, board),
        realTimeMs: model.realTime,
        gameTimeMs: model.gameTime,
    };
}

/** The time the board ranks this run by. */
export function primaryMsOf(
    model: Pick<RunViewModel, 'realTime' | 'gameTime'>,
    board: SheetBoard,
): number | null {
    return board.primaryTiming === 'gt'
        ? (model.gameTime ?? model.realTime)
        : model.realTime;
}

/**
 * Whether the viewer ran this, is on its roster, or typed it in. Nobody
 * verifies their own run; the backend refuses it too.
 */
export function isOwnRun(
    model: RunViewModel,
    sessionUsername: string | null,
): boolean {
    if (!sessionUsername) return false;
    if (model.userId != null && isSameRunner(sessionUsername, model.runnerName))
        return true;
    if (
        (model.participants ?? []).some(
            (m) => m.userId != null && isSameRunner(sessionUsername, m.name),
        )
    )
        return true;
    return (
        model.origin?.path === 'submission' &&
        isSameRunner(sessionUsername, model.origin.submittedBy?.name)
    );
}

export function verbStateOf(
    model: RunViewModel,
    mod: ModContext,
): RunVerbState {
    return {
        status: model.verificationStatus,
        // Unknown without provenance: the status then reads from the
        // verdict alone, and allowedVerbs hides what depends on it.
        excluded: mod.provenance?.moderation.excluded ?? false,
        hasVideo: Boolean(model.vodUrl),
        marked: mod.review?.markedForLater ?? false,
        inScope: true,
        canConfigure: mod.canConfigure,
    };
}

/**
 * The verbs that apply to the run as it stands. Everything else is hidden.
 * Without the provenance read nobody knows whether a moderator removed the
 * run, so the verbs that turn on it (remove, restore, mark, send back) stay
 * hidden rather than guess.
 */
export function allowedVerbs(
    state: RunVerbState,
    removedKnown: boolean,
): Set<ModerateVerb> {
    return new Set(
        runTabVerbs(state, { summaryLoaded: removedKnown })
            .filter(
                (a) => a.enabled && (removedKnown || a.verb !== 'send_back'),
            )
            .map((a) => a.verb),
    );
}

/** "Verified · orbit_runs · 16 Star · 15:39" */
export function outcomeLine(
    label: string,
    model: RunViewModel,
    board: SheetBoard,
): string {
    const ms = primaryMsOf(model, board);
    const parts = [label, model.runnerName, model.categoryDisplay];
    if (ms != null) parts.push(getFormattedString(String(ms)));
    return parts.join(' · ');
}

export const VERDICT_LABEL: Record<VerdictVerb, string> = {
    verify: 'Verified',
    reject: 'Rejected',
    send_back: 'Sent back to pending',
    restore: 'Restored',
    remove: 'Removed',
};

export const EDIT_LABEL: Record<Exclude<HeavyVerb, 'remove'>, string> = {
    set_time: 'Time set',
    retime: 'Retimed',
    move: 'Moved',
};

/**
 * Reject with a reason key and the note to the runner (or the key's label).
 * The undo puts the runs back to pending, then re-verifies the ones that
 * were verified before (unreject alone would leave them pending).
 */
export async function rejectRun(
    gameSlug: string,
    run: RunRef,
    key: RejectionReasonKey,
    note: string,
    runIds?: number[],
    verifiedRunIds: number[] = [],
): Promise<ConfirmResult> {
    const label = REJECTION_REASONS.find((r) => r.key === key)?.label ?? '';
    if (run.runId == null) {
        return { error: 'This entry has no run behind it.' };
    }
    const ids = runIds && runIds.length > 0 ? runIds : [run.runId];
    // Verdicts take 500 ids a call. A failed batch stops the rest. The
    // batches already applied stay rejected and no undo is offered;
    // retrying is safe because already-rejected runs are skipped.
    const undos: Array<() => Promise<UndoResult>> = [];
    let applied = 0;
    for (const batch of chunkIds(ids)) {
        const res = await declineRuns(gameSlug, batch, note || label, key);
        if ('error' in res) {
            return applied === 0
                ? res
                : {
                      error: `${res.error} (${applied} runs were already rejected)`,
                  };
        }
        applied += batch.length;
        if (res.undo) undos.push(res.undo);
    }
    return {
        ok: true,
        undo:
            undos.length === 0
                ? null
                : async () => {
                      for (const u of undos) {
                          const r = await u();
                          if ('error' in r) return r;
                      }
                      for (const batch of chunkIds(verifiedRunIds)) {
                          const r = await applyVerdictsAction(
                              gameSlug,
                              'verify',
                              batch,
                              undoReason('reject'),
                          );
                          if ('error' in r) return { error: r.error };
                      }
                      return { ok: true };
                  },
    };
}
