'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import {
    correctRunTimeAction,
    revalidateSelfBoardsAction,
} from '~src/actions/run-user-actions.action';
import { selfSetManualEvidenceAction } from '~src/actions/self-evidence.action';
import { DurationField } from '~src/components/time-input/duration-field';
import { clockName } from '~src/components/time-input/run-times-field';
import { BoardDialog } from '../shared/board-dialog';
import confirmStyles from '../shared/confirm-dialog.module.scss';
import styles from './correct-time-dialog.module.scss';

export interface CorrectTimeBoard {
    gameSlug: string;
    gameId: number;
    categoryId: number;
    subcategoryKey: string;
}

export interface CorrectTimeDialogProps {
    /** A manual time has no in-place time edit: only the emulator box. */
    kind?: 'run' | 'manual';
    /** The run's id, or the manual time's. */
    id: number;
    /** The run's real time as it stands. Unused on a manual time. */
    timeMs: number | null;
    /** The run's game time; the field only shows when the run has one. */
    gameTimeMs: number | null;
    /** What the board calls its game-time clock. */
    gameTimeLabel?: string;
    /** A verified run goes back to a moderator on any change — say so. */
    verified: boolean;
    /** Whether it was played on an emulator; the box only shows when set. */
    emulator?: boolean;
    emulatorPolicy?: 'allowed' | 'banned' | null;
    /** The board the run sits on, so it shows the new time right away. */
    board: CorrectTimeBoard;
    open: boolean;
    onClose: () => void;
    /** After a saved correction. The dialog already toasts and refreshes. */
    onDone?: () => void;
}

/**
 * Correct your own run's time in place (`POST /v1/me/runs/{id}/time`), and
 * whether it was on an emulator. A manual time only gets the emulator box.
 */
export function CorrectTimeDialog(props: CorrectTimeDialogProps) {
    const titleId = useId();
    return (
        <BoardDialog
            open={props.open}
            onClose={props.onClose}
            labelledBy={titleId}
            size="sm"
        >
            {/* Mounted per opening, so the fields start from the run's
                current time every time. */}
            {props.open && <CorrectTimeForm {...props} titleId={titleId} />}
        </BoardDialog>
    );
}

function CorrectTimeForm({
    kind = 'run',
    id,
    timeMs,
    gameTimeMs,
    gameTimeLabel = 'igt',
    verified,
    emulator,
    emulatorPolicy,
    board,
    onClose,
    onDone,
    titleId,
}: CorrectTimeDialogProps & { titleId: string }) {
    const router = useRouter();
    const [rt, setRt] = useState<number | null>(timeMs);
    const [gt, setGt] = useState<number | null>(gameTimeMs);
    const [emu, setEmu] = useState(emulator === true);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();
    const emuId = useId();

    const isRun = kind === 'run';
    const hasGt = isRun && gameTimeMs != null;
    const rtChanged = isRun && rt !== timeMs;
    const gtChanged = hasGt && gt !== gameTimeMs;
    const timeChanged = rtChanged || gtChanged;
    // A game that bans emulators still lets a run marked as one be unmarked.
    const showEmu =
        emulator !== undefined &&
        (emulatorPolicy !== 'banned' || emulator === true);
    const emuChanged = showEmu && emu !== (emulator === true);
    // Game time can be changed, never cleared: only a number reaches the
    // backend, so an emptied field is not a valid correction.
    const valid =
        !isRun || (rt != null && rt > 0 && (!hasGt || (gt != null && gt > 0)));
    const canSave = valid && (timeChanged || emuChanged) && !pending;

    const close = () => {
        if (!pending) onClose();
    };

    const save = () => {
        if (!canSave) return;
        setError(null);
        startTransition(async () => {
            const res = isRun
                ? await correctRunTimeAction(id, {
                      timeMs: timeChanged && rt != null ? rt : undefined,
                      gameTimeMs: gtChanged ? gt : undefined,
                      emulator: emuChanged ? emu : undefined,
                  })
                : await selfSetManualEvidenceAction(id, { emulator: emu });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            await revalidateSelfBoardsAction(board.gameSlug, board.gameId, [
                {
                    categoryId: board.categoryId,
                    subcategoryKey: board.subcategoryKey,
                },
            ]);
            toast.success(timeChanged ? 'Time corrected' : 'Saved');
            onClose();
            onDone?.();
            router.refresh();
        });
    };

    return (
        <>
            <div className={confirmStyles.header}>
                <h5 className={confirmStyles.title} id={titleId}>
                    Correct this time
                </h5>
            </div>
            <div className={confirmStyles.body}>
                {isRun && (
                    <div className={styles.fields}>
                        <DurationField
                            label={clockName('realtime', gameTimeLabel)}
                            value={rt}
                            onChange={setRt}
                            disabled={pending}
                            onEnter={save}
                        />
                        {hasGt && (
                            <DurationField
                                label={clockName('gametime', gameTimeLabel)}
                                value={gt}
                                onChange={setGt}
                                disabled={pending}
                                onEnter={save}
                            />
                        )}
                    </div>
                )}
                {showEmu && (
                    <div
                        className={`form-check ${isRun ? styles.emulator : ''}`}
                    >
                        <input
                            className="form-check-input"
                            type="checkbox"
                            id={emuId}
                            checked={emu}
                            onChange={(e) => setEmu(e.target.checked)}
                            disabled={pending}
                        />
                        <label className="form-check-label" htmlFor={emuId}>
                            Played on an emulator
                        </label>
                    </div>
                )}
                {isRun && verified && (
                    <p className={styles.note}>
                        Changing the time sends the run back to a moderator.
                    </p>
                )}
                {error && (
                    <div className={confirmStyles.errorAlert} role="alert">
                        {error}
                    </div>
                )}
            </div>
            <div className={confirmStyles.footer}>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={close}
                    disabled={pending}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={save}
                    disabled={!canSave}
                >
                    {pending ? 'Saving…' : isRun ? 'Save time' : 'Save'}
                </button>
            </div>
        </>
    );
}
