'use client';

import {
    ArrowDownShort,
    ArrowLeftShort,
    ArrowRightShort,
    ArrowUpShort,
} from 'react-bootstrap-icons';
import type { UpsertVariableInput } from '~src/lib/leaderboard-variables';
import {
    type EffectiveVariable,
    toEffective,
} from '~src/lib/variables/effective';
import type { VariableRow } from '../../../../../../types/leaderboards.types';
import styles from './board-curation.module.scss';

/** Published subcategory-role variables in scope for a category, honoring
 * shadowing so a category-scoped variable that replaces a shared one
 * doesn't render two bands for the same name (see `toEffective`). Mirrors
 * `effectiveVariableCount` in `src/lib/setup/category-status.ts`, but needs
 * the rows themselves rather than just a count.
 *
 * Shared by `BoardCuration`'s own bands and `RowActions`' Move-to target
 * bands (Task 11) — one place computing "what bands does category X show",
 * so the two can never drift on the shadowing rule. */
export function subcategoryVariablesFor(
    categoryId: number,
    variables: VariableRow[],
): EffectiveVariable[] {
    const gameWide = variables.filter((v) => v.categoryId === null);
    const categoryScoped = variables.filter((v) => v.categoryId === categoryId);
    const tagged = toEffective([...gameWide, ...categoryScoped], gameWide);
    const shadowedNames = new Set(
        tagged
            .filter((v) => v.source === 'category-overrides-shared')
            .map((v) => v.nameNormalized),
    );
    return tagged.filter(
        (v) =>
            v.role === 'subcategory' &&
            v.published &&
            !(v.source === 'shared' && shadowedNames.has(v.nameNormalized)),
    );
}

function canonicalOf(v: VariableRow, idx: number): string {
    return v.values[idx]?.[0] ?? '';
}

export function defaultCanonicalOf(v: VariableRow): string {
    return v.defaultValueIndex != null
        ? canonicalOf(v, v.defaultValueIndex)
        : '';
}

/**
 * Builds a full `UpsertVariableInput` body from an existing variable row, so
 * a reorder write (row swap, value swap) or a "set as default view" pick
 * resends every field the backend's upsert needs to match the row rather
 * than just the one that changed. Pure — no server import here, so this
 * stays safe to pull into any component (`BoardCuration`'s reorder-mode
 * handlers, `BoardControls`' "Set as default view") without dragging a
 * `'use server'` module along for the ride.
 */
export function variableUpsertBody(
    row: VariableRow,
    overrides: Partial<UpsertVariableInput> = {},
): UpsertVariableInput {
    return {
        categoryId: row.categoryId,
        name: row.name,
        role: row.role,
        values: row.values,
        defaultValueIndex: row.defaultValueIndex,
        sortOrder: row.sortOrder,
        description: row.description,
        ...overrides,
    };
}

export interface SubcategoryBandsProps {
    variables: EffectiveVariable[];
    selectedValues: Record<string, string>;
    onSelect: (nameNormalized: string, canonical: string) => void;
    /** Distinguishes DOM ids between simultaneous renders of the same
     * category's bands (e.g. the board's own bands + a Move-to popover
     * targeting the same category) so `aria-labelledby` never points two
     * elements at the same id. */
    idPrefix?: string;
    /**
     * Reorder mode (Task 12's board toolbar): renders ↑/↓ per row and ←/→
     * per value chip. The mutation itself is owned by the caller
     * (`BoardCuration`) via `onNudgeRow`/`onNudgeValue` — this component
     * only reports which row/value moved which direction, so it never
     * imports a server action itself. That matters because `RowActions`'
     * Move-to popover reuses this same component and must never grow a
     * reorder UI (or its action-module import) just by rendering bands.
     */
    reorderMode?: boolean;
    onNudgeRow?: (
        variable: EffectiveVariable,
        index: number,
        dir: -1 | 1,
    ) => void;
    onNudgeValue?: (
        variable: EffectiveVariable,
        valueIndex: number,
        dir: -1 | 1,
    ) => void;
    /** Disables every nudge control while a reorder write is in flight. */
    reorderBusy?: boolean;
}

/** Renders one row of pill "bands" per published subcategory variable —
 * the masthead rail's chip vocabulary, shared between `BoardCuration`'s own
 * subcategory picker and the Move-to popover's target-subcategory picker. */
export function SubcategoryBands({
    variables,
    selectedValues,
    onSelect,
    idPrefix = 'board-curation',
    reorderMode = false,
    onNudgeRow,
    onNudgeValue,
    reorderBusy = false,
}: SubcategoryBandsProps) {
    if (variables.length === 0) return null;

    const rowsNudgeable = reorderMode && onNudgeRow != null;
    const valuesNudgeable = reorderMode && onNudgeValue != null;

    return (
        <div className={styles.subcategoryBands}>
            {variables.map((v, idx) => {
                const active =
                    selectedValues[v.nameNormalized] ?? defaultCanonicalOf(v);
                return (
                    <div key={v.id} className={styles.bandWrapper}>
                        <div
                            className={styles.block}
                            role="group"
                            aria-labelledby={`${idPrefix}-var-${v.id}`}
                        >
                            <span
                                id={`${idPrefix}-var-${v.id}`}
                                className={styles.endcap}
                            >
                                {v.name}
                                {rowsNudgeable && onNudgeRow && (
                                    <span className={styles.nudgeGroup}>
                                        <button
                                            type="button"
                                            className={styles.nudgeBtn}
                                            aria-label={`Move ${v.name} up`}
                                            onClick={() =>
                                                onNudgeRow(v, idx, -1)
                                            }
                                            disabled={reorderBusy || idx === 0}
                                        >
                                            <ArrowUpShort
                                                size={14}
                                                aria-hidden
                                            />
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.nudgeBtn}
                                            aria-label={`Move ${v.name} down`}
                                            onClick={() =>
                                                onNudgeRow(v, idx, 1)
                                            }
                                            disabled={
                                                reorderBusy ||
                                                idx === variables.length - 1
                                            }
                                        >
                                            <ArrowDownShort
                                                size={14}
                                                aria-hidden
                                            />
                                        </button>
                                    </span>
                                )}
                            </span>
                            <div className={styles.well}>
                                <div className={styles.chips}>
                                    {v.values.map((bucket, i) => {
                                        const canonical = bucket[0];
                                        const isActive = active === canonical;
                                        const chip = (
                                            <button
                                                type="button"
                                                aria-pressed={isActive}
                                                className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
                                                onClick={() =>
                                                    onSelect(
                                                        v.nameNormalized,
                                                        canonical,
                                                    )
                                                }
                                            >
                                                {canonical}
                                            </button>
                                        );
                                        if (
                                            !(valuesNudgeable && onNudgeValue)
                                        ) {
                                            return (
                                                <span key={`${v.id}-${i}`}>
                                                    {chip}
                                                </span>
                                            );
                                        }
                                        return (
                                            <span
                                                key={`${v.id}-${i}`}
                                                className={styles.nudgeGroup}
                                            >
                                                <button
                                                    type="button"
                                                    className={styles.nudgeBtn}
                                                    aria-label={`Move ${canonical} earlier`}
                                                    onClick={() =>
                                                        onNudgeValue(v, i, -1)
                                                    }
                                                    disabled={
                                                        reorderBusy || i === 0
                                                    }
                                                >
                                                    <ArrowLeftShort
                                                        size={14}
                                                        aria-hidden
                                                    />
                                                </button>
                                                {chip}
                                                <button
                                                    type="button"
                                                    className={styles.nudgeBtn}
                                                    aria-label={`Move ${canonical} later`}
                                                    onClick={() =>
                                                        onNudgeValue(v, i, 1)
                                                    }
                                                    disabled={
                                                        reorderBusy ||
                                                        i ===
                                                            v.values.length - 1
                                                    }
                                                >
                                                    <ArrowRightShort
                                                        size={14}
                                                        aria-hidden
                                                    />
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        {reorderMode && v.categoryId == null && (
                            <p className={styles.gameWideNote}>
                                Shared across every category — reordering here
                                changes it everywhere.
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
