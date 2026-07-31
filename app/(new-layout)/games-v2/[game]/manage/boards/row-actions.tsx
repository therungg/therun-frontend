'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { DurationToFormatted } from '~src/components/util/datetime';
import {
    buildSubcategoryKey,
    parseSubcategoryKey,
} from '~src/lib/variables/keys';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import type {
    LeaderboardRosterRow,
    UserEligibleRunRow,
} from '../../../../../../types/moderation.types';
import { BoardDialog } from '../../shared/board-dialog';
import { usePopoverFocus } from '../../shared/use-popover-focus';
import { moveRunAction } from '../moderation/shared/actions/board-override.action';
import { applyVerdictsAction } from '../moderation/shared/actions/verdicts.action';
import { fireUndoToast } from '../moderation/shared/undo-toast';
import { AdjustDialog } from './adjust-dialog';
import styles from './board-curation.module.scss';
import { RunnerDialog } from './runner-dialog';
import {
    defaultCanonicalOf,
    SubcategoryBands,
    subcategoryVariablesFor,
} from './subcategory-bands';

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
     * True while `BoardCuration`'s exclude call for this row's Remove is in
     * flight. Remove itself — the exclude call, the undo toast, the
     * next-run slip — is owned by `BoardCuration`, not this component:
     * a removed row has to keep rendering (from a frozen snapshot) even
     * after a *sibling* row's own action reloads the board and this run
     * drops out of the live roster data. If Remove lived here instead, a
     * reload triggered by any other row's action (Approve, Move, Runner…,
     * Adjust…) would unmount this component — and the slip with it — mid-
     * flight. See `PendingRemoval`/`PendingRemovalCells` below, rendered by
     * `BoardCuration` in this component's place once Remove succeeds.
     */
    removing: boolean;
    onRemove: (reason: string) => void;
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
 * (Remove, Run… menu: Approve/Move/Adjust, Runner…). Rendered as a fragment
 * of two `<td>`s in place of `BoardCuration`'s old plain time cell.
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
    removing,
    onRemove,
    onMutated,
}: RowActionsProps) {
    const isGuest = row.userId == null;

    // ---- Run… menu (Approve / Move… / Adjust…) -------------------------
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRootRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [runnerOpen, setRunnerOpen] = useState(false);
    const [adjustOpen, setAdjustOpen] = useState(false);
    const [isApproving, startApprove] = useTransition();

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

    const handleApprove = () => {
        setMenuOpen(false);
        startApprove(async () => {
            const res = await applyVerdictsAction(
                gameSlug,
                'verify',
                [row.runId],
                'Approved from board curation',
            );
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success('Run approved.');
            onMutated();
        });
    };

    // ---- Remove (reason popover) ---------------------------------------
    const [removeOpen, setRemoveOpen] = useState(false);
    const [removeReason, setRemoveReason] = useState('');
    const removeRootRef = useRef<HTMLDivElement>(null);
    const removePanelRef = useRef<HTMLDivElement>(null);

    usePopoverFocus({
        open: removeOpen,
        onClose: () => setRemoveOpen(false),
        panelRef: removePanelRef,
    });

    useEffect(() => {
        if (!removeOpen) return;
        const onDown = (e: MouseEvent) => {
            if (!removeRootRef.current?.contains(e.target as Node)) {
                setRemoveOpen(false);
            }
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [removeOpen]);

    const confirmRemove = () => {
        const trimmed = removeReason.trim();
        if (trimmed.length === 0) return;
        setRemoveOpen(false);
        onRemove(trimmed);
    };

    // ---- Move ---------------------------------------------------------
    const [moveOpen, setMoveOpen] = useState(false);
    const [moveTargetCategoryId, setMoveTargetCategoryId] = useState<
        number | ''
    >('');
    const [moveSelectedValues, setMoveSelectedValues] = useState<
        Record<string, string>
    >({});
    const [moveError, setMoveError] = useState<string | null>(null);
    const [isMoving, startMove] = useTransition();

    const openMove = () => {
        setMoveTargetCategoryId(category.id);
        // Seed the target bands from the row's *current* placement (not the
        // target category's defaults) so Apply starts disabled — nothing has
        // changed yet.
        const initial: Record<string, string> = {};
        for (const part of parseSubcategoryKey(subcategoryKey)) {
            initial[part.name] = part.value;
        }
        setMoveSelectedValues(initial);
        setMoveError(null);
        setMoveOpen(true);
    };

    const closeMove = () => {
        if (isMoving) return;
        setMoveOpen(false);
    };

    const moveTargetCategory =
        categories.find((c) => c.id === moveTargetCategoryId) ?? null;
    const moveTargetSubcatVars = useMemo(
        () =>
            moveTargetCategory
                ? subcategoryVariablesFor(moveTargetCategory.id, variables)
                : [],
        [moveTargetCategory, variables],
    );
    const moveTargetKey = useMemo(() => {
        if (moveTargetSubcatVars.length === 0) return '';
        return buildSubcategoryKey(
            moveTargetSubcatVars.map((v) => ({
                name: v.nameNormalized,
                value:
                    moveSelectedValues[v.nameNormalized] ??
                    defaultCanonicalOf(v),
            })),
        );
    }, [moveTargetSubcatVars, moveSelectedValues]);

    // The backend rejects a move to the run's current placement — prevent
    // it client-side too rather than round-tripping for the error.
    const isNoOpMove =
        moveTargetCategory != null &&
        moveTargetCategory.id === category.id &&
        moveTargetKey === subcategoryKey;

    const confirmMove = () => {
        if (moveTargetCategory == null || isNoOpMove) return;
        const source = { categoryId: category.id, subcategoryKey };
        const target = {
            categoryId: moveTargetCategory.id,
            subcategoryKey: moveTargetKey,
        };
        startMove(async () => {
            // Source loses the run, target gains it — both leaderboard reads
            // need their cache invalidated.
            const res = await moveRunAction(gameSlug, row.runId, target, [
                source,
                target,
            ]);
            if ('error' in res) {
                setMoveError(res.error);
                return;
            }
            setMoveOpen(false);
            // The row leaves this board immediately — no slip needed (unlike
            // Remove, a moved row has nowhere on *this* board to land a
            // next-run candidate). The undo toast is a portal, independent
            // of this row's lifecycle, so it keeps working even after
            // `onMutated`'s reload unmounts this component.
            onMutated();
            fireUndoToast(
                `Moved ${row.runnerName}.`,
                // Undo restores the run to `source` — the same pair, just
                // reversed, since this closure already knows both sides.
                () =>
                    moveRunAction(gameSlug, row.runId, null, [target, source]),
                onMutated,
            );
        });
    };

    // Mutual exclusion across the cluster: while any one of these row
    // mutations is in flight (Remove's exclude call included, tracked by
    // `BoardCuration` and handed down as `removing`), the other buttons are
    // disabled too. Dialogs own their own pending states and block their own
    // close, so `busy` only needs to cover what it directly protects here.
    const busy = isApproving || removing || isMoving;

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
                    <div className={styles.menuRoot} ref={removeRootRef}>
                        <button
                            type="button"
                            className={styles.actionBtn}
                            aria-haspopup="dialog"
                            aria-expanded={removeOpen}
                            onClick={() => {
                                if (removeOpen) {
                                    setRemoveOpen(false);
                                } else {
                                    setRemoveReason('');
                                    setRemoveOpen(true);
                                }
                            }}
                            disabled={busy}
                        >
                            Remove
                        </button>
                        {removeOpen && (
                            <div
                                ref={removePanelRef}
                                role="dialog"
                                aria-modal="true"
                                aria-label={`Remove ${row.runnerName}`}
                                className={`${styles.menuPanel} ${styles.removePanel}`}
                            >
                                <label
                                    htmlFor={`remove-reason-${row.runId}`}
                                    className={styles.fieldLabel}
                                >
                                    Reason — required
                                </label>
                                <input
                                    id={`remove-reason-${row.runId}`}
                                    type="text"
                                    className={styles.dialogInput}
                                    value={removeReason}
                                    onChange={(e) =>
                                        setRemoveReason(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            confirmRemove();
                                        }
                                    }}
                                />
                                <div className={styles.popoverActions}>
                                    <button
                                        type="button"
                                        className={styles.slipAction}
                                        onClick={() => setRemoveOpen(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.confirmBtn}
                                        onClick={confirmRemove}
                                        disabled={
                                            removeReason.trim().length === 0
                                        }
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className={styles.menuRoot} ref={menuRootRef}>
                        <button
                            type="button"
                            className={styles.actionBtn}
                            aria-haspopup="dialog"
                            aria-expanded={menuOpen}
                            onClick={() => setMenuOpen((v) => !v)}
                            disabled={busy}
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
                                    onClick={handleApprove}
                                    disabled={
                                        busy ||
                                        row.verificationStatus === 'verified'
                                    }
                                >
                                    {row.verificationStatus === 'verified'
                                        ? 'Approved'
                                        : 'Approve'}
                                </button>
                                <button
                                    type="button"
                                    className={styles.menuItem}
                                    onClick={() => {
                                        setMenuOpen(false);
                                        openMove();
                                    }}
                                    disabled={busy}
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
                                    disabled={busy}
                                >
                                    {isGuest ? 'Set time…' : 'Adjust…'}
                                </button>
                            </div>
                        )}
                    </div>
                    {!isGuest && (
                        <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => setRunnerOpen(true)}
                            disabled={busy}
                        >
                            Runner…
                        </button>
                    )}
                </div>
            </td>

            {moveOpen && (
                <BoardDialog
                    open
                    onClose={closeMove}
                    labelledBy="move-sheet-title"
                    size="sm"
                    closeOnBackdropClick={!isMoving}
                >
                    <div className={styles.dialogHeader}>
                        <h5
                            id="move-sheet-title"
                            className={styles.dialogTitle}
                        >
                            Move {row.runnerName}
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            aria-label="Close"
                            onClick={closeMove}
                            disabled={isMoving}
                        />
                    </div>
                    <div className={styles.dialogBody}>
                        <label
                            htmlFor="move-category"
                            className={styles.fieldLabel}
                        >
                            Category
                        </label>
                        <select
                            id="move-category"
                            className="form-select form-select-sm mb-2"
                            value={moveTargetCategoryId}
                            onChange={(e) => {
                                setMoveTargetCategoryId(Number(e.target.value));
                                setMoveSelectedValues({});
                            }}
                            disabled={isMoving}
                        >
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.display}
                                </option>
                            ))}
                        </select>
                        <SubcategoryBands
                            variables={moveTargetSubcatVars}
                            selectedValues={moveSelectedValues}
                            onSelect={(name, canonical) =>
                                setMoveSelectedValues((prev) => ({
                                    ...prev,
                                    [name]: canonical,
                                }))
                            }
                            idPrefix={`move-${row.runId}`}
                        />
                        {isNoOpMove && (
                            <p className={styles.moveNote}>
                                Already placed here.
                            </p>
                        )}
                        {moveError && (
                            <div className={styles.errorAlert} role="alert">
                                {moveError}
                            </div>
                        )}
                    </div>
                    <div className={styles.dialogFooter}>
                        <button
                            type="button"
                            className={styles.slipAction}
                            onClick={closeMove}
                            disabled={isMoving}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={styles.applyBtn}
                            onClick={confirmMove}
                            disabled={
                                isMoving ||
                                moveTargetCategory == null ||
                                isNoOpMove
                            }
                        >
                            {isMoving ? 'Moving…' : 'Apply'}
                        </button>
                    </div>
                </BoardDialog>
            )}

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
 * next-run slip) before the user has resolved it. See the `removing` doc on
 * `RowActionsProps` above for why this can't live inside `RowActions`.
 */
export interface PendingRemoval {
    row: LeaderboardRosterRow;
    timeMs: number | null;
    /** The reason typed into the Remove popover for this row — reused
     * as-is if the next-run slip's "Remove too" is taken. */
    reason: string;
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
