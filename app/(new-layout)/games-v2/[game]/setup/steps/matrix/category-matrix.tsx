'use client';

import { useRouter } from 'next/navigation';
import { Fragment, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { compareByBoardOrder } from '~src/lib/console/category-order';
import { sectionsFor } from '~src/lib/console/category-sections';
import {
    type BoardDefaults,
    categoryMinMs,
    deviates,
    hasDefault,
    type MatrixColumn,
    rulesState,
    variableCount,
} from '~src/lib/setup/board-defaults';
import { formatTimeInput, parseTimeInput } from '~src/lib/time-input';
import type { ResolvedCategory } from '../../../../../../../types/leaderboards.types';
import { bulkUpdateCategoriesAction } from '../../actions/bulk-update-categories.action';
import { setCategoryMinimumAction } from '../../actions/set-category-minimum.action';
import type { WizardData } from '../../types';
import { BulkBar } from './bulk-bar';
import styles from './matrix.module.scss';
import { RulesPanel } from './rules-panel';

interface Props {
    data: WizardData;
    defaults: BoardDefaults;
    /** Opens the full CategoryEditor for the deep cases the matrix omits. */
    onOpenEditor: (categoryId: number) => void;
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
export function CategoryMatrix({ data, defaults, onOpenEditor }: Props) {
    const router = useRouter();
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [openRules, setOpenRules] = useState<number | null>(null);
    const [isSaving, startSave] = useTransition();

    const mains = data.categories
        .filter((c) => !c.archived && (c.isMain ?? false))
        .sort(compareByBoardOrder);
    const sections = sectionsFor(mains, data.groups);
    const grouped = sections.length > 1;

    const toggle = (id: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const allSelected = mains.length > 0 && selected.size === mains.length;
    const toggleAll = () => {
        setSelected(allSelected ? new Set() : new Set(mains.map((c) => c.id)));
    };

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

    // select, name, timing, minimum, rules, ranking, ms, vars, open-editor
    const columnCount = 9;

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
                            <th className={styles.selectCell}>
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={toggleAll}
                                    aria-label="Select all categories"
                                />
                            </th>
                            <th>Category</th>
                            <th>Timing</th>
                            <th>Minimum</th>
                            <th>Rules</th>
                            <th>Ranking</th>
                            <th>ms</th>
                            <th>Vars</th>
                            <th>
                                <span className="visually-hidden">
                                    Full editor
                                </span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sections.map((section, sectionIdx) => (
                            <MatrixSection
                                key={section.id ?? `ungrouped-${sectionIdx}`}
                                name={grouped ? section.name : null}
                                columnCount={columnCount}
                            >
                                {section.items.map((c) => {
                                    const min = categoryMinMs(c, data.policies);
                                    const rules = rulesState(c, defaults);
                                    const isOpen = openRules === c.id;
                                    return (
                                        <Fragment key={c.id}>
                                            <tr
                                                className={
                                                    selected.has(c.id)
                                                        ? styles.rowSelected
                                                        : undefined
                                                }
                                            >
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={selected.has(
                                                            c.id,
                                                        )}
                                                        onChange={() =>
                                                            toggle(c.id)
                                                        }
                                                        aria-label={`Select ${c.display}`}
                                                    />
                                                </td>
                                                <td className={styles.nameCell}>
                                                    {c.display}
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
                                                            defaults.minMs !==
                                                            null
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
                                                            if (
                                                                next !== current
                                                            ) {
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
                                                                : rules ===
                                                                    'custom'
                                                                  ? styles.rulesCustom
                                                                  : styles.rulesDefault
                                                        }`}
                                                        aria-expanded={isOpen}
                                                        onClick={() =>
                                                            setOpenRules(
                                                                isOpen
                                                                    ? null
                                                                    : c.id,
                                                            )
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

                                                <td className={styles.varsCell}>
                                                    {variableCount(
                                                        c.id,
                                                        data.variables,
                                                    ) || '—'}
                                                </td>

                                                <td>
                                                    <button
                                                        type="button"
                                                        className={
                                                            styles.openEditor
                                                        }
                                                        onClick={() =>
                                                            onOpenEditor(c.id)
                                                        }
                                                    >
                                                        Open full editor →
                                                    </button>
                                                </td>
                                            </tr>
                                            {isOpen && (
                                                <tr className={styles.rulesRow}>
                                                    <td colSpan={columnCount}>
                                                        <RulesPanel
                                                            gameSlug={
                                                                data.game.name
                                                            }
                                                            gameId={
                                                                data.game.id
                                                            }
                                                            category={c}
                                                            template={
                                                                defaults.rulesTemplate
                                                            }
                                                            onClose={() =>
                                                                setOpenRules(
                                                                    null,
                                                                )
                                                            }
                                                        />
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </MatrixSection>
                        ))}
                    </tbody>
                </table>
            </div>

            {selected.size > 0 && (
                <BulkBar
                    categories={mains.filter((c) => selected.has(c.id))}
                    defaults={defaults}
                    policies={data.policies}
                    busy={isSaving}
                    onClear={() => setSelected(new Set())}
                    onApply={applyToCategories}
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
