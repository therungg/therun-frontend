import { getFormattedString } from '~src/components/util/datetime';
import type { RejectionReasonKey } from '../../../../../../types/moderation.types';
import {
    type ConfirmResult,
    declineRuns,
    MIN_REASON,
    type RunConfirmInput,
    type RunRef,
} from '../../manage/moderation/moderate/run-heavy-verbs';
import { runTabVerbs } from '../../manage/moderation/moderate/run-verbs';
import type { SheetBoard } from '../../manage/moderation/moderate/subject';
import type {
    ModerateVerb,
    RunVerbState,
} from '../../manage/moderation/moderate/verbs';
import { manualTimeVerdictAction } from '../../manage/moderation/shared/actions/manual-times.action';
import { REJECTION_REASONS } from '../../manage/moderation/shared/rejection-reasons';
import type { UndoResult } from '../../manage/moderation/shared/undo-toast';
import type { ModContext } from '../load-run-view';
import type { RunViewModel } from '../run-view';

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
    const isManual = model.kind === 'manual';
    return {
        runId: isManual ? null : model.id,
        manualTimeId: isManual ? model.id : null,
        userId: model.userId,
        runnerName: model.runnerName,
        isManual,
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
        isManual: model.kind === 'manual',
        marked: mod.review?.markedForLater ?? false,
        inScope: true,
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
                (a) =>
                    a.enabled &&
                    (removedKnown || state.isManual || a.verb !== 'send_back'),
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
 * Reject with a reason key and the note to the runner. A run takes the key
 * and the note (or the key's label); its undo puts it back to pending. A
 * manual time needs written words: an empty note sends the label, a note
 * shorter than that is refused, and it has no undo.
 */
export async function rejectRun(
    gameSlug: string,
    run: RunRef,
    key: RejectionReasonKey,
    note: string,
): Promise<ConfirmResult> {
    const label = REJECTION_REASONS.find((r) => r.key === key)?.label ?? '';
    if (run.runId != null) {
        return declineRuns(gameSlug, [run.runId], note || label, key);
    }
    if (run.manualTimeId == null) {
        return { error: 'This entry has no run behind it.' };
    }
    if (note.length > 0 && note.length < MIN_REASON) {
        return { error: `Note: required, ${MIN_REASON} characters or more.` };
    }
    const res = await manualTimeVerdictAction(
        gameSlug,
        run.manualTimeId,
        'reject',
        note || label,
    );
    if ('error' in res) return res;
    return { ok: true, undo: null };
}
