'use client';

import { useState } from 'react';
import type { BulkCategoryFields } from '~src/lib/category-mgmt';
import {
    type BoardDefaults,
    type BulkApplyPlan,
    type MatrixColumn,
    planBulkApply,
} from '~src/lib/setup/board-defaults';
import type { ResolvedCategory } from '../../../../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../../../../types/moderation.types';
import styles from './matrix.module.scss';

interface Props {
    categories: ResolvedCategory[];
    defaults: BoardDefaults;
    policies: BoardPolicyRow[];
    busy: boolean;
    onClear: () => void;
    onApply: (categoryIds: number[], fields: BulkCategoryFields) => void;
}

/** A staged apply, held until the moderator confirms the diff. */
interface Staged {
    column: MatrixColumn;
    label: string;
    fields: BulkCategoryFields;
    plan: BulkApplyPlan<unknown>;
}

/**
 * "Apply to selected", with the diff shown before anything is written.
 *
 * Select-all is the natural gesture on this screen and there is no undo, so an
 * apply that would overwrite a hand-set value has to say so and let the
 * moderator exclude those categories. Everything else on the matrix writes
 * immediately; this is the one place ceremony is worth a click.
 */
export function BulkBar({
    categories,
    defaults,
    policies,
    busy,
    onClear,
    onApply,
}: Props) {
    const [staged, setStaged] = useState<Staged | null>(null);

    const stage = <T,>(
        column: MatrixColumn,
        label: string,
        target: T,
        read: (c: ResolvedCategory) => T,
        fields: BulkCategoryFields,
    ) => {
        const plan = planBulkApply(
            categories,
            column,
            target,
            read,
            defaults,
            policies,
        );
        setStaged({
            column,
            label,
            fields,
            plan: plan as BulkApplyPlan<unknown>,
        });
    };

    const confirm = (includeDeviating: boolean) => {
        if (!staged) return;
        const excluded = includeDeviating
            ? new Set<number>()
            : new Set(staged.plan.overwritingDeviations.map((c) => c.id));
        const ids = staged.plan.changing
            .map((c) => c.category.id)
            .filter((id) => !excluded.has(id));
        setStaged(null);
        if (ids.length === 0) return;
        onApply(ids, staged.fields);
    };

    return (
        <>
            <div className={styles.bulkBar}>
                <span className={styles.bulkCount}>
                    {categories.length} selected
                </span>

                <select
                    className={styles.bulkControl}
                    value=""
                    disabled={busy}
                    aria-label="Apply timing to selected"
                    onChange={(e) => {
                        if (!e.target.value) return;
                        const gt = e.target.value === 'gt';
                        stage(
                            'timing',
                            gt ? 'Timing → IGT' : 'Timing → RTA',
                            gt ? 'gt' : 'rt',
                            (c) => c.primaryTiming,
                            {
                                primaryTiming: gt ? 'gametime' : 'realtime',
                            },
                        );
                        e.target.value = '';
                    }}
                >
                    <option value="">Timing…</option>
                    <option value="rt">RTA</option>
                    <option value="gt">IGT</option>
                </select>

                <select
                    className={styles.bulkControl}
                    value=""
                    disabled={busy}
                    aria-label="Apply ranking direction to selected"
                    onChange={(e) => {
                        if (!e.target.value) return;
                        const asc = e.target.value === 'asc';
                        stage(
                            'ranking',
                            asc
                                ? 'Ranking → lowest first'
                                : 'Ranking → highest first',
                            asc,
                            (c) => c.sortAscending ?? true,
                            { sortAscending: asc },
                        );
                        e.target.value = '';
                    }}
                >
                    <option value="">Ranking…</option>
                    <option value="asc">Lowest first</option>
                    <option value="desc">Highest first</option>
                </select>

                <select
                    className={styles.bulkControl}
                    value=""
                    disabled={busy}
                    aria-label="Apply milliseconds to selected"
                    onChange={(e) => {
                        if (!e.target.value) return;
                        const on = e.target.value === 'on';
                        stage(
                            'milliseconds',
                            on ? 'Milliseconds → on' : 'Milliseconds → off',
                            on,
                            (c) => c.showMilliseconds ?? true,
                            { showMilliseconds: on },
                        );
                        e.target.value = '';
                    }}
                >
                    <option value="">Milliseconds…</option>
                    <option value="on">On</option>
                    <option value="off">Off</option>
                </select>

                {defaults.rulesTemplate && (
                    <button
                        type="button"
                        className={styles.bulkControl}
                        disabled={busy}
                        onClick={() =>
                            stage(
                                'rules',
                                'Rules → board template',
                                (defaults.rulesTemplate ?? '').trim(),
                                (c) => (c.rules ?? '').trim(),
                                { rules: defaults.rulesTemplate },
                            )
                        }
                    >
                        Apply rules template
                    </button>
                )}

                <span className={styles.bulkSpacer} />
                <button
                    type="button"
                    className={styles.bulkControl}
                    onClick={onClear}
                >
                    Clear
                </button>
            </div>

            {staged && (
                <ApplyDialog
                    staged={staged}
                    onCancel={() => setStaged(null)}
                    onConfirm={confirm}
                />
            )}
        </>
    );
}

function ApplyDialog({
    staged,
    onCancel,
    onConfirm,
}: {
    staged: Staged;
    onCancel: () => void;
    onConfirm: (includeDeviating: boolean) => void;
}) {
    const [includeDeviating, setIncludeDeviating] = useState(false);
    const { changing, unchanged, overwritingDeviations } = staged.plan;

    const deviatingIds = new Set(overwritingDeviations.map((c) => c.id));
    const willWrite = includeDeviating
        ? changing.length
        : changing.filter((c) => !deviatingIds.has(c.category.id)).length;

    return (
        // Backdrop dismissal is a convenience; Cancel is the keyboard path.
        <div className={styles.dialogBackdrop} onClick={onCancel}>
            <div
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-label={staged.label}
                onClick={(e) => e.stopPropagation()}
            >
                <p className={styles.dialogTitle}>{staged.label}</p>

                {changing.length === 0 ? (
                    <p className={styles.dialogNote}>
                        Every selected category already has this value. Nothing
                        to apply.
                    </p>
                ) : (
                    <>
                        <ul className={styles.dialogList}>
                            {changing.map(({ category }) => {
                                const isDeviation = deviatingIds.has(
                                    category.id,
                                );
                                const skipped =
                                    isDeviation && !includeDeviating;
                                return (
                                    <li key={category.id}>
                                        <span
                                            className={
                                                skipped
                                                    ? styles.dialogFrom
                                                    : undefined
                                            }
                                        >
                                            {category.display}
                                        </span>
                                        {isDeviation && (
                                            <span className={styles.dialogWarn}>
                                                {' '}
                                                — set deliberately
                                                {skipped ? ', skipped' : ''}
                                            </span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>

                        {unchanged.length > 0 && (
                            <p className={styles.dialogNote}>
                                {unchanged.length}{' '}
                                {unchanged.length === 1
                                    ? 'category already has'
                                    : 'categories already have'}{' '}
                                this value.
                            </p>
                        )}

                        {overwritingDeviations.length > 0 && (
                            <label className={styles.dialogCheck}>
                                <input
                                    type="checkbox"
                                    checked={includeDeviating}
                                    onChange={(e) =>
                                        setIncludeDeviating(e.target.checked)
                                    }
                                />
                                <span>
                                    Also overwrite the{' '}
                                    {overwritingDeviations.length}{' '}
                                    {overwritingDeviations.length === 1
                                        ? 'category'
                                        : 'categories'}{' '}
                                    that differ from the board default on
                                    purpose. This cannot be undone.
                                </span>
                            </label>
                        )}
                    </>
                )}

                <div className={styles.dialogActions}>
                    <button
                        type="button"
                        className={styles.bulkControl}
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={styles.bulkControl}
                        disabled={willWrite === 0}
                        onClick={() => onConfirm(includeDeviating)}
                    >
                        Apply to {willWrite}
                    </button>
                </div>
            </div>
        </div>
    );
}
