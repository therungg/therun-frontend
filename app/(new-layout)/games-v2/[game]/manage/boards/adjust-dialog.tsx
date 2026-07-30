'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import type {
    LeaderboardRosterRow,
    UserEligibleRunRow,
} from '../../../../../../types/moderation.types';
import { BoardDialog } from '../../shared/board-dialog';
import { loadUserEligibleRunsAction } from '../moderation/shared/actions/eligible-runs.action';
import { excludeAction } from '../moderation/shared/actions/exclude.action';
import { createManualTimeAction } from '../moderation/shared/actions/manual-times.action';
import { restoreRunsAction } from '../moderation/shared/actions/restore.action';
import {
    msToTimeInput,
    parseTimeInput,
} from '../moderation/shared/time-format';
import { fireUndoToast } from '../moderation/shared/undo-toast';
import styles from './board-curation.module.scss';
import { primaryValueOf } from './row-actions';

export interface AdjustDialogProps {
    open: boolean;
    onClose: () => void;
    row: LeaderboardRosterRow;
    category: ResolvedCategory;
    gameSlug: string;
    subcategoryKey: string;
    /** Currently-displayed time for the row, seed for the set-time input. */
    timeMs: number | null;
    onMutated: () => void;
}

/**
 * Adjust a row's board entry: either pick a different one of the runner's
 * own eligible runs on this exact board (excluding whatever's faster than
 * it — boards always surface the best eligible run, so there's no separate
 * pin mechanism), or file a moderator manual time instead. Guests skip the
 * pick-a-run section entirely since `loadUserEligibleRunsAction` is
 * user-scoped; they only ever see the time section.
 */
export function AdjustDialog({
    open,
    onClose,
    row,
    category,
    gameSlug,
    subcategoryKey,
    timeMs,
    onMutated,
}: AdjustDialogProps) {
    const timing: 'rt' | 'gt' = category.primaryTiming === 'gt' ? 'gt' : 'rt';
    const isGuest = row.userId == null;

    // ---- Pick the valid run --------------------------------------------
    const [eligibleRuns, setEligibleRuns] = useState<
        UserEligibleRunRow[] | null
    >(null);
    const [isLoadingEligible, setIsLoadingEligible] = useState(false);
    const [pickError, setPickError] = useState<string | null>(null);
    const [selectedTarget, setSelectedTarget] = useState<number>(row.runId);

    // ---- Set a time instead ---------------------------------------------
    const [timeText, setTimeText] = useState('');
    const [reasonText, setReasonText] = useState('');
    const [timeError, setTimeError] = useState<string | null>(null);

    const [isPending, startTransition] = useTransition();

    // Reset on open (and on every re-open for a possibly different row) —
    // never on `row`/`timeMs` alone, so an in-progress edit isn't wiped by
    // an unrelated prop update while the dialog is already showing.
    useEffect(() => {
        if (!open) return;
        setSelectedTarget(row.runId);
        setPickError(null);
        setTimeText(msToTimeInput(timeMs));
        setReasonText('');
        setTimeError(null);
        setEligibleRuns(null);

        if (isGuest) return;

        const userId = row.userId as number;
        let cancelled = false;
        setIsLoadingEligible(true);
        (async () => {
            const res = await loadUserEligibleRunsAction(gameSlug, userId);
            if (cancelled) return;
            setIsLoadingEligible(false);
            if ('error' in res) {
                setPickError(res.error);
                return;
            }
            setEligibleRuns(res.rows);
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const boardRuns = useMemo(() => {
        if (!eligibleRuns) return [];
        return eligibleRuns
            .filter(
                (r) =>
                    r.categoryId === category.id &&
                    r.subcategoryKey === subcategoryKey &&
                    primaryValueOf(r, timing) != null,
            )
            .sort(
                (a, b) =>
                    (primaryValueOf(a, timing) as number) -
                    (primaryValueOf(b, timing) as number),
            );
    }, [eligibleRuns, category.id, subcategoryKey, timing]);

    const selectedRun =
        boardRuns.find((r) => r.runId === selectedTarget) ?? null;

    const fasterIds = useMemo(() => {
        if (!selectedRun) return [];
        const targetValue = primaryValueOf(selectedRun, timing) as number;
        return boardRuns
            .filter((r) => (primaryValueOf(r, timing) as number) < targetValue)
            .map((r) => r.runId);
    }, [boardRuns, selectedRun, timing]);

    if (!open) return null;

    // Disabled whenever there's nothing to remove, regardless of which run
    // is selected — a tied-time non-current run needs no mutation either
    // (the board already surfaces whichever eligible run is best), and the
    // consequence line right above the button already explains why.
    const confirmPickDisabled =
        isLoadingEligible || isPending || fasterIds.length === 0;
    const saveTimeDisabled = isPending || reasonText.trim().length === 0;

    const handleClose = () => {
        if (isPending) return;
        onClose();
    };

    const handleConfirmPick = () => {
        if (confirmPickDisabled) return;
        startTransition(async () => {
            const res = await excludeAction(gameSlug, {
                runIds: fasterIds,
                reason: 'Adjusted during board curation',
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            onClose();
            onMutated();
            // The undo toast is a portal, independent of this dialog's
            // lifecycle, so it keeps working even after `onMutated`'s
            // reload closes/unmounts this component.
            fireUndoToast(
                `Adjusted ${row.runnerName}’s entry.`,
                () => restoreRunsAction(gameSlug, fasterIds, 'Undo of adjust'),
                onMutated,
            );
        });
    };

    const handleSaveTime = () => {
        if (saveTimeDisabled) return;
        const parsed = parseTimeInput(timeText);
        if (parsed == null || Number.isNaN(parsed)) {
            setTimeError('Enter a valid time (h:mm:ss, m:ss, or m:ss.SSS).');
            return;
        }
        setTimeError(null);
        startTransition(async () => {
            const res = await createManualTimeAction(gameSlug, {
                runnerRef:
                    row.userId == null
                        ? { guestName: row.runnerName }
                        : { userId: row.userId },
                categoryId: category.id,
                subcategoryKey,
                timing:
                    category.primaryTiming === 'gt' ? 'gametime' : 'realtime',
                timeMs: parsed,
                reason: reasonText,
            });
            if ('error' in res) {
                setTimeError(res.error);
                return;
            }
            onClose();
            toast.success('Time set.');
            onMutated();
        });
    };

    return (
        <BoardDialog
            open
            onClose={handleClose}
            labelledBy="adjust-dialog-title"
            size="lg"
            closeOnBackdropClick={!isPending}
        >
            <div className={styles.dialogHeader}>
                <h5 id="adjust-dialog-title" className={styles.dialogTitle}>
                    Adjust {row.runnerName}’s entry
                </h5>
                <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={handleClose}
                    disabled={isPending}
                />
            </div>
            <div className={styles.dialogBody}>
                {!isGuest && (
                    <div>
                        {isLoadingEligible && (
                            <p className={styles.slipLoading}>
                                Loading eligible runs…
                            </p>
                        )}
                        {pickError && (
                            <div className={styles.errorAlert} role="alert">
                                {pickError}
                            </div>
                        )}
                        {eligibleRuns && (
                            <>
                                <div>
                                    {boardRuns.map((r) => (
                                        <label key={r.runId}>
                                            <input
                                                type="radio"
                                                name="adjust-target"
                                                checked={
                                                    selectedTarget === r.runId
                                                }
                                                onChange={() =>
                                                    setSelectedTarget(r.runId)
                                                }
                                                disabled={isPending}
                                            />{' '}
                                            <DurationToFormatted
                                                duration={
                                                    primaryValueOf(r, timing) ??
                                                    0
                                                }
                                                withMillis={
                                                    category.showMilliseconds ??
                                                    false
                                                }
                                            />{' '}
                                            {r.verificationStatus}
                                            {r.runId === row.runId
                                                ? ' — current entry'
                                                : ''}
                                        </label>
                                    ))}
                                </div>
                                <p>
                                    {fasterIds.length > 0
                                        ? `This removes ${fasterIds.length} faster run${
                                              fasterIds.length === 1 ? '' : 's'
                                          }.`
                                        : 'No faster runs to remove.'}
                                </p>
                                <button
                                    type="button"
                                    className={styles.confirmBtn}
                                    onClick={handleConfirmPick}
                                    disabled={confirmPickDisabled}
                                >
                                    {isPending
                                        ? 'Saving…'
                                        : 'Make this the entry'}
                                </button>
                            </>
                        )}
                    </div>
                )}

                <div>
                    <p className={styles.fieldLabel}>Set a time instead</p>
                    <p>Files a moderator manual time for this board.</p>
                    <label htmlFor="adjust-time" className={styles.fieldLabel}>
                        Time
                    </label>
                    <input
                        id="adjust-time"
                        type="text"
                        className={styles.timeInput}
                        value={timeText}
                        onChange={(e) => setTimeText(e.target.value)}
                        placeholder="e.g. 35:48"
                        disabled={isPending}
                    />
                    {timeError && (
                        <span className={styles.timeError}>{timeError}</span>
                    )}
                    <label
                        htmlFor="adjust-time-reason"
                        className={styles.fieldLabel}
                    >
                        Reason — required
                    </label>
                    <textarea
                        id="adjust-time-reason"
                        className={styles.dialogTextarea}
                        rows={3}
                        value={reasonText}
                        onChange={(e) => setReasonText(e.target.value)}
                        disabled={isPending}
                    />
                    <button
                        type="button"
                        className={styles.confirmBtn}
                        onClick={handleSaveTime}
                        disabled={saveTimeDisabled}
                    >
                        {isPending ? 'Saving…' : 'Save time'}
                    </button>
                </div>
            </div>
        </BoardDialog>
    );
}
