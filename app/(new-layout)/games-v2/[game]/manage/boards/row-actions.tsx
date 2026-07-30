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
import {
    excludeAction,
    previewExcludeAction,
} from '../moderation/shared/actions/exclude.action';
import { createManualTimeAction } from '../moderation/shared/actions/manual-times.action';
import { markRunsAction } from '../moderation/shared/actions/marks.action';
import {
    msToTimeInput,
    parseTimeInput,
} from '../moderation/shared/time-format';
import styles from './board-curation.module.scss';

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
    /**
     * True while `BoardCuration`'s exclude call for this row's Remove is in
     * flight. Remove itself — the exclude call, the undo toast, the
     * next-run slip — is owned by `BoardCuration`, not this component:
     * a removed row has to keep rendering (from a frozen snapshot) even
     * after a *sibling* row's own action reloads the board and this run
     * drops out of the live roster data. If Remove lived here instead, a
     * reload triggered by any other row's Later/Ban/Fix-time would unmount
     * this component — and the slip with it — mid-flight. See
     * `PendingRemoval`/`PendingRemovalCells` below, rendered by
     * `BoardCuration` in this component's place once Remove succeeds.
     */
    removing: boolean;
    onRemove: () => void;
    onMutated: () => void;
}

/** The value of a candidate/replacement run for the category's primary
 * timing — `UserEligibleRunRow` carries both `time` and `gameTime` the same
 * way `LeaderboardRosterRow` does. Exported so `BoardCuration` can sort
 * next-run candidates with the same rule used to display them here. */
export function primaryValueOf(
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
    removing,
    onRemove,
    onMutated,
}: RowActionsProps) {
    const modTiming: ModTiming =
        category.primaryTiming === 'gt' ? 'gametime' : 'realtime';
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
    // mutations is in flight (Remove's exclude call included, tracked by
    // `BoardCuration` and handed down as `removing`), the other buttons are
    // disabled too — e.g. clicking Ban mid-flight on a Later toggle could
    // file a conflicting mutation for the same run.
    const busy =
        isMarking || removing || isBanPreviewing || isBanning || isSavingTime;

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
                        onClick={onRemove}
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

/**
 * A row `BoardCuration` has pinned in place after a successful Remove —
 * rendered from this frozen snapshot rather than the live roster data,
 * specifically so a *sibling* row's reload can't unmount it (or discard its
 * next-run slip) before the user has resolved it. See the `removing` doc on
 * `RowActionsProps` above for why this can't live inside `RowActions`.
 */
export interface PendingRemoval {
    row: LeaderboardRosterRow;
    timeMs: number | null;
    nextRun: UserEligibleRunRow | null;
    nextRunLoading: boolean;
}

/** Time cell (frozen) + "Removed." note / next-run slip, in place of
 * `RowActions`'s time + action-cluster cells for a pending removal. */
export function PendingRemovalCells({
    pending,
    timing,
    onKeepIt,
    onRemoveToo,
}: {
    pending: PendingRemoval;
    timing: 'rt' | 'gt';
    onKeepIt: () => void;
    onRemoveToo: () => void;
}) {
    return (
        <>
            <td className={styles.time}>
                {pending.timeMs != null ? (
                    <DurationToFormatted duration={pending.timeMs} />
                ) : (
                    '—'
                )}
            </td>
            <td className={styles.actionsCell}>
                <div className={styles.removedNote}>
                    <span>Removed.</span>
                    {pending.nextRunLoading && (
                        <span className={styles.slipLoading}>
                            Checking for a replacement…
                        </span>
                    )}
                    {pending.nextRun && (
                        <span className={styles.slip}>
                            next:{' '}
                            <DurationToFormatted
                                duration={
                                    primaryValueOf(pending.nextRun, timing) ?? 0
                                }
                            />{' '}
                            ·{' '}
                            <button
                                type="button"
                                className={styles.slipAction}
                                onClick={onKeepIt}
                            >
                                Keep it
                            </button>{' '}
                            /{' '}
                            <button
                                type="button"
                                className={styles.slipAction}
                                onClick={onRemoveToo}
                            >
                                Remove too
                            </button>
                        </span>
                    )}
                </div>
            </td>
        </>
    );
}
