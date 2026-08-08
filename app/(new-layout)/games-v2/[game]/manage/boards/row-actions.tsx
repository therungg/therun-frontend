'use client';

import { useEffect, useRef, useState } from 'react';
import Link from '~src/components/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import type {
    LeaderboardRosterRow,
    UserEligibleRunRow,
} from '../../../../../../types/moderation.types';
import { usePopoverFocus } from '../../shared/use-popover-focus';
import { RunActionDialog } from '../moderation/shared/run-action-dialog';
import { AdjustDialog } from './adjust-dialog';
import styles from './board-curation.module.scss';
import { MoveDialog } from './move-dialog';
import { RunnerDialog } from './runner-dialog';

export interface RowActionsProps {
    row: LeaderboardRosterRow;
    category: ResolvedCategory;
    /** Move-to target choices — the board's featured categories (self
     * included, so a mod can change only the subcategory). */
    categories: ResolvedCategory[];
    variables: VariableRow[];
    subcategoryKey: string;
    gameSlug: string;
    /** Currently-displayed time for the row (already resolved to the
     * category's primary timing by BoardCuration) — read-mode display, and
     * the seed value `AdjustDialog` uses for its set-time input. */
    timeMs: number | null;
    belowMinimum: boolean;
    /** Viewer may file a SITE-WIDE anonymize ban — admins only
     * (`ability.can('moderate', 'admins')`), never game moderators. Fed
     * straight through to `RunnerDialog`, which gates its "Entire site"
     * scope on it. Defaults to false so the wizard mounts and older render
     * sites are unaffected. */
    canSiteBan?: boolean;
    /**
     * Fires after the shared Remove dialog's mutation lands. The dialog owns
     * the removal itself (reason category, notify toggle, preview, min-10 —
     * the same Remove as everywhere else); `BoardCuration` owns what happens
     * to the ROW afterwards: it pins a frozen snapshot in place and offers
     * the next-run slip, which must survive sibling-row reloads — see
     * `PendingRemoval`/`PendingRemovalCells` below.
     */
    onRemoved: () => void;
    /** Fires after the Remove undo toast's restore lands — unpins the row. */
    onRemoveUndone: () => void;
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
 * (Remove…, Run… menu: Approve/Move/Adjust, Runner…). Remove and Approve go
 * through the shared `RunActionDialog` — identical validation, preview and
 * undo to the board and every other surface. Rendered as a fragment of two
 * `<td>`s in place of `BoardCuration`'s old plain time cell.
 */
export function RowActions({
    row,
    category,
    categories,
    variables,
    subcategoryKey,
    gameSlug,
    timeMs,
    belowMinimum,
    canSiteBan = false,
    onRemoved,
    onRemoveUndone,
    onMutated,
}: RowActionsProps) {
    const isGuest = row.userId == null;

    // ---- Run… menu (Approve / Move… / Adjust…) -------------------------
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRootRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [runnerOpen, setRunnerOpen] = useState(false);
    const [adjustOpen, setAdjustOpen] = useState(false);
    const [approveOpen, setApproveOpen] = useState(false);
    const [removeOpen, setRemoveOpen] = useState(false);

    usePopoverFocus({
        open: menuOpen,
        onClose: () => setMenuOpen(false),
        panelRef: menuRef,
    });

    useEffect(() => {
        if (!menuOpen) return;
        const onDown = (e: MouseEvent) => {
            if (!menuRootRef.current?.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [menuOpen]);

    // ---- Move (dialog extracted to move-dialog.tsx) --------------------
    const [moveOpen, setMoveOpen] = useState(false);

    const dialogTarget = {
        kind: 'runs' as const,
        runIds: [row.runId],
        label: `${row.runnerName}'s run`,
    };

    return (
        <>
            <td className={styles.time}>
                {timeMs != null ? (
                    <DurationToFormatted
                        duration={timeMs}
                        withMillis={category.showMilliseconds ?? false}
                    />
                ) : (
                    '—'
                )}
                {belowMinimum && (
                    <span className={styles.belowMinTag}>Below minimum</span>
                )}
            </td>
            <td className={styles.actionsCell}>
                <div className={styles.actionCluster}>
                    <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => setRemoveOpen(true)}
                    >
                        Remove…
                    </button>
                    <div className={styles.menuRoot} ref={menuRootRef}>
                        <button
                            type="button"
                            className={styles.actionBtn}
                            aria-haspopup="dialog"
                            aria-expanded={menuOpen}
                            onClick={() => setMenuOpen((v) => !v)}
                        >
                            Run…
                        </button>
                        {menuOpen && (
                            <div
                                ref={menuRef}
                                role="dialog"
                                aria-modal="true"
                                aria-label={`Run actions for ${row.runnerName}`}
                                className={styles.menuPanel}
                            >
                                <button
                                    type="button"
                                    className={styles.menuItem}
                                    onClick={() => {
                                        setMenuOpen(false);
                                        setApproveOpen(true);
                                    }}
                                    disabled={
                                        row.verificationStatus === 'verified'
                                    }
                                >
                                    {row.verificationStatus === 'verified'
                                        ? 'Approved'
                                        : 'Approve…'}
                                </button>
                                <button
                                    type="button"
                                    className={styles.menuItem}
                                    onClick={() => {
                                        setMenuOpen(false);
                                        setMoveOpen(true);
                                    }}
                                >
                                    Move…
                                </button>
                                <button
                                    type="button"
                                    className={styles.menuItem}
                                    onClick={() => {
                                        setMenuOpen(false);
                                        setAdjustOpen(true);
                                    }}
                                >
                                    {isGuest ? 'Set time…' : 'Adjust…'}
                                </button>
                            </div>
                        )}
                    </div>
                    {!isGuest && (
                        <>
                            <button
                                type="button"
                                className={styles.actionBtn}
                                onClick={() => setRunnerOpen(true)}
                            >
                                Runner…
                            </button>
                            <Link
                                className={styles.actionBtn}
                                href={`/games-v2/${encodeURIComponent(gameSlug)}/manage/moderation/runner/${row.userId}?from=boards`}
                                title={`Open ${row.runnerName}'s runner page — runs, bans, history`}
                            >
                                View
                            </Link>
                        </>
                    )}
                </div>
            </td>

            {removeOpen && (
                <RunActionDialog
                    gameSlug={gameSlug}
                    verb="remove"
                    target={dialogTarget}
                    onDone={() => {
                        setRemoveOpen(false);
                        onRemoved();
                    }}
                    onClose={() => setRemoveOpen(false)}
                    onUndoComplete={onRemoveUndone}
                />
            )}
            {approveOpen && (
                <RunActionDialog
                    gameSlug={gameSlug}
                    verb="approve"
                    target={dialogTarget}
                    onDone={() => {
                        setApproveOpen(false);
                        onMutated();
                    }}
                    onClose={() => setApproveOpen(false)}
                    onUndoComplete={onMutated}
                />
            )}

            <MoveDialog
                open={moveOpen}
                onClose={() => setMoveOpen(false)}
                row={row}
                category={category}
                categories={categories}
                variables={variables}
                subcategoryKey={subcategoryKey}
                gameSlug={gameSlug}
                onMutated={onMutated}
            />
            <RunnerDialog
                open={runnerOpen}
                onClose={() => setRunnerOpen(false)}
                row={row}
                category={category}
                variables={variables}
                gameSlug={gameSlug}
                subcategoryKey={subcategoryKey}
                canSiteBan={canSiteBan}
                onMutated={onMutated}
            />
            <AdjustDialog
                open={adjustOpen}
                onClose={() => setAdjustOpen(false)}
                row={row}
                category={category}
                gameSlug={gameSlug}
                subcategoryKey={subcategoryKey}
                timeMs={timeMs}
                onMutated={onMutated}
            />
        </>
    );
}

/**
 * A row `BoardCuration` has pinned in place after a successful Remove —
 * rendered from this frozen snapshot rather than the live roster data,
 * specifically so a *sibling* row's reload can't unmount it (or discard its
 * next-run slip) before the user has resolved it. See the `onRemoved` doc on
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
