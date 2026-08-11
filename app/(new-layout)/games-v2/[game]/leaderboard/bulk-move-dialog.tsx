'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { buildSubcategoryKey } from '~src/lib/variables/keys';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../types/leaderboards.types';
import type { AffectedLeaderboard } from '../../../../../types/moderation.types';
import styles from '../manage/boards/board-curation.module.scss';
import {
    defaultCanonicalOf,
    SubcategoryBands,
    subcategoryVariablesFor,
} from '../manage/boards/subcategory-bands';
import { moveRunAction } from '../manage/moderation/shared/actions/board-override.action';
import { BoardDialog } from '../shared/board-dialog';

const MIN_REASON = 10;

export interface BulkMoveTarget {
    runId: number;
    runnerName: string;
    /** This run's own current subcategory key (may differ from the board's active filter). */
    subcategoryKey: string;
}

export interface BulkMoveDialogProps {
    open: boolean;
    onClose: () => void;
    runs: BulkMoveTarget[];
    /** The board's current category — the runs' shared source category. */
    category: ResolvedCategory;
    categories: ResolvedCategory[];
    variables: VariableRow[];
    gameSlug: string;
    onMutated: () => void;
}

/**
 * Bulk version of MoveDialog — one target category/subcategory picked once,
 * applied to every selected run via a sequence of `moveRunAction` calls
 * (the backend's board-override endpoint is per-run; there is no batch
 * variant). Each selected run keeps its own *current* subcategory as the
 * move source, since a combined/filtered view can hold runs from more than
 * one subcategory even though they share a category.
 */
export function BulkMoveDialog({
    open,
    onClose,
    runs,
    category,
    categories,
    variables,
    gameSlug,
    onMutated,
}: BulkMoveDialogProps) {
    // Same featured-only rule as MoveDialog: only boards runners can
    // actually see, plus the runs' own current category for
    // subcategory-only moves.
    const moveTargets = useMemo(
        () =>
            categories.filter(
                (c) =>
                    (!c.archived && (c.isMain ?? false)) ||
                    c.id === category.id,
            ),
        [categories, category.id],
    );

    const [targetCategoryId, setTargetCategoryId] = useState<number | ''>('');
    const [selectedValues, setSelectedValues] = useState<
        Record<string, string>
    >({});
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isMoving, startMove] = useTransition();

    useEffect(() => {
        if (!open) return;
        setTargetCategoryId(category.id);
        setSelectedValues({});
        setReason('');
        setError(null);
    }, [open, category.id]);

    const close = () => {
        if (isMoving) return;
        onClose();
    };

    const targetCategory =
        moveTargets.find((c) => c.id === targetCategoryId) ?? null;
    const targetSubcatVars = useMemo(
        () =>
            targetCategory
                ? subcategoryVariablesFor(targetCategory.id, variables)
                : [],
        [targetCategory, variables],
    );
    const targetKey = useMemo(() => {
        if (targetSubcatVars.length === 0) return '';
        return buildSubcategoryKey(
            targetSubcatVars.map((v) => ({
                name: v.nameNormalized,
                value:
                    selectedValues[v.nameNormalized] ?? defaultCanonicalOf(v),
            })),
        );
    }, [targetSubcatVars, selectedValues]);

    const reasonOk = reason.trim().length >= MIN_REASON;

    // A run whose current placement already IS the target is a no-op for
    // that run specifically — skipped rather than blocking the whole batch.
    const movable = runs.filter(
        (r) =>
            !(
                targetCategory?.id === category.id &&
                targetKey === r.subcategoryKey
            ),
    );

    if (!open) return null;

    const confirmMove = () => {
        if (targetCategory == null || movable.length === 0 || !reasonOk) return;
        const finalReason = reason.trim();
        const target = {
            categoryId: targetCategory.id,
            subcategoryKey: targetKey,
        };
        startMove(async () => {
            const errors: string[] = [];
            for (const run of movable) {
                const source = {
                    categoryId: category.id,
                    subcategoryKey: run.subcategoryKey,
                };
                const affected: AffectedLeaderboard[] = [source, target];
                const res = await moveRunAction(
                    gameSlug,
                    run.runId,
                    target,
                    affected,
                    finalReason,
                );
                if ('error' in res)
                    errors.push(`${run.runnerName}: ${res.error}`);
            }
            if (errors.length > 0) {
                setError(errors.join('; '));
                return;
            }
            onClose();
            onMutated();
        });
    };

    return (
        <BoardDialog
            open
            onClose={close}
            labelledBy="bulk-move-title"
            size="sm"
            closeOnBackdropClick={!isMoving}
        >
            <div className={styles.dialogHeader}>
                <h5 id="bulk-move-title" className={styles.dialogTitle}>
                    Move {runs.length} run{runs.length === 1 ? '' : 's'}
                </h5>
                <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={close}
                    disabled={isMoving}
                />
            </div>
            <div className={styles.dialogBody}>
                <label
                    htmlFor="bulk-move-category"
                    className={styles.fieldLabel}
                >
                    Category
                </label>
                <select
                    id="bulk-move-category"
                    className="form-select form-select-sm mb-2"
                    value={targetCategoryId}
                    onChange={(e) => {
                        setTargetCategoryId(Number(e.target.value));
                        setSelectedValues({});
                    }}
                    disabled={isMoving}
                >
                    {moveTargets.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.display}
                        </option>
                    ))}
                </select>
                <SubcategoryBands
                    variables={targetSubcatVars}
                    selectedValues={selectedValues}
                    onSelect={(name, canonical) =>
                        setSelectedValues((prev) => ({
                            ...prev,
                            [name]: canonical,
                        }))
                    }
                    idPrefix="bulk-move"
                />
                {movable.length < runs.length && (
                    <p className={styles.moveNote}>
                        {runs.length - movable.length} run
                        {runs.length - movable.length === 1 ? '' : 's'} already
                        placed here — only {movable.length} will move.
                    </p>
                )}
                <label htmlFor="bulk-move-reason" className={styles.fieldLabel}>
                    Reason — required, min {MIN_REASON} characters
                </label>
                <textarea
                    id="bulk-move-reason"
                    className={styles.dialogTextarea}
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={isMoving}
                />
                {!reasonOk && reason.length > 0 && (
                    <span className={styles.timeError}>
                        {MIN_REASON - reason.trim().length} more needed.
                    </span>
                )}
                {error && (
                    <div className={styles.errorAlert} role="alert">
                        {error}
                    </div>
                )}
            </div>
            <div className={styles.dialogFooter}>
                <button
                    type="button"
                    className={styles.slipAction}
                    onClick={close}
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
                        targetCategory == null ||
                        movable.length === 0 ||
                        !reasonOk
                    }
                >
                    {isMoving
                        ? 'Moving…'
                        : `Move ${movable.length} run${movable.length === 1 ? '' : 's'}`}
                </button>
            </div>
        </BoardDialog>
    );
}
