'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { DurationField } from '~src/components/time-input/duration-field';
import { compareByBoardOrder } from '~src/lib/console/category-order';
import { sectionsFor } from '~src/lib/console/category-sections';
import { formatDuration } from '~src/lib/duration';
import {
    type BoardDefaults,
    categoryMinMs,
    deviates,
    hasDefault,
    type MatrixColumn,
    otherTimeField,
    otherTiming,
    type RulesState,
    rendersAsDot,
    rulesState,
    showsOtherTime,
    type TimingChoice,
    timingChoiceFields,
    timingChoiceOf,
    timingLabel,
} from '~src/lib/setup/board-defaults';
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

/**
 * One category's minimum. Its own component because each cell holds the value
 * the mod is typing, and saves only when they leave it — a matrix of cells
 * cannot share one piece of state.
 */
function MinimumCell({
    value,
    inherited,
    className,
    disabled,
    label,
    onCommit,
}: {
    value: number | null;
    inherited: number | null;
    className: string;
    disabled: boolean;
    label: string;
    onCommit: (ms: number | null) => void;
}) {
    const [ms, setMs] = useState<number | null>(value);
    useEffect(() => {
        setMs(value);
    }, [value]);

    return (
        <DurationField
            size="sm"
            // The cell classes style the box, so they belong on the input —
            // on the wrapper their border draws a second box around it.
            inputClassName={className}
            value={ms}
            onChange={setMs}
            onCommit={(next) => {
                if (next !== value) onCommit(next);
            }}
            placeholder={inherited !== null ? formatDuration(inherited) : '—'}
            disabled={disabled}
            aria-label={label}
        />
    );
}

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

    /**
     * Both RTA columns ask questions only a game-time board has: what the
     * other clock is, and whether RTA may stand in when the game time is
     * missing. An RTA-ranked category has neither — RTA *is* its clock — so a
     * board with no game-time category drops the pair rather than printing a
     * column of em dashes nobody can ever fill.
     */
    const gameTimeCategories = mains.filter((c) => c.primaryTiming === 'gt');
    const showsRtaColumns =
        gameTimeCategories.length > 0 || defaults.primaryTiming === 'gt';
    /**
     * Only an all-game-time board can name the columns after RTA. On a mixed
     * board the other clock is IGT above the RTA rows, so the headers stay
     * neutral rather than lying about half the table.
     */
    const rtaHeaders =
        showsRtaColumns && gameTimeCategories.length === mains.length;

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

    const saveMinimum = (category: ResolvedCategory, ms: number | null) => {
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

    const cellState = (
        c: ResolvedCategory,
        column: MatrixColumn,
    ): CellState => {
        if (!hasDefault(defaults, column)) return 'noDefault';
        return deviates(c, column, defaults, data.policies)
            ? 'deviates'
            : 'quiet';
    };

    const cellClass = (c: ResolvedCategory, column: MatrixColumn) =>
        `${styles.cellControl} ${CELL_CLASS[cellState(c, column)]}`;

    /**
     * Inherited cells draw muted in every column; only some of them go all the
     * way to a dot. See DOTTED_COLUMNS — timing and the minimum keep their
     * values because they are a unit and a number, not preferences.
     */
    const dotted = (c: ResolvedCategory, column: MatrixColumn) =>
        rendersAsDot(column) && cellState(c, column) === 'quiet';

    // name (icon included), timing, [other time, RTA fallback,] minimum,
    // rules, ranking, ms
    const columnCount = showsRtaColumns ? 8 : 6;

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
                            <th>Timing</th>
                            {showsRtaColumns && (
                                <>
                                    <th>
                                        {rtaHeaders
                                            ? 'Show RTA'
                                            : 'Other timing'}
                                    </th>
                                    <th title="Put RTA in leaderboard if IGT is not available">
                                        {rtaHeaders
                                            ? 'Accept RTA as fallback'
                                            : 'RTA fallback'}
                                    </th>
                                </>
                            )}
                            <th>Min. time</th>
                            <th>Rules</th>
                            <th>Ranking</th>
                            <th>Milliseconds</th>
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
                            showsRtaColumns={showsRtaColumns}
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
                                            {/* The icon sits with the name it
                                                belongs to. As a column of its
                                                own it was eight empty boxes
                                                holding the second-best
                                                position on the screen. */}
                                            <td className={styles.nameCell}>
                                                <span
                                                    className={styles.nameInner}
                                                >
                                                    <IconCell
                                                        gameSlug={
                                                            data.game.name
                                                        }
                                                        gameId={data.game.id}
                                                        category={c}
                                                    />
                                                    {c.display}
                                                </span>
                                            </td>

                                            <td>
                                                <Cell dot={dotted(c, 'timing')}>
                                                    <select
                                                        className={cellClass(
                                                            c,
                                                            'timing',
                                                        )}
                                                        value={timingChoiceOf(
                                                            c.primaryTiming,
                                                            c.gameTimeLabel,
                                                        )}
                                                        disabled={isSaving}
                                                        aria-label={`Timing for ${c.display}`}
                                                        onChange={(e) =>
                                                            applyToCategories(
                                                                [c.id],
                                                                timingChoiceFields(
                                                                    e.target
                                                                        .value as TimingChoice,
                                                                ),
                                                            )
                                                        }
                                                    >
                                                        <option value="rt">
                                                            RTA
                                                        </option>
                                                        <option value="gt">
                                                            IGT
                                                        </option>
                                                        <option value="lrt">
                                                            LRT
                                                        </option>
                                                    </select>
                                                </Cell>
                                            </td>

                                            {showsRtaColumns && (
                                                <>
                                                    {/* The ranking clock can never
                                                    be hidden, so the only
                                                    decision is whether the
                                                    OTHER one shows — one
                                                    column instead of the pair
                                                    of hide flags it is stored
                                                    as. */}
                                                    <td>
                                                        <Cell
                                                            dot={dotted(
                                                                c,
                                                                'otherTime',
                                                            )}
                                                        >
                                                            <select
                                                                className={cellClass(
                                                                    c,
                                                                    'otherTime',
                                                                )}
                                                                value={
                                                                    showsOtherTime(
                                                                        c,
                                                                    )
                                                                        ? 'on'
                                                                        : 'off'
                                                                }
                                                                disabled={
                                                                    isSaving
                                                                }
                                                                aria-label={`Show ${timingLabel(
                                                                    otherTiming(
                                                                        c.primaryTiming,
                                                                    ),
                                                                    c.gameTimeLabel,
                                                                )} for ${c.display}`}
                                                                onChange={(e) =>
                                                                    applyToCategories(
                                                                        [c.id],
                                                                        otherTimeField(
                                                                            c.primaryTiming,
                                                                            e
                                                                                .target
                                                                                .value ===
                                                                                'on',
                                                                        ),
                                                                    )
                                                                }
                                                            >
                                                                <option value="on">
                                                                    Show{' '}
                                                                    {timingLabel(
                                                                        otherTiming(
                                                                            c.primaryTiming,
                                                                        ),
                                                                        c.gameTimeLabel,
                                                                    )}
                                                                </option>
                                                                <option value="off">
                                                                    Hide{' '}
                                                                    {timingLabel(
                                                                        otherTiming(
                                                                            c.primaryTiming,
                                                                        ),
                                                                        c.gameTimeLabel,
                                                                    )}
                                                                </option>
                                                            </select>
                                                        </Cell>
                                                    </td>

                                                    {/* Only meaningful where the
                                                board carries IGT at all —
                                                RTA-primary categories that
                                                hide IGT get the same em dash
                                                as every other unset cell. No
                                                board default exists: On is
                                                always a deliberate mark. */}
                                                    <td>
                                                        {c.primaryTiming ===
                                                            'gt' ||
                                                        showsOtherTime(c) ? (
                                                            <select
                                                                className={`${styles.cellControl} ${
                                                                    (c.rtaFallback ??
                                                                    false)
                                                                        ? styles.cellDeviates
                                                                        : styles.cellNoDefault
                                                                }`}
                                                                value={
                                                                    (c.rtaFallback ??
                                                                    false)
                                                                        ? 'on'
                                                                        : 'off'
                                                                }
                                                                disabled={
                                                                    isSaving
                                                                }
                                                                title={`Put RTA in leaderboard if ${timingLabel('gt', c.gameTimeLabel)} is not available`}
                                                                aria-label={`RTA fallback for ${c.display}`}
                                                                onChange={(e) =>
                                                                    applyToCategories(
                                                                        [c.id],
                                                                        {
                                                                            rtaFallback:
                                                                                e
                                                                                    .target
                                                                                    .value ===
                                                                                'on',
                                                                        },
                                                                    )
                                                                }
                                                            >
                                                                <option value="off">
                                                                    Off
                                                                </option>
                                                                <option value="on">
                                                                    On
                                                                </option>
                                                            </select>
                                                        ) : (
                                                            '\u2014'
                                                        )}
                                                    </td>
                                                </>
                                            )}

                                            <td>
                                                <Cell
                                                    dot={dotted(c, 'minimum')}
                                                >
                                                    <MinimumCell
                                                        value={min}
                                                        // Empty = no override:
                                                        // the board minimum
                                                        // applies, which is
                                                        // exactly the "—"
                                                        // state. The board
                                                        // value shows as the
                                                        // placeholder — at rest
                                                        // the cell draws a dot,
                                                        // like every other
                                                        // inherited cell.
                                                        inherited={
                                                            defaults.minMs
                                                        }
                                                        className={`${cellClass(
                                                            c,
                                                            'minimum',
                                                        )} ${styles.minInput}`}
                                                        disabled={isSaving}
                                                        label={`Minimum time for ${c.display}`}
                                                        onCommit={(ms) =>
                                                            saveMinimum(c, ms)
                                                        }
                                                    />
                                                </Cell>
                                            </td>

                                            {/* Three parallel readings of one
                                                thing — where the text came
                                                from — not two sources and an
                                                absence wearing the same chip. */}
                                            <td>
                                                <button
                                                    type="button"
                                                    className={`${styles.rulesChip} ${
                                                        RULES_CLASS[rules]
                                                    }`}
                                                    aria-haspopup="dialog"
                                                    aria-label={`Rules for ${c.display} — ${RULES_STATE_WORD[rules]}`}
                                                    onClick={() =>
                                                        setRulesFor(c.id)
                                                    }
                                                >
                                                    {RULES_LABEL[rules]}
                                                </button>
                                            </td>

                                            <td>
                                                <Cell
                                                    dot={dotted(c, 'ranking')}
                                                >
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
                                                            Lowest
                                                        </option>
                                                        <option value="desc">
                                                            Highest
                                                        </option>
                                                    </select>
                                                </Cell>
                                            </td>

                                            <td>
                                                <Cell
                                                    dot={dotted(
                                                        c,
                                                        'milliseconds',
                                                    )}
                                                >
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
                                                            On
                                                        </option>
                                                        <option value="off">
                                                            Off
                                                        </option>
                                                    </select>
                                                </Cell>
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

type CellState = 'quiet' | 'deviates' | 'noDefault';

const CELL_CLASS: Record<CellState, string> = {
    quiet: styles.cellQuiet,
    deviates: styles.cellDeviates,
    noDefault: styles.cellNoDefault,
};

/**
 * A cell that holds the board default, in a column where the value is not
 * worth reading, renders a dot instead of it.
 *
 * The value is already stated once, directly above, in the same column, and
 * repeating "Lowest" down eight rows is the exact noise a deviation matrix
 * exists to remove. The control underneath is untouched, and hovering or
 * focusing brings the word back in place, in the same box, so nothing shifts.
 *
 * Which columns qualify is DOTTED_COLUMNS' decision, not this component's —
 * timing and the minimum keep their values, because a unit and a number are
 * read on purpose rather than only when they are wrong.
 */
function Cell({ dot, children }: { dot: boolean; children: React.ReactNode }) {
    if (!dot) return <>{children}</>;
    return (
        <span className={styles.quietWrap}>
            {children}
            <span className={styles.quietDot} aria-hidden>
                ·
            </span>
        </span>
    );
}

/**
 * One vocabulary for "where the rules came from".
 *
 * These used to be three chips reading TEMPLATE, CUSTOM and NONE — two sources
 * and an absence, drawn as if they were the same kind of answer, with the
 * absence in amber. Now the two sources are named and the absence is the same
 * em dash every other unset cell on the screen uses.
 */
const RULES_LABEL: Record<RulesState, string> = {
    default: 'Template',
    custom: 'Custom',
    none: '—',
};

const RULES_STATE_WORD: Record<RulesState, string> = {
    default: 'board template',
    custom: 'own text',
    none: 'not set',
};

const RULES_CLASS: Record<RulesState, string> = {
    default: styles.rulesDefault,
    custom: styles.rulesCustom,
    none: styles.rulesNone,
};
