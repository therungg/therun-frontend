'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { compareByBoardOrder } from '~src/lib/console/category-order';
import { sectionsFor } from '~src/lib/console/category-sections';
import {
    type BoardDefaults,
    categoryMinMs,
    deviates,
    hasDefault,
    type MatrixColumn,
    otherTimeField,
    otherTiming,
    rulesState,
    showsOtherTime,
    TIMING_LABEL,
} from '~src/lib/setup/board-defaults';
import { formatTimeInput, parseTimeInput } from '~src/lib/time-input';
import type { ResolvedCategory } from '../../../../../../../types/leaderboards.types';
import { bulkUpdateCategoriesAction } from '../../actions/bulk-update-categories.action';
import { setCategoryMinimumAction } from '../../actions/set-category-minimum.action';
import type { WizardData } from '../../types';
import { DefaultsRow } from './defaults-row';
import { IconCell } from './icon-cell';
import styles from './matrix.module.scss';
import { RulesDialog } from './rules-dialog';

interface Props {
    data: WizardData;
    defaults: BoardDefaults;
    /** Category whose rules open on mount, from a `?cat=<id>` deep link. */
    initialOpenCategoryId?: number | null;
}

/**
 * Zone 1 of step 4: the board's featured categories against the board
 * defaults.
 *
 * Every cell renders a DEVIATION, not a value — a category sitting on the
 * board default is drawn quiet, so a healthy board reads as an almost-empty
 * grid and the eye lands on the exceptions. That is what makes this legible
 * at 30 categories where a wall of raw values would not be.
 *
 * Writes land immediately (scalar edits are trivially reversible), with one
 * exception: a bulk apply first shows what it would change, because select-all
 * is the natural gesture here and there is no undo.
 */
export function CategoryMatrix({
    data,
    defaults,
    initialOpenCategoryId,
}: Props) {
    const router = useRouter();
    // Rules are the one thing here that needs room, so they are the one thing
    // that takes over. Everything else is a cell.
    const [rulesFor, setRulesFor] = useState<number | null>(
        initialOpenCategoryId ?? null,
    );
    const [isSaving, startSave] = useTransition();

    const mains = data.categories
        .filter((c) => !c.archived && (c.isMain ?? false))
        .sort(compareByBoardOrder);
    const sections = sectionsFor(mains, data.groups);
    const rulesCategory = mains.find((c) => c.id === rulesFor) ?? null;
    const grouped = sections.length > 1;

    const applyToCategories = (
        categoryIds: number[],
        fields: Parameters<typeof bulkUpdateCategoriesAction>[0]['fields'],
    ) => {
        startSave(async () => {
            const res = await bulkUpdateCategoriesAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                categoryIds,
                fields,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            router.refresh();
        });
    };

    const saveMinimum = (category: ResolvedCategory, raw: string) => {
        const trimmed = raw.trim();
        const ms = trimmed === '' ? null : parseTimeInput(trimmed);
        if (trimmed !== '' && ms === undefined) {
            toast.error('Time must be h:mm:ss, m:ss, or m:ss.SSS.');
            return;
        }
        startSave(async () => {
            const res = await setCategoryMinimumAction({
                gameSlug: data.game.name,
                categoryId: category.id,
                timing: category.primaryTiming,
                minMs: ms ?? null,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            router.refresh();
        });
    };

    const cellClass = (c: ResolvedCategory, column: MatrixColumn) => {
        if (!hasDefault(defaults, column)) {
            return `${styles.cellControl} ${styles.cellNoDefault}`;
        }
        return `${styles.cellControl} ${
            deviates(c, column, defaults, data.policies)
                ? styles.cellDeviates
                : styles.cellQuiet
        }`;
    };

    // name, icon, timing, other time, minimum, rules, ranking, ms
    const columnCount = 8;

    return (
        <div className={styles.panel}>
            <div className={styles.head}>
                <span className={styles.headTitle}>Featured categories</span>
                <span className={styles.headCount}>
                    {mains.length} on the board
                </span>
            </div>
            <div className={styles.scroller}>
                <table className={styles.grid}>
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Icon</th>
                            <th>Timing</th>
                            <th>Other timing</th>
                            <th>Min. Time</th>
                            <th>Rules</th>
                            <th>Ranking</th>
                            <th>Show Milliseconds</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Row zero: the values every cell below is a
                            deviation from, in the same columns, editable
                            where their consequences are visible. */}
                        <DefaultsRow
                            gameSlug={data.game.name}
                            gameId={data.game.id}
                            defaults={defaults}
                            policies={data.policies}
                            columnCount={columnCount}
                            categories={mains}
                            onApplyToCategories={applyToCategories}
                        />
                        {sections.map((section, sectionIdx) => (
                            <MatrixSection
                                key={section.id ?? `ungrouped-${sectionIdx}`}
                                name={grouped ? section.name : null}
                                columnCount={columnCount}
                            >
                                {section.items.map((c) => {
                                    const min = categoryMinMs(c, data.policies);
                                    const rules = rulesState(c, defaults);
                                    return (
                                        <tr key={c.id}>
                                            <td className={styles.nameCell}>
                                                {c.display}
                                            </td>

                                            <td>
                                                <IconCell
                                                    gameSlug={data.game.name}
                                                    gameId={data.game.id}
                                                    category={c}
                                                />
                                            </td>

                                            <td>
                                                <select
                                                    className={cellClass(
                                                        c,
                                                        'timing',
                                                    )}
                                                    value={c.primaryTiming}
                                                    disabled={isSaving}
                                                    aria-label={`Timing for ${c.display}`}
                                                    onChange={(e) =>
                                                        applyToCategories(
                                                            [c.id],
                                                            {
                                                                primaryTiming:
                                                                    e.target
                                                                        .value ===
                                                                    'gt'
                                                                        ? 'gametime'
                                                                        : 'realtime',
                                                            },
                                                        )
                                                    }
                                                >
                                                    <option value="rt">
                                                        {labelFor(
                                                            'rt',
                                                            defaults.primaryTiming,
                                                            'RTA',
                                                        )}
                                                    </option>
                                                    <option value="gt">
                                                        {labelFor(
                                                            'gt',
                                                            defaults.primaryTiming,
                                                            'IGT',
                                                        )}
                                                    </option>
                                                </select>
                                            </td>

                                            {/* The ranking clock can never
                                                    be hidden, so the only
                                                    decision is whether the
                                                    OTHER one shows — one
                                                    column instead of the pair
                                                    of hide flags it is stored
                                                    as. */}
                                            <td>
                                                <select
                                                    className={cellClass(
                                                        c,
                                                        'otherTime',
                                                    )}
                                                    value={
                                                        showsOtherTime(c)
                                                            ? 'on'
                                                            : 'off'
                                                    }
                                                    disabled={isSaving}
                                                    aria-label={`Show ${
                                                        TIMING_LABEL[
                                                            otherTiming(
                                                                c.primaryTiming,
                                                            )
                                                        ]
                                                    } for ${c.display}`}
                                                    onChange={(e) =>
                                                        applyToCategories(
                                                            [c.id],
                                                            otherTimeField(
                                                                c.primaryTiming,
                                                                e.target
                                                                    .value ===
                                                                    'on',
                                                            ),
                                                        )
                                                    }
                                                >
                                                    <option value="on">
                                                        {labelFor(
                                                            true,
                                                            defaults.showOtherTime,
                                                            `Show ${TIMING_LABEL[otherTiming(c.primaryTiming)]}`,
                                                        )}
                                                    </option>
                                                    <option value="off">
                                                        {labelFor(
                                                            false,
                                                            defaults.showOtherTime,
                                                            `Hide ${TIMING_LABEL[otherTiming(c.primaryTiming)]}`,
                                                        )}
                                                    </option>
                                                </select>
                                            </td>

                                            <td>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    className={`${cellClass(
                                                        c,
                                                        'minimum',
                                                    )} ${styles.minInput}`}
                                                    defaultValue={
                                                        min === null
                                                            ? ''
                                                            : formatTimeInput(
                                                                  min,
                                                              )
                                                    }
                                                    // Empty = no override:
                                                    // the board minimum
                                                    // applies, which is
                                                    // exactly the "—" state.
                                                    placeholder={
                                                        defaults.minMs !== null
                                                            ? formatTimeInput(
                                                                  defaults.minMs,
                                                              )
                                                            : '—'
                                                    }
                                                    disabled={isSaving}
                                                    aria-label={`Minimum time for ${c.display}`}
                                                    onBlur={(e) => {
                                                        const next =
                                                            e.target.value.trim();
                                                        const current =
                                                            min === null
                                                                ? ''
                                                                : formatTimeInput(
                                                                      min,
                                                                  );
                                                        if (next !== current) {
                                                            saveMinimum(
                                                                c,
                                                                next,
                                                            );
                                                        }
                                                    }}
                                                />
                                            </td>

                                            <td>
                                                <button
                                                    type="button"
                                                    className={`${styles.rulesChip} ${
                                                        rules === 'none'
                                                            ? styles.rulesNone
                                                            : rules === 'custom'
                                                              ? styles.rulesCustom
                                                              : styles.rulesDefault
                                                    }`}
                                                    aria-haspopup="dialog"
                                                    onClick={() =>
                                                        setRulesFor(c.id)
                                                    }
                                                >
                                                    {rules}
                                                </button>
                                            </td>

                                            <td>
                                                <select
                                                    className={cellClass(
                                                        c,
                                                        'ranking',
                                                    )}
                                                    value={
                                                        (c.sortAscending ??
                                                        true)
                                                            ? 'asc'
                                                            : 'desc'
                                                    }
                                                    disabled={isSaving}
                                                    aria-label={`Ranking direction for ${c.display}`}
                                                    onChange={(e) =>
                                                        applyToCategories(
                                                            [c.id],
                                                            {
                                                                sortAscending:
                                                                    e.target
                                                                        .value ===
                                                                    'asc',
                                                            },
                                                        )
                                                    }
                                                >
                                                    <option value="asc">
                                                        {labelFor(
                                                            true,
                                                            defaults.sortAscending,
                                                            'Lowest',
                                                        )}
                                                    </option>
                                                    <option value="desc">
                                                        {labelFor(
                                                            false,
                                                            defaults.sortAscending,
                                                            'Highest',
                                                        )}
                                                    </option>
                                                </select>
                                            </td>

                                            <td>
                                                <select
                                                    className={cellClass(
                                                        c,
                                                        'milliseconds',
                                                    )}
                                                    value={
                                                        (c.showMilliseconds ??
                                                        true)
                                                            ? 'on'
                                                            : 'off'
                                                    }
                                                    disabled={isSaving}
                                                    aria-label={`Show milliseconds for ${c.display}`}
                                                    onChange={(e) =>
                                                        applyToCategories(
                                                            [c.id],
                                                            {
                                                                showMilliseconds:
                                                                    e.target
                                                                        .value ===
                                                                    'on',
                                                            },
                                                        )
                                                    }
                                                >
                                                    <option value="on">
                                                        {labelFor(
                                                            true,
                                                            defaults.showMilliseconds,
                                                            'On',
                                                        )}
                                                    </option>
                                                    <option value="off">
                                                        {labelFor(
                                                            false,
                                                            defaults.showMilliseconds,
                                                            'Off',
                                                        )}
                                                    </option>
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </MatrixSection>
                        ))}
                    </tbody>
                </table>
            </div>

            {rulesCategory && (
                <RulesDialog
                    title={`${rulesCategory.display} rules`}
                    lede="Shown on the leaderboard, and what a runner is held to."
                    initial={rulesCategory.rules ?? ''}
                    template={defaults.rulesTemplate}
                    busy={isSaving}
                    placeholder={
                        defaults.rulesTemplate
                            ? 'Empty — the board template is one click away.'
                            : 'No rules set for this category.'
                    }
                    onClose={() => setRulesFor(null)}
                    onSave={(text) => {
                        // Empty clears the rules rather than storing
                        // whitespace, so the chip reads "none" instead of a
                        // false "custom".
                        applyToCategories([rulesCategory.id], {
                            rules: text || null,
                        });
                        setRulesFor(null);
                    }}
                />
            )}
        </div>
    );
}

/**
 * Group heading inside the table body, so the grid reads in the same sections
 * the public band renders. Named sections only appear when the board actually
 * has more than one (sectionsFor's flatten-when-trivial rule).
 */
function MatrixSection({
    name,
    columnCount,
    children,
}: {
    name: string | null;
    columnCount: number;
    children: React.ReactNode;
}) {
    return (
        <>
            {name && (
                <tr className={styles.groupRow}>
                    <th colSpan={columnCount}>{name}</th>
                </tr>
            )}
            {children}
        </>
    );
}

/**
 * An option's label. The option matching the board default says so, which is
 * what lets the closed select read as "nothing to see here" while still being
 * one click from a change.
 */
function labelFor<T>(value: T, boardDefault: T | null, label: string): string {
    if (boardDefault === null) return label;
    return value === boardDefault ? `Default (${label})` : label;
}
