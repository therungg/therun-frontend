'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import type {
    LeaderboardRosterRow,
    ModTiming,
    PreviewExcludeResult,
    UserEligibleRunRow,
} from '../../../../../../types/moderation.types';
import { BoardDialog } from '../../shared/board-dialog';
import { loadUserEligibleRunsAction } from '../moderation/shared/actions/eligible-runs.action';
import {
    excludeAction,
    previewExcludeAction,
} from '../moderation/shared/actions/exclude.action';
import { createManualTimeAction } from '../moderation/shared/actions/manual-times.action';
import { markRunsAction } from '../moderation/shared/actions/marks.action';
import { restoreRunsAction } from '../moderation/shared/actions/restore.action';
import {
    msToTimeInput,
    parseTimeInput,
} from '../moderation/shared/time-format';
import { fireUndoToast } from '../moderation/shared/undo-toast';
import styles from './board-curation.module.scss';

const REMOVE_REASON = 'Board curation during setup';

export interface RowActionsProps {
    row: LeaderboardRosterRow;
    category: ResolvedCategory;
    subcategoryKey: string;
    gameSlug: string;
    /** Currently-displayed time for the row (already resolved to the
     * category's primary timing by BoardCuration) — read-mode display and
     * the seed value for the Fix-time editor. */
    timeMs: number | null;
    belowMinimum: boolean;
    onMutated: () => void;
}

/** The value of a candidate run for the category's primary timing —
 * `UserEligibleRunRow` carries both `time` and `gameTime` the same way
 * `LeaderboardRosterRow` does. */
function primaryValueOf(
    row: UserEligibleRunRow,
    timing: 'rt' | 'gt',
): number | null {
    return timing === 'gt' ? row.gameTime : row.time;
}

/**
 * Time cell + quiet hover-revealed action cluster for one board-curation row
 * (Later, Remove, Ban, Fix time). Rendered as a fragment of two `<td>`s in
 * place of `BoardCuration`'s old plain time cell — owning both lets "Fix
 * time" turn the time cell itself into an input without a cross-component
 * editing channel.
 */
export function RowActions({
    row,
    category,
    subcategoryKey,
    gameSlug,
    timeMs,
    belowMinimum,
    onMutated,
}: RowActionsProps) {
    const timing: 'rt' | 'gt' = category.primaryTiming === 'gt' ? 'gt' : 'rt';
    const modTiming: ModTiming = timing === 'gt' ? 'gametime' : 'realtime';
    const isGuest = row.userId == null;

    // ---- Later --------------------------------------------------------
    const [optimisticLater, setOptimisticLater] = useState<boolean | null>(
        null,
    );
    const [isMarking, startMark] = useTransition();
    const isMarkedForLater = optimisticLater ?? row.markedForLater ?? false;

    // Once the reloaded row catches up to the optimistic value, drop the
    // override so future prop updates (e.g. another mod's change) show.
    useEffect(() => {
        if (
            optimisticLater !== null &&
            row.markedForLater === optimisticLater
        ) {
            setOptimisticLater(null);
        }
    }, [row.markedForLater, optimisticLater]);

    const handleLater = () => {
        const next = !isMarkedForLater;
        setOptimisticLater(next);
        startMark(async () => {
            const res = await markRunsAction(gameSlug, [row.runId], next);
            if ('error' in res) {
                setOptimisticLater(!next);
                toast.error(res.error);
                return;
            }
            onMutated();
        });
    };

    // ---- Remove (+ next-best reveal, undo) -----------------------------
    const [isRemoving, startRemove] = useTransition();
    const [removed, setRemoved] = useState(false);
    const [nextRun, setNextRun] = useState<UserEligibleRunRow | null>(null);
    const [isLoadingNext, startLoadNext] = useTransition();

    // IMPORTANT: `onMutated()` (which triggers `useBoardData`'s reload) must
    // NOT be called the instant the exclude succeeds. `BoardCuration` derives
    // `boardRows` from the same `rows` state that reload replaces — as soon
    // as it resolves, this run drops out of `boardRows` and this very
    // component (including the "next:"/Keep it/Remove too slip below)
    // unmounts before the eligible-runs fetch even has a chance to resolve.
    // Reload only fires once there's nothing left worth keeping this row
    // mounted for: no userId to query, the query failed, there's no
    // same-board replacement to offer, or the user has explicitly resolved
    // the slip (Keep it / Remove too) or clicked Undo.
    const handleRemove = () => {
        startRemove(async () => {
            const res = await excludeAction(gameSlug, {
                runIds: [row.runId],
                reason: REMOVE_REASON,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setRemoved(true);
            fireUndoToast(
                `Removed ${row.runnerName}.`,
                () =>
                    restoreRunsAction(gameSlug, [row.runId], 'Undo of remove'),
                () => {
                    setRemoved(false);
                    setNextRun(null);
                    onMutated();
                },
            );

            if (row.userId == null) {
                // Guests have no userId to query eligible runs for — no slip
                // to show, so resync now, same as before this fix.
                onMutated();
                return;
            }

            const userId = row.userId;
            startLoadNext(async () => {
                const eligible = await loadUserEligibleRunsAction(
                    gameSlug,
                    userId,
                );
                if (!('ok' in eligible)) {
                    // Couldn't check for a replacement — nothing left to
                    // keep this row mounted for.
                    onMutated();
                    return;
                }
                const candidates = eligible.rows
                    .filter(
                        (r) =>
                            r.categoryId === category.id &&
                            r.subcategoryKey === subcategoryKey &&
                            r.runId !== row.runId,
                    )
                    .sort((a, b) => {
                        const at = primaryValueOf(a, timing);
                        const bt = primaryValueOf(b, timing);
                        if (at == null && bt == null) return 0;
                        if (at == null) return 1;
                        if (bt == null) return -1;
                        return at - bt;
                    });
                const best = candidates[0] ?? null;
                setNextRun(best);
                // No same-board replacement to offer — nothing left to show,
                // safe to resync now. Otherwise, hold off: the slip stays up
                // until handleKeepIt/handleRemoveToo/Undo above resolves it.
                if (best == null) onMutated();
            });
        });
    };

    const handleKeepIt = () => {
        setNextRun(null);
        onMutated();
    };

    const handleRemoveToo = () => {
        if (!nextRun) return;
        const candidate = nextRun;
        setNextRun(null);
        startRemove(async () => {
            const res = await excludeAction(gameSlug, {
                runIds: [candidate.runId],
                reason: REMOVE_REASON,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            fireUndoToast(
                'Removed.',
                () =>
                    restoreRunsAction(
                        gameSlug,
                        [candidate.runId],
                        'Undo of remove',
                    ),
                onMutated,
            );
            onMutated();
        });
    };

    // ---- Ban ------------------------------------------------------------
    const [banOpen, setBanOpen] = useState(false);
    const [banPreview, setBanPreview] = useState<PreviewExcludeResult | null>(
        null,
    );
    const [banPreviewError, setBanPreviewError] = useState<string | null>(null);
    const [banReason, setBanReason] = useState('');
    const [isBanPreviewing, startBanPreview] = useTransition();
    const [isBanning, startBan] = useTransition();

    const openBan = () => {
        if (row.userId == null) return;
        const targetId = row.userId;
        setBanReason('');
        setBanPreview(null);
        setBanPreviewError(null);
        setBanOpen(true);
        startBanPreview(async () => {
            const res = await previewExcludeAction(gameSlug, {
                rule: { type: 'user', targetId },
            });
            if ('error' in res) {
                setBanPreviewError(res.error);
                return;
            }
            setBanPreview(res.preview);
        });
    };

    const closeBan = () => {
        if (isBanning) return;
        setBanOpen(false);
    };

    const confirmBan = () => {
        if (row.userId == null || banReason.trim().length === 0) return;
        const targetId = row.userId;
        startBan(async () => {
            const res = await excludeAction(gameSlug, {
                rule: { type: 'user', targetId },
                reason: banReason.trim(),
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success(`${row.runnerName} banned.`);
            setBanOpen(false);
            onMutated();
        });
    };

    // ---- Fix time ---------------------------------------------------------
    const [editingTime, setEditingTime] = useState(false);
    const [timeText, setTimeText] = useState('');
    const [timeError, setTimeError] = useState<string | null>(null);
    const [isSavingTime, startSaveTime] = useTransition();
    const timeInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingTime) timeInputRef.current?.focus();
    }, [editingTime]);

    const startEditTime = () => {
        setTimeText(msToTimeInput(timeMs));
        setTimeError(null);
        setEditingTime(true);
    };

    const cancelEditTime = () => {
        setEditingTime(false);
        setTimeError(null);
    };

    const submitEditTime = () => {
        const parsed = parseTimeInput(timeText);
        if (parsed == null || Number.isNaN(parsed)) {
            setTimeError('Enter a valid time (h:mm:ss, m:ss, or m:ss.SSS).');
            return;
        }
        startSaveTime(async () => {
            const res = await createManualTimeAction(gameSlug, {
                runnerRef: isGuest
                    ? { guestName: row.runnerName }
                    : { userId: row.userId as number },
                categoryId: category.id,
                subcategoryKey,
                timing: modTiming,
                timeMs: parsed,
                reason: 'Corrected during board curation',
            });
            if ('error' in res) {
                setTimeError(res.error);
                return;
            }
            setEditingTime(false);
            toast.success('Time corrected.');
            onMutated();
        });
    };

    // Mutual exclusion across the cluster: while any one of these row
    // mutations is in flight, the other three buttons are disabled too —
    // e.g. clicking Ban mid-flight on a Later toggle could file a
    // conflicting mutation for the same run.
    const busy =
        isMarking || isRemoving || isBanPreviewing || isBanning || isSavingTime;

    return (
        <>
            <td className={styles.time}>
                {editingTime ? (
                    <>
                        <input
                            ref={timeInputRef}
                            type="text"
                            className={styles.timeInput}
                            value={timeText}
                            onChange={(e) => setTimeText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    submitEditTime();
                                } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    cancelEditTime();
                                }
                            }}
                            disabled={isSavingTime}
                            aria-label={`Fix time for ${row.runnerName}`}
                            placeholder="e.g. 35:48"
                        />
                        {timeError && (
                            <span className={styles.timeError}>
                                {timeError}
                            </span>
                        )}
                    </>
                ) : (
                    <>
                        {timeMs != null ? (
                            <DurationToFormatted
                                duration={timeMs}
                                withMillis={category.showMilliseconds ?? false}
                            />
                        ) : (
                            '—'
                        )}
                        {belowMinimum && (
                            <span className={styles.belowMinTag}>
                                Below minimum
                            </span>
                        )}
                    </>
                )}
            </td>
            <td className={styles.actionsCell}>
                {removed ? (
                    <div className={styles.removedNote}>
                        <span>Removed.</span>
                        {isLoadingNext && (
                            <span className={styles.slipLoading}>
                                Checking for a replacement…
                            </span>
                        )}
                        {nextRun && (
                            <span className={styles.slip}>
                                next:{' '}
                                <DurationToFormatted
                                    duration={
                                        primaryValueOf(nextRun, timing) ?? 0
                                    }
                                />{' '}
                                ·{' '}
                                <button
                                    type="button"
                                    className={styles.slipAction}
                                    onClick={handleKeepIt}
                                >
                                    Keep it
                                </button>{' '}
                                /{' '}
                                <button
                                    type="button"
                                    className={styles.slipAction}
                                    onClick={handleRemoveToo}
                                >
                                    Remove too
                                </button>
                            </span>
                        )}
                    </div>
                ) : (
                    <div className={styles.actionCluster}>
                        <button
                            type="button"
                            className={styles.actionBtn}
                            aria-pressed={isMarkedForLater}
                            onClick={handleLater}
                            disabled={busy}
                        >
                            Later
                        </button>
                        <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={handleRemove}
                            disabled={busy}
                        >
                            Remove
                        </button>
                        {!isGuest && (
                            <button
                                type="button"
                                className={styles.actionBtn}
                                onClick={openBan}
                                disabled={busy}
                            >
                                Ban
                            </button>
                        )}
                        <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={startEditTime}
                            disabled={busy}
                        >
                            Fix time
                        </button>
                    </div>
                )}
            </td>

            {banOpen && !isGuest && (
                <BoardDialog
                    open
                    onClose={closeBan}
                    labelledBy="ban-sheet-title"
                    size="sm"
                    closeOnBackdropClick={!isBanning}
                >
                    <div className={styles.dialogHeader}>
                        <h5 id="ban-sheet-title" className={styles.dialogTitle}>
                            Ban {row.runnerName}
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            aria-label="Close"
                            onClick={closeBan}
                            disabled={isBanning}
                        />
                    </div>
                    <div className={styles.dialogBody}>
                        {isBanPreviewing && (
                            <p className={styles.slipLoading}>
                                Loading preview…
                            </p>
                        )}
                        {banPreviewError && (
                            <div className={styles.errorAlert} role="alert">
                                {banPreviewError}
                            </div>
                        )}
                        {banPreview && (
                            <>
                                <p>
                                    <strong>
                                        {banPreview.affectedRunCount}
                                    </strong>{' '}
                                    run
                                    {banPreview.affectedRunCount === 1
                                        ? ''
                                        : 's'}{' '}
                                    affected.
                                </p>
                                {banPreview.affectedLeaderboards.length > 0 && (
                                    <ul>
                                        {banPreview.affectedLeaderboards.map(
                                            (lb) => (
                                                <li
                                                    key={`${lb.categoryId}:${lb.subcategoryKey}`}
                                                >
                                                    {lb.categoryName}
                                                    {lb.subcategoryKey
                                                        ? ` (${lb.subcategoryKey})`
                                                        : ''}{' '}
                                                    —{' '}
                                                    {
                                                        lb.affectedInThisLeaderboard
                                                    }
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                )}
                            </>
                        )}
                        <label
                            htmlFor="ban-reason"
                            className={styles.fieldLabel}
                        >
                            Reason — required
                        </label>
                        <textarea
                            id="ban-reason"
                            className={styles.dialogTextarea}
                            rows={3}
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            disabled={isBanning}
                        />
                    </div>
                    <div className={styles.dialogFooter}>
                        <button
                            type="button"
                            className={styles.slipAction}
                            onClick={closeBan}
                            disabled={isBanning}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={styles.confirmBtn}
                            onClick={confirmBan}
                            disabled={
                                isBanning ||
                                banReason.trim().length === 0 ||
                                !!banPreviewError
                            }
                        >
                            {isBanning ? 'Banning…' : 'Confirm ban'}
                        </button>
                    </div>
                </BoardDialog>
            )}
        </>
    );
}
