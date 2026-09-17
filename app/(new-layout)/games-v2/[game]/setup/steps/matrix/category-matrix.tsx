'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { ChevronRight, Collection } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { assignCategoryGroupAction } from '~src/actions/category-group/assign-category-group.action';
import Link from '~src/components/link';
import { DurationField } from '~src/components/time-input/duration-field';
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
import { boardsOfKind, type WorkspaceKind } from '~src/lib/setup/workspace';
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

interface Props {
    kind: WorkspaceKind;
    game: ResolvedGame;
    /** Every category the game has; the matrix draws what is on the board
     *  for `kind`. */
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    policies: BoardPolicyRow[];
    /** Published variables, for the Subcategories column. */
    variables: VariableRow[];
    /** Category whose rules open on mount, from a `?cat=<id>` deep link. */
    initialOpenCategoryId?: number | null;
    /** Opens the List screen, where boards are added. */
    onGoToList?: () => void;
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
    kind,
    game,
    categories,
    groups,
    policies,
    initialOpenCategoryId,
    variables,
    onGoToList,
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

    const isLevels = kind === 'levels';
    const mains = boardsOfKind(categories, groups, kind);
    // Level groups are never a choice: a level's group is what makes it one.
    const assignableGroups = groups.filter((g) => g.kind !== 'level');
    const showGroupColumn = !isLevels && assignableGroups.length > 0;
    // `sectionsFor` emits a section per group, empty ones included — it is
    // written for the public rail. A settings grid only needs the ones in use.
    const sections = isLevels
        ? [{ id: null, name: null, items: mains }]
        : sectionsFor(mains, assignableGroups).filter(
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

    const assignGroup = (category: ResolvedCategory, raw: string) => {
        const groupId = raw === '' ? null : Number.parseInt(raw, 10);
        startSave(async () => {
            const res = await assignCategoryGroupAction({
                gameSlug: game.name,
                gameId: game.id,
                categoryId: category.id,
                groupId,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            router.refresh();
        });
    };

    // There is no board default to deviate from any more, so every cell
    // renders its own value at full strength. The quiet/deviates distinction
    // (and the dot that stood in for "inherited") went with the defaults row.
    const cellClass = (_c: ResolvedCategory, _column: MatrixColumn) =>
        `${styles.cellControl} ${styles.cellNoDefault}`;

    const dotted = (_c: ResolvedCategory, _column: MatrixColumn) => false;

    // name (icon included), [group,] timing, [other time, RTA fallback,]
    // subcategories, minimum, rules, ms, edit. Row zero and every group band
    // span this, so it has to count what is actually drawn.
    const columnCount =
        (showsRtaColumns ? 7 : 5) + (showGroupColumn ? 1 : 0) + 2;

    // Nothing on the board means nothing to set: say where boards come from
    // instead of drawing a header-only table.
    if (mains.length === 0) {
        return (
            <div className={styles.empty}>
                <Collection
                    size={24}
                    className={styles.emptyIcon}
                    aria-hidden
                />
                <p className={styles.emptyTitle}>
                    {isLevels
                        ? 'No levels yet'
                        : 'No categories on the board yet'}
                </p>
                <p className={styles.emptyNote}>
                    {isLevels
                        ? 'Add a level in List, then set its timing, minimum and rules here.'
                        : 'Add categories in List, then set their timing, minimum and rules here.'}
                </p>
                {onGoToList && (
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={onGoToList}
                    >
                        Go to List
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className={styles.panel}>
            <div className={styles.head}>
                <h3 className={styles.panelTitle}>
                    {isLevels ? 'Level settings' : 'Category settings'}
                </h3>
                <span className={styles.panelHint}>
                    {mains.length.toLocaleString()}{' '}
                    {isLevels
                        ? mains.length === 1
                            ? 'level'
                            : 'levels'
                        : mains.length === 1
                          ? 'category'
                          : 'categories'}{' '}
                    · changes save as you go
                </span>
            </div>
            <div className={styles.scroller}>
                <table className={styles.grid}>
                    <thead>
                        <tr>
                            <th>{isLevels ? 'Level' : 'Category'}</th>
                            {showGroupColumn && <th>Group</th>}
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
                            <th
                                className={styles.subBoardsCell}
                                title="Boards this category splits into, across its published subcategories"
                            >
                                Subcategories
                            </th>
                            <th>Min. time</th>
                            <th>Rules</th>
                            {/* Ranking direction has no column anywhere in the
                                frontend. `sortAscending` is still stored and
                                honoured — the board reads it, the API writes
                                it — it is simply not something a moderator is
                                asked here. */}
                            <th>Milliseconds</th>
                            <th
                                className={styles.colActions}
                                aria-label="Edit"
                            />
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
                                    const min = categoryMinMs(c, policies);
                                    const rules = rulesState(c);
                                    return (
                                        <tr key={c.id}>
                                            <td className={styles.nameCell}>
                                                <span
                                                    className={styles.nameInner}
                                                >
                                                    <IconCell
                                                        gameSlug={game.name}
                                                        gameId={game.id}
                                                        category={c}
                                                    />
                                                    {c.display}
                                                </span>
                                            </td>

                                            {showGroupColumn && (
                                                <GroupCell
                                                    category={c}
                                                    groups={assignableGroups}
                                                    disabled={isSaving}
                                                    onChange={assignGroup}
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

                                            <td
                                                className={styles.subBoardsCell}
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
                                                            setSubcatsFor(c.id)
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

                                            <td className={styles.colActions}>
                                                <div
                                                    className={
                                                        boardStyles.actions
                                                    }
                                                >
                                                    {/* Copy-from and the run
                                                        stats live on the
                                                        category page. */}
                                                    <Link
                                                        href={`/games-v2/${encodeURIComponent(game.name)}/manage/category/${c.id}`}
                                                        className={
                                                            styles.editLink
                                                        }
                                                    >
                                                        Edit
                                                        <ChevronRight
                                                            size={11}
                                                            aria-hidden="true"
                                                        />
                                                    </Link>
                                                </div>
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

            {subcatsCategory && (
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
 * Which group the row belongs to. Groups are created and arranged on the
 * Groups screen; this only moves a row between the ones that exist.
 */
function GroupCell({
    category,
    groups,
    disabled,
    onChange,
}: {
    category: ResolvedCategory;
    groups: ResolvedGroup[];
    disabled: boolean;
    onChange: (category: ResolvedCategory, raw: string) => void;
}) {
    return (
        <td>
            <select
                className={boardStyles.groupSelect}
                value={category.groupId == null ? '' : String(category.groupId)}
                disabled={disabled}
                onChange={(e) => onChange(category, e.target.value)}
                aria-label={`Group: ${category.display}`}
            >
                <option value="">Ungrouped</option>
                {groups.map((g) => (
                    <option key={g.id} value={String(g.id)}>
                        {g.name}
                    </option>
                ))}
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
                    <th colSpan={columnCount} scope="colgroup">
                        {name}
                    </th>
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
