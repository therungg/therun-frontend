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
import type { TimingColumn, TimingKey } from '../../leaderboard/timing-columns';
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
    /** Drives nothing here any more — the below-minimum tag moved into the
     *  row's ranked time cell — but `AdjustDialog` still reads it. */
    belowMinimum: boolean;
    /** Viewer may file a SITE-WIDE anonymize ban — admins only
     * (`ability.can('moderate', 'admins')`), never game moderators. Fed
     * straight through to `RunnerDialog`, which gates its "Entire site"
     * scope on it. Defaults to false so the wizard mounts and older render
     * sites are unaffected. */
    canSiteBan?: boolean;
    /**
     * Fires after the shared Remove dialog's mutation lands. The dialog owns
     * the removal itself — reason category, notify toggle, preview, min-10,
     * and the choice between this run and every run the runner has on this
     * board — so all `BoardCuration` does afterwards is resync.
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

/** `timingValue()`'s twin for the roster shape, which names its real time
 *  `time` rather than `realTime`. */
export function rosterTimingValue(
    row: { time: number | null; gameTime: number | null },
    key: TimingKey,
): number | null {
    return key === 'rt' ? row.time : row.gameTime;
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
        // Present only for a registered runner: it unlocks Remove's
        // "every run on this board" option, which needs an account to
        // write a rule against.
        runner: isGuest
            ? undefined
            : {
                  id: row.userId as number,
                  name: row.runnerName,
                  categoryId: category.id,
                  categoryDisplay: category.display,
                  subcategoryKey,
                  primaryTiming: category.primaryTiming,
              },
    };

    // Only the action cluster: the row's cells belong to `LeaderboardRow`,
    // which curation now renders instead of a copy. This lands in that row's
    // trailing cell through `RowSlots.actions`.
    return (
        <>
            <div className={styles.actionCluster}>
                {/* No VOD link here: `LeaderboardRow` already renders one in
                    this same trailing cell, for every board. */}
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
                                disabled={row.verificationStatus === 'verified'}
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
