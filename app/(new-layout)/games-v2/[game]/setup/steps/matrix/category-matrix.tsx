'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import {
    CaretDownFill,
    CaretUpFill,
    ChevronRight,
    GripVertical,
} from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { DurationField } from '~src/components/time-input/duration-field';
import type { ManageGroup } from '~src/lib/category-mgmt';
import { compareByBoardOrder } from '~src/lib/console/category-order';
import { subBoardCount } from '~src/lib/console/category-rows';
import { sectionsFor } from '~src/lib/console/category-sections';
import { formatDuration } from '~src/lib/duration';
import {
    categoryMinMs,
    type MatrixColumn,
    otherTimeField,
    otherTiming,
    type RulesState,
    rulesState,
    showsOtherTime,
    type TimingChoice,
    timingChoiceFields,
    timingChoiceOf,
    timingLabel,
} from '~src/lib/setup/board-defaults';
import {
    findGameMinPolicy,
    minMsFromPolicy,
} from '~src/lib/setup/game-minimum';
import type {
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
    VariableRow,
} from '../../../../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../../../../types/moderation.types';
import { subcategoryVariablesFor } from '../../../manage/boards/subcategory-bands';
import boardStyles from '../../../manage/console/board-categories.module.scss';
import { bulkUpdateCategoriesAction } from '../../actions/bulk-update-categories.action';
import { setCategoryMinimumAction } from '../../actions/set-category-minimum.action';
import { IconCell } from './icon-cell';
import styles from './matrix.module.scss';
import { RulesDialog } from './rules-dialog';
import { SubcategoryDialog } from './subcategory-dialog';

/**
 * The structure edits — order, grouping, membership — that only the console
 * offers.
 *
 * The wizard reaches this matrix having just decided all three in earlier
 * steps, so handing it these controls would ask the same question twice on the
 * same screen. The console has no earlier step: it IS the board's front door,
 * so the row has to carry its own rank, its group and its way off the board.
 * The matrix owns none of that state — every one of these is a callback,
 * because the console's optimistic rows are the source of truth for what the
 * table is currently showing, not the server snapshot this component reads.
 */
export interface MatrixStructure {
    /** Assignable groups; the caller drops `kind === 'level'` ones. */
    groupOptions: ManageGroup[];
    /** Raw select value: '' = ungrouped, '__create__' = open the create prompt. */
    onGroupChange: (categoryId: number, raw: string) => void;
    onRemove: (categoryId: number) => void;
    onMove: (categoryId: number, delta: -1 | 1) => void;
    onDropRow: (draggedId: number, overId: number) => void;
    onEdit: (categoryId: number) => void;
    /** Rows with a structure write in flight — their controls go inert. */
    busyIds: Set<number>;
    reorderPending: boolean;
}

interface Props {
    game: ResolvedGame;
    /** Any category list; the matrix renders the featured, unarchived slice. */
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    policies: BoardPolicyRow[];
    /** Category whose rules open on mount, from a `?cat=<id>` deep link. */
    initialOpenCategoryId?: number | null;
    /** Omitted (the wizard) = no structure columns at all. */
    structure?: MatrixStructure;
    /**
     * What the rows are. 'levels' draws the same grid over a level slice: the
     * group column goes (a level's group is what makes it a level, so it is
     * never a choice), the reorder handle goes with it, and the shared
     * subcategory suffix every level board carries is dropped from the name —
     * five rows reading "… — Flight" say "Flight" five times and the level
     * name once.
     */
    subject?: 'categories' | 'levels';
    /** Published subcategory variables. Given them, the grid counts how many
     *  boards each category actually splits into and says so in its own
     *  column; without them that column is not drawn. */
    variables?: VariableRow[];
}

/**
 * Zone 1 of step 4: the board's featured categories.
 *
 * Every cell renders its own value. There are no board defaults to deviate
 * from — each category is set on its own, as many times as that takes.
 *
 * Writes land immediately (scalar edits are trivially reversible), with one
 * exception: a bulk apply first shows what it would change, because select-all
 * is the natural gesture here and there is no undo.
 */

/**
 * The trailing "— Something" every name shares, if they all share one.
 *
 * Level boards are named `<level> — <subcategory>` by the level machinery, so
 * a board with one level subcategory prints it on every row. Returned without
 * the dash so a heading can say it once.
 */
function sharedNameTail(names: string[]): string | null {
    if (names.length < 2) return null;
    const tailOf = (n: string) => {
        const at = n.lastIndexOf(' — ');
        return at < 0 ? null : n.slice(at + 3).trim();
    };
    const first = tailOf(names[0]);
    if (!first) return null;
    return names.every((n) => tailOf(n) === first) ? first : null;
}

function stripTail(name: string, tail: string): string {
    const suffix = ` — ${tail}`;
    return name.endsWith(suffix) ? name.slice(0, -suffix.length) : name;
}

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
    game,
    categories,
    groups,
    policies,
    initialOpenCategoryId,
    structure,
    variables,
    subject = 'categories',
}: Props) {
    const router = useRouter();
    // Rules are the one thing here that needs room, so they are the one thing
    // that takes over. Everything else is a cell.
    const [rulesFor, setRulesFor] = useState<number | null>(
        initialOpenCategoryId ?? null,
    );
    const [isSaving, startSave] = useTransition();
    // Which category's boards are open. Its own state, not `rulesFor`: the
    // subcategory dialog can hand off to the rules dialog, so the two have to
    // be able to swap without one closing the other by accident.
    const [subcatsFor, setSubcatsFor] = useState<number | null>(null);
    // Which row is being dragged. Local because it is a gesture, not a fact
    // about the board — the drop is what the caller hears about.
    const [dragId, setDragId] = useState<number | null>(null);

    const isLevels = subject === 'levels';

    const mains = categories
        .filter((c) => !c.archived && (c.isMain ?? false))
        .sort(compareByBoardOrder);
    // The tail every row repeats — "Crystal Flight — Flight", "Icy Flight —
    // Flight" — is the subcategory these boards belong to, not part of any
    // level's name. Printed once in the heading, never in the rows.
    const sharedTail = sharedNameTail(mains.map((c) => c.display));
    const rowName = (c: ResolvedCategory) =>
        sharedTail ? stripTail(c.display, sharedTail) : c.display;
    // `sectionsFor` emits a section per group, empty ones included — it is
    // written for the public rail, where a group with nothing in it still has
    // to hold its place. A settings grid has no such contract: an empty band
    // is a heading over no rows, so the group only appears once something is
    // actually in it.
    const sections = sectionsFor(mains, groups).filter(
        (s) => s.items.length > 0,
    );
    const rulesCategory = mains.find((c) => c.id === rulesFor) ?? null;
    const subcatsCategory = mains.find((c) => c.id === subcatsFor) ?? null;
    const grouped = sections.length > 1;

    /**
     * Both RTA columns ask questions only a game-time board has: what the
     * other clock is, and whether RTA may stand in when the game time is
     * missing. An RTA-ranked category has neither — RTA *is* its clock — so a
     * board with no game-time category drops the pair rather than printing a
     * column of em dashes nobody can ever fill.
     */
    const gameTimeCategories = mains.filter((c) => c.primaryTiming === 'gt');
    const showsRtaColumns = gameTimeCategories.length > 0;

    // Not a board default — the game's own minimum policy, which a category
    // with no minimum of its own really does inherit backend-side. It is the
    // placeholder in an empty minimum cell so the cell does not imply "no
    // minimum applies" when one does.
    const gameMinMs = minMsFromPolicy(findGameMinPolicy(policies), 'rt');
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
                gameSlug: game.name,
                gameId: game.id,
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
                gameSlug: game.name,
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

    /**
     * A row was dropped on `overId`. The drag itself is local state; what the
     * caller hears is only the pair, because deciding whether the move is legal
     * (same group) and what it renumbers is the console's job — it holds the
     * live rows, this component holds a server snapshot.
     */
    const dropOn = (overId: number) => {
        const dragged = dragId;
        setDragId(null);
        if (dragged === null || dragged === overId) return;
        structure?.onDropRow(dragged, overId);
    };

    // There is no board default to deviate from any more, so every cell
    // renders its own value at full strength. The quiet/deviates distinction
    // (and the dot that stood in for "inherited") went with the defaults row.
    const cellClass = (_c: ResolvedCategory, _column: MatrixColumn) =>
        `${styles.cellControl} ${styles.cellNoDefault}`;

    const dotted = (_c: ResolvedCategory, _column: MatrixColumn) => false;

    // name (icon included), timing, [other time, RTA fallback,] minimum,
    // rules, ms — plus the two structure columns (group and the row actions)
    // when the console asks for them. This is what row zero and every
    // group band row span, so it has to count what is actually drawn: a band
    // that stops short of the last column reads as a broken table, not as a
    // heading.
    const columnCount =
        (showsRtaColumns ? 7 : 5) +
        (structure ? (isLevels ? 1 : 2) : 0) +
        (variables ? 1 : 0);

    return (
        <div className={styles.panel}>
            <div className={styles.head}>
                <span className={styles.headTitle}>
                    {isLevels ? 'Levels' : 'Featured categories'}
                </span>
                <span className={styles.headCount}>
                    {isLevels && sharedTail ? `${sharedTail} · ` : ''}
                    {mains.length} on the board
                </span>
            </div>
            <div className={styles.scroller}>
                <table className={styles.grid}>
                    <thead>
                        <tr>
                            <th>{isLevels ? 'Level' : 'Category'}</th>
                            {structure && !isLevels && <th>Group</th>}
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
                            {variables && (
                                <th title="Boards this category splits into, across its published subcategories">
                                    Subcategories
                                </th>
                            )}
                            <th>Min. time</th>
                            <th>Rules</th>
                            {/* Ranking direction has no column anywhere in the
                                frontend. `sortAscending` is still stored and
                                honoured — the board reads it, the API writes
                                it — it is simply not something a moderator is
                                asked here. */}
                            <th>Milliseconds</th>
                            {structure && <th />}
                        </tr>
                    </thead>
                    <tbody>
                        {sections.map((section, sectionIdx) => (
                            <MatrixSection
                                key={section.id ?? `ungrouped-${sectionIdx}`}
                                name={grouped ? section.name : null}
                                columnCount={columnCount}
                            >
                                {section.items.map((c, rowIdx) => {
                                    const min = categoryMinMs(c, policies);
                                    const rules = rulesState(c);
                                    const busy =
                                        structure?.busyIds.has(c.id) ?? false;
                                    return (
                                        <tr
                                            key={c.id}
                                            onDragOver={
                                                structure
                                                    ? (e) => e.preventDefault()
                                                    : undefined
                                            }
                                            onDrop={
                                                structure
                                                    ? () => dropOn(c.id)
                                                    : undefined
                                            }
                                        >
                                            {/* The icon sits with the name it
                                                belongs to. As a column of its
                                                own it was eight empty boxes
                                                holding the second-best
                                                position on the screen. The
                                                reorder controls sit here for
                                                the same reason: rank is not a
                                                fact worth a column, it is what
                                                the row's position already
                                                says. */}
                                            <td className={styles.nameCell}>
                                                <span
                                                    className={styles.nameInner}
                                                >
                                                    {structure && !isLevels && (
                                                        <ReorderHandle
                                                            category={c}
                                                            index={rowIdx}
                                                            lastIndex={
                                                                section.items
                                                                    .length - 1
                                                            }
                                                            dragging={
                                                                dragId === c.id
                                                            }
                                                            structure={
                                                                structure
                                                            }
                                                            onDragStart={() =>
                                                                setDragId(c.id)
                                                            }
                                                            onDragEnd={() =>
                                                                setDragId(null)
                                                            }
                                                        />
                                                    )}
                                                    {/* A level's icon slot is
                                                        five empty squares on
                                                        a board that sets
                                                        none, so it shows only
                                                        once there is an icon
                                                        to show. */}
                                                    {(!isLevels ||
                                                        c.imageUrl) && (
                                                        <IconCell
                                                            gameSlug={game.name}
                                                            gameId={game.id}
                                                            category={c}
                                                        />
                                                    )}
                                                    {rowName(c)}
                                                </span>
                                            </td>

                                            {structure && !isLevels && (
                                                <GroupCell
                                                    category={c}
                                                    busy={busy}
                                                    structure={structure}
                                                />
                                            )}

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

                                            {variables && (
                                                <td
                                                    className={
                                                        styles.subBoardsCell
                                                    }
                                                >
                                                    {/* The count is the way
                                                        in: a category that
                                                        splits has settings the
                                                        grid has no row for, so
                                                        the number opens them.
                                                        One board is one board
                                                        — nothing to pick, so
                                                        nothing to click. */}
                                                    {subcategoryVariablesFor(
                                                        c.id,
                                                        variables,
                                                    ).length > 0 ? (
                                                        <button
                                                            type="button"
                                                            className={
                                                                styles.subBoardsLink
                                                            }
                                                            aria-haspopup="dialog"
                                                            aria-label={`Subcategories of ${c.display}`}
                                                            onClick={() =>
                                                                setSubcatsFor(
                                                                    c.id,
                                                                )
                                                            }
                                                        >
                                                            {subBoardCount(
                                                                variables,
                                                                c.id,
                                                            )}
                                                        </button>
                                                    ) : (
                                                        subBoardCount(
                                                            variables,
                                                            c.id,
                                                        )
                                                    )}
                                                </td>
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
                                                        inherited={gameMinMs}
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

                                            {structure && (
                                                <td>
                                                    <div
                                                        className={
                                                            boardStyles.actions
                                                        }
                                                    >
                                                        {!isLevels && (
                                                            <button
                                                                type="button"
                                                                className={`${boardStyles.quietAction} ${boardStyles.removeAction}`}
                                                                disabled={busy}
                                                                onClick={() =>
                                                                    structure.onRemove(
                                                                        c.id,
                                                                    )
                                                                }
                                                                title="Takes this category off the public board. Runs are kept."
                                                            >
                                                                Remove
                                                            </button>
                                                        )}
                                                        {/* The detail route is
                                                            no longer where a
                                                            category is
                                                            configured — the
                                                            columns are — but it
                                                            still holds
                                                            copy-from, the level
                                                            template banner and
                                                            the run stats, so it
                                                            stays as a second
                                                            way in. */}
                                                        <button
                                                            type="button"
                                                            className={
                                                                boardStyles.editLink
                                                            }
                                                            onClick={() =>
                                                                structure.onEdit(
                                                                    c.id,
                                                                )
                                                            }
                                                        >
                                                            Edit
                                                            <ChevronRight
                                                                size={11}
                                                                aria-hidden="true"
                                                            />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
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
                    busy={isSaving}
                    placeholder="No rules set for this category."
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

            {subcatsCategory && variables && (
                <SubcategoryDialog
                    gameSlug={game.name}
                    category={subcatsCategory}
                    variables={variables}
                    policies={policies}
                    onEditRules={() => {
                        setSubcatsFor(null);
                        setRulesFor(subcatsCategory.id);
                    }}
                    onClose={() => setSubcatsFor(null)}
                />
            )}
        </div>
    );
}

/**
 * The two ways to change a row's position: drag the grip, or nudge with the
 * arrows.
 *
 * Both exist on purpose — drag is the fast gesture and the arrows are the one
 * that works from the keyboard and on touch. Neither shows a rank number: the
 * row's place in the table already says it, and a column repeating it cost a
 * column.
 *
 * The controls live inside the name cell, ahead of the icon, and stay quiet
 * until the row is hovered or focused (see .orderBtn), so at rest the column
 * reads as a list of names rather than as two buttons per row.
 *
 * The index is the row's position within its own SECTION, which is also the
 * scope a move renumbers: order is per group on the public board, so a move
 * that could cross a group boundary would be describing something the board
 * cannot render.
 */
function ReorderHandle({
    category,
    index,
    lastIndex,
    dragging,
    structure,
    onDragStart,
    onDragEnd,
}: {
    category: ResolvedCategory;
    index: number;
    lastIndex: number;
    dragging: boolean;
    structure: MatrixStructure;
    onDragStart: () => void;
    onDragEnd: () => void;
}) {
    return (
        <span className={boardStyles.orderCell}>
            <span
                aria-hidden="true"
                title="Drag to reorder"
                draggable={!structure.reorderPending}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                className={`${boardStyles.grip} ${
                    dragging ? boardStyles.gripDragging : ''
                }`}
            >
                <GripVertical size={14} />
            </span>
            <span className={boardStyles.orderArrows}>
                <button
                    type="button"
                    className={boardStyles.orderBtn}
                    onClick={() => structure.onMove(category.id, -1)}
                    disabled={structure.reorderPending || index === 0}
                    aria-label={`Move ${category.display} up`}
                >
                    <CaretUpFill size={9} />
                </button>
                <button
                    type="button"
                    className={boardStyles.orderBtn}
                    onClick={() => structure.onMove(category.id, 1)}
                    disabled={structure.reorderPending || index === lastIndex}
                    aria-label={`Move ${category.display} down`}
                >
                    <CaretDownFill size={9} />
                </button>
            </span>
        </span>
    );
}

/**
 * Which group the row belongs to. Ghost until reached for: the band row above
 * already names the group, so the select only has to exist for the moment
 * somebody wants to move a row out of it.
 */
function GroupCell({
    category,
    busy,
    structure,
}: {
    category: ResolvedCategory;
    busy: boolean;
    structure: MatrixStructure;
}) {
    return (
        <td>
            <select
                className={boardStyles.groupSelect}
                value={category.groupId == null ? '' : String(category.groupId)}
                disabled={busy}
                onChange={(e) =>
                    structure.onGroupChange(category.id, e.target.value)
                }
                aria-label={`Group: ${category.display}`}
            >
                <option value="">Ungrouped</option>
                {structure.groupOptions.map((g) => (
                    <option key={g.id} value={String(g.id)}>
                        {g.name}
                    </option>
                ))}
                <option value="__create__">+ Create group…</option>
            </select>
        </td>
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
