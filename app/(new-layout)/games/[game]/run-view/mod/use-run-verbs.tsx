'use client';

import { type ReactNode, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type { RejectionReasonKey } from '../../../../../../types/moderation.types';
import {
    confirmRunVerb,
    previewRunVerb,
    type RunConfirmInput,
} from '../../manage/moderation/moderate/run-heavy-verbs';
import {
    runVerbHandlers,
    unwrap,
} from '../../manage/moderation/moderate/run-verbs';
import type { RunVerbState } from '../../manage/moderation/moderate/verbs';
import { markRunsAction } from '../../manage/moderation/shared/actions/marks.action';
import { setModNoteAction } from '../../manage/moderation/shared/actions/run-fields.action';
import {
    fireUndoToast,
    type UndoResult,
} from '../../manage/moderation/shared/undo-toast';
import type { ModContext } from '../load-run-view';
import type { RunViewModel } from '../run-view';
import { NoteDialog } from './note-dialog';
import { RejectDialog } from './reject-dialog';
import {
    allowedVerbs,
    EDIT_LABEL,
    type HeavyVerb,
    outcomeLine,
    primaryMsOf,
    rejectRun,
    runRefOf,
    VERDICT_LABEL,
    type VerdictOutcome,
    type VerdictVerb,
    verbStateOf,
} from './run-verb-model';
import { VerbDialog } from './verb-dialog';

export type { HeavyVerb, VerdictOutcome } from './run-verb-model';

type Open =
    | { kind: 'reject' }
    | { kind: 'verb'; verb: HeavyVerb; noop: string | null }
    | { kind: 'note' }
    | null;

type Undo = (() => Promise<UndoResult>) | null;

const FAILED = 'Something went wrong. Try again.';

/**
 * Every moderator verb on one run, for the run view: the one-click verdicts,
 * the dialogs for the heavy ones, Reject, the note and the mark. A verdict
 * hands its outcome to `onDone` (the caller owns the undo toast and what
 * happens next); any other change toasts here and calls `onChanged`.
 * Verbs that do not apply to the run's state do nothing.
 */
export function useRunVerbs({
    model,
    mod,
    onDone,
    onChanged,
}: {
    model: RunViewModel;
    mod: ModContext;
    onDone: (o: VerdictOutcome) => void;
    onChanged: () => void;
}) {
    const gameSlug = mod.sheet.gameSlug;
    const board = mod.board;
    const run = runRefOf(model, board);
    const state: RunVerbState = verbStateOf(model, mod);
    const allowed = allowedVerbs(state);

    const [busy, setBusyState] = useState(false);
    const busyRef = useRef(false);
    const [open, setOpen] = useState<Open>(null);

    const act = async (fn: () => Promise<void>) => {
        if (busyRef.current) return;
        busyRef.current = true;
        setBusyState(true);
        try {
            await fn();
        } catch {
            toast.error(FAILED);
        } finally {
            busyRef.current = false;
            setBusyState(false);
        }
    };

    const verdict = (verb: VerdictVerb, undo: Undo) =>
        onDone({
            verb,
            message: outcomeLine(VERDICT_LABEL[verb], model, board),
            undo,
        });

    const changed = (message: string, undo: Undo) => {
        if (undo) fireUndoToast(message, undo, onChanged);
        else toast.success(message);
        onChanged();
    };

    const light = (
        verb: 'approve' | 'restore' | 'send_back' | 'ask_video',
        done: (undo: Undo) => void,
    ) =>
        act(async () => {
            const res = await runVerbHandlers[verb]({
                gameSlug,
                runId: run.runId,
                manualTimeId: run.manualTimeId,
                excluded: state.excluded,
                status: state.status,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            done(res.undo);
        });

    // Nothing runs while a dialog is open or a call is in flight.
    const idle = () => open === null && !busyRef.current;

    const verify = async () => {
        if (!idle() || !allowed.has('approve')) return;
        await light('approve', (undo) => verdict('verify', undo));
    };
    const sendBack = async () => {
        if (!idle() || !allowed.has('send_back')) return;
        await light('send_back', (undo) => verdict('send_back', undo));
    };
    const restore = async () => {
        if (!idle() || !allowed.has('restore')) return;
        await light('restore', (undo) => verdict('restore', undo));
    };
    const askVideo = async () => {
        if (!idle() || !allowed.has('ask_video')) return;
        await light('ask_video', (undo) =>
            changed(`Asked for a video · ${run.runnerName}`, undo),
        );
    };

    const toggleMark = async () => {
        const runId = run.runId;
        if (!idle() || runId == null) return;
        const on = !state.marked;
        await act(async () => {
            const res = await markRunsAction(gameSlug, [runId], on);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            changed(
                `${on ? 'Marked for later' : 'Unmarked'} · ${run.runnerName}`,
                () => unwrap(markRunsAction(gameSlug, [runId], !on)),
            );
        });
    };

    const openReject = () => {
        if (idle() && allowed.has('decline')) setOpen({ kind: 'reject' });
    };

    const openNote = () => {
        if (idle() && run.runId != null) setOpen({ kind: 'note' });
    };

    const openVerb = async (verb: HeavyVerb) => {
        if (!idle() || !allowed.has(verb)) return;
        const runId = run.runId;
        if (verb !== 'remove' || runId == null) {
            setOpen({ kind: 'verb', verb, noop: null });
            return;
        }
        await act(async () => {
            const res = await previewRunVerb(gameSlug, 'remove', [runId]);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setOpen({ kind: 'verb', verb, noop: res.noop });
        });
    };

    const close = () => {
        if (!busyRef.current) setOpen(null);
    };

    const confirmVerb = (input: RunConfirmInput) =>
        act(async () => {
            const res = await confirmRunVerb(
                gameSlug,
                run,
                board,
                input,
                mod.sheet.canSiteBan,
            );
            // Errors keep the dialog open and usable.
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setOpen(null);
            if (input.verb === 'remove') verdict('remove', res.undo);
            else if (input.verb in EDIT_LABEL) {
                const label = EDIT_LABEL[input.verb as keyof typeof EDIT_LABEL];
                changed(
                    res.message ?? `${label} · ${run.runnerName}`,
                    res.undo,
                );
            }
        });

    const submitReject = (key: RejectionReasonKey, note: string) =>
        act(async () => {
            const res = await rejectRun(gameSlug, run, key, note);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setOpen(null);
            verdict('reject', res.undo);
        });

    const saveNote = (note: string) =>
        act(async () => {
            if (run.runId == null) return;
            const res = await setModNoteAction(gameSlug, run.runId, note);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setOpen(null);
            changed('Note saved.', null);
        });

    let dialog: ReactNode = null;
    if (open?.kind === 'reject') {
        dialog = (
            <RejectDialog
                model={model}
                timeMs={primaryMsOf(model, board)}
                busy={busy}
                onCancel={close}
                onSubmit={(key, note) => void submitReject(key, note)}
            />
        );
    } else if (open?.kind === 'verb') {
        dialog = (
            <VerbDialog
                key={open.verb}
                verb={open.verb}
                noop={open.noop}
                model={model}
                mod={mod}
                run={run}
                busy={busy}
                onCancel={close}
                onConfirm={(input) => void confirmVerb(input)}
            />
        );
    } else if (open?.kind === 'note') {
        dialog = (
            <NoteDialog
                initial={mod.review?.modNote ?? ''}
                busy={busy}
                onCancel={close}
                onSave={(note) => void saveNote(note)}
            />
        );
    }

    return {
        busy,
        /** A verb dialog is open: keys and the bar stand down. */
        dialogOpen: open !== null,
        /** The run's state as the verbs read it. */
        state,
        /** Whether a verb applies to the run as it stands. */
        can: (verb: Parameters<typeof allowed.has>[0]) => allowed.has(verb),
        verify,
        sendBack,
        restore,
        openReject,
        openVerb,
        openNote,
        askVideo,
        toggleMark,
        dialog,
    };
}

export type RunVerbs = ReturnType<typeof useRunVerbs>;
