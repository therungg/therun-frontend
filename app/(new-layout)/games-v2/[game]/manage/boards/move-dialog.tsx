'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
    buildSubcategoryKey,
    parseSubcategoryKey,
} from '~src/lib/variables/keys';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import type { LeaderboardRosterRow } from '../../../../../../types/moderation.types';
import { BoardDialog } from '../../shared/board-dialog';
import { moveRunAction } from '../moderation/shared/actions/board-override.action';
import { fireUndoToast } from '../moderation/shared/undo-toast';
import styles from './board-curation.module.scss';
import {
    defaultCanonicalOf,
    SubcategoryBands,
    subcategoryVariablesFor,
} from './subcategory-bands';

export interface MoveDialogProps {
    open: boolean;
    onClose: () => void;
    row: LeaderboardRosterRow;
    /** The row's current placement. */
    category: ResolvedCategory;
    /** Move-to target choices — the board's featured categories (self
     * included, so a mod can change only the subcategory). */
    categories: ResolvedCategory[];
    variables: VariableRow[];
    /** The row's current subcategory key. */
    subcategoryKey: string;
    gameSlug: string;
    onMutated: () => void;
}

/**
 * Move a run to another category/subcategory via a board override —
 * extracted from the console's `RowActions` so the public board's row menu
 * mounts the same implementation. Owns its pending state and blocks its own
 * close while the move is in flight, same contract as AdjustDialog and
 * RunnerDialog.
 */
export function MoveDialog({
    open,
    onClose,
    row,
    category,
    categories,
    variables,
    subcategoryKey,
    gameSlug,
    onMutated,
}: MoveDialogProps) {
    const [targetCategoryId, setTargetCategoryId] = useState<number | ''>('');
    const [selectedValues, setSelectedValues] = useState<
        Record<string, string>
    >({});
    const [error, setError] = useState<string | null>(null);
    const [isMoving, startMove] = useTransition();

    // Seed from the row's *current* placement (not the target category's
    // defaults) each time the dialog opens, so Apply starts disabled —
    // nothing has changed yet.
    useEffect(() => {
        if (!open) return;
        setTargetCategoryId(category.id);
        const initial: Record<string, string> = {};
        for (const part of parseSubcategoryKey(subcategoryKey)) {
            initial[part.name] = part.value;
        }
        setSelectedValues(initial);
        setError(null);
    }, [open, category.id, subcategoryKey]);

    const close = () => {
        if (isMoving) return;
        onClose();
    };

    const targetCategory =
        categories.find((c) => c.id === targetCategoryId) ?? null;
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

    // The backend rejects a move to the run's current placement — prevent
    // it client-side too rather than round-tripping for the error.
    const isNoOpMove =
        targetCategory != null &&
        targetCategory.id === category.id &&
        targetKey === subcategoryKey;

    const confirmMove = () => {
        if (targetCategory == null || isNoOpMove) return;
        const source = { categoryId: category.id, subcategoryKey };
        const target = {
            categoryId: targetCategory.id,
            subcategoryKey: targetKey,
        };
        startMove(async () => {
            // Source loses the run, target gains it — both leaderboard reads
            // need their cache invalidated.
            const res = await moveRunAction(gameSlug, row.runId, target, [
                source,
                target,
            ]);
            if ('error' in res) {
                setError(res.error);
                return;
            }
            onClose();
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

    if (!open) return null;

    return (
        <BoardDialog
            open
            onClose={close}
            labelledBy="move-sheet-title"
            size="sm"
            closeOnBackdropClick={!isMoving}
        >
            <div className={styles.dialogHeader}>
                <h5 id="move-sheet-title" className={styles.dialogTitle}>
                    Move {row.runnerName}
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
                <label htmlFor="move-category" className={styles.fieldLabel}>
                    Category
                </label>
                <select
                    id="move-category"
                    className="form-select form-select-sm mb-2"
                    value={targetCategoryId}
                    onChange={(e) => {
                        setTargetCategoryId(Number(e.target.value));
                        setSelectedValues({});
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
                    variables={targetSubcatVars}
                    selectedValues={selectedValues}
                    onSelect={(name, canonical) =>
                        setSelectedValues((prev) => ({
                            ...prev,
                            [name]: canonical,
                        }))
                    }
                    idPrefix={`move-${row.runId}`}
                />
                {isNoOpMove && (
                    <p className={styles.moveNote}>Already placed here.</p>
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
                    disabled={isMoving || targetCategory == null || isNoOpMove}
                >
                    {isMoving ? 'Moving…' : 'Apply'}
                </button>
            </div>
        </BoardDialog>
    );
}
