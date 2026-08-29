// The board-default model behind the step-4 setup matrix.
//
// Board defaults are edited in step 1 and live on the game row. They are
// *stamp sources*, not an inheritance tier: a category always carries its own
// concrete value, and nothing resolves through the game at read time (the same
// rule `games.primaryTiming` has always followed). Changing a board default
// therefore never silently rewrites existing categories.
//
// That is what lets the matrix render deviations instead of values. A cell
// whose value equals the board default is drawn as "same as default" and the
// grid stays visually empty until something actually differs — which is what
// makes it readable at 30 categories. Clearing a cell re-stamps the default
// rather than nulling the column.

import type {
    GameTimeLabel,
    ResolvedCategory,
    VariableRow,
} from '../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../types/moderation.types';
import type { GameMetadata } from '../game-mgmt';
import {
    findCategoryMinPolicy,
    findGameMinPolicy,
    minMsFromPolicy,
} from './game-minimum';

/** The columns the matrix can compare against a board default. */
export type MatrixColumn =
    | 'timing'
    | 'otherTime'
    | 'minimum'
    | 'rules'
    | 'ranking'
    | 'milliseconds';

export const MATRIX_COLUMNS: MatrixColumn[] = [
    'timing',
    'otherTime',
    'minimum',
    'rules',
    'ranking',
    'milliseconds',
];

/**
 * Columns whose inherited cells render as a dot instead of their value.
 *
 * Not every column earns this. A dot trades "what is this set to" for "this is
 * not an exception", which is the right trade only where the value is one
 * nobody reads on purpose:
 *
 * - `ranking` is Lowest on essentially every board, and `milliseconds` is On.
 *   A column of the same word repeated is pure cost.
 * - `otherTime` is a visibility toggle — secondary by construction.
 *
 * `timing` is deliberately NOT here. It is not a preference, it is the UNIT the
 * leaderboard is denominated in: 1:34:00 under RTA and 1:34:00 under IGT are
 * not the same quantity. "What is this ranked by?" gets asked constantly rather
 * than only while auditing exceptions, and hiding it behind a hover makes the
 * most-asked question the most expensive one. It also buys least — "RTA" is
 * three characters, and the one `IGT` in a column of them already pops without
 * any help.
 *
 * `minimum` is not here either: it is a number, and a number you audit is a
 * number you show. The board's value renders muted in the cells inheriting it.
 */
export const DOTTED_COLUMNS: MatrixColumn[] = [
    'otherTime',
    'ranking',
    'milliseconds',
];

export function rendersAsDot(column: MatrixColumn): boolean {
    return DOTTED_COLUMNS.includes(column);
}

export const MATRIX_COLUMN_LABEL: Record<MatrixColumn, string> = {
    timing: 'Timing',
    otherTime: 'Other timing',
    minimum: 'Min. Time',
    rules: 'Rules',
    ranking: 'Ranking',
    milliseconds: 'Show Milliseconds',
};

/**
 * The clock that is not the ranking one.
 *
 * A board ranked by RTA may still want IGT visible beside it, and vice versa.
 * The ranking clock can never be hidden — a leaderboard sorted by a column
 * nobody can see is not a leaderboard — so there is only ever one decision
 * here, and it is about the *other* one. That is why this is a single column
 * rather than the pair of hide flags it is stored as.
 */
export function otherTiming(primary: 'rt' | 'gt'): 'rt' | 'gt' {
    return primary === 'gt' ? 'rt' : 'gt';
}

/**
 * Short clock name for chips, selects and matrix cells. The game-time clock
 * is called IGT or LRT per category (gameTimeLabel) — same behaviour, LRT is
 * purely what the community calls a load-removed clock.
 */
export function timingLabel(
    key: 'rt' | 'gt',
    gameTimeLabel: GameTimeLabel = 'igt',
): string {
    if (key === 'rt') return 'RTA';
    return gameTimeLabel === 'lrt' ? 'LRT' : 'IGT';
}

/**
 * The three-way timing choice the UI offers: RTA, IGT, LRT. The last two are
 * the same clock (primaryTiming 'gt') under different names — the choice is
 * what collapses (primaryTiming, gameTimeLabel) into one control.
 */
export type TimingChoice = 'rt' | 'gt' | 'lrt';

export function timingChoiceOf(
    primary: 'rt' | 'gt',
    gameTimeLabel: GameTimeLabel = 'igt',
): TimingChoice {
    return primary === 'gt' && gameTimeLabel === 'lrt' ? 'lrt' : primary;
}

/** The (primaryTiming, label) pair a timing choice writes, in the
 *  'realtime'/'gametime' vocabulary category writes use. Choosing RTA leaves
 *  the label untouched: a board flipped to RTA keeps calling its (now
 *  secondary) game-time clock LRT rather than silently reverting to IGT. */
export function timingChoiceFields(choice: TimingChoice): {
    primaryTiming: 'realtime' | 'gametime';
    gameTimeLabel?: GameTimeLabel;
} {
    return choice === 'rt'
        ? { primaryTiming: 'realtime' }
        : {
              primaryTiming: 'gametime',
              gameTimeLabel: choice === 'lrt' ? 'lrt' : 'igt',
          };
}

/** Whether a category shows the clock it does not rank by. */
export function showsOtherTime(category: ResolvedCategory): boolean {
    return category.primaryTiming === 'gt'
        ? !(category.hideRealTime ?? false)
        : !(category.hideGameTime ?? false);
}

/**
 * The hide-flag write that shows or hides a category's other clock. Which flag
 * it is depends on the category's own ranking clock, which is why a bulk apply
 * across mixed categories has to group by timing rather than send one field.
 */
export function otherTimeField(
    primary: 'rt' | 'gt',
    show: boolean,
): { hideRealTime: boolean } | { hideGameTime: boolean } {
    return primary === 'gt' ? { hideRealTime: !show } : { hideGameTime: !show };
}

export interface BoardDefaults {
    /** null = the board states no default; every category's own value stands. */
    primaryTiming: 'rt' | 'gt' | null;
    /** What the board default calls the game-time clock; null = unset (IGT). */
    gameTimeLabel: GameTimeLabel | null;
    /** Whether the board shows the clock it does not rank by. */
    showOtherTime: boolean;
    sortAscending: boolean | null;
    showMilliseconds: boolean | null;
    /** Starter rules text for categories with none of their own. */
    rulesTemplate: string | null;
    /** Board-wide minimum in ms, from the categoryId-null min_time policy. */
    minMs: number | null;
}

export function boardDefaults(
    metadata: GameMetadata,
    policies: BoardPolicyRow[],
): BoardDefaults {
    const gamePolicy = findGameMinPolicy(policies);
    const primary = metadata.primaryTiming ?? 'rt';
    return {
        primaryTiming: metadata.primaryTiming,
        gameTimeLabel: metadata.gameTimeLabel,
        showOtherTime:
            primary === 'gt' ? !metadata.hideRealTime : !metadata.hideGameTime,
        sortAscending: metadata.sortAscending,
        showMilliseconds: metadata.showMilliseconds,
        rulesTemplate: metadata.rulesTemplate,
        // The board minimum is timing-bound. Read it against the board's own
        // default clock; with no stated default, real time is the fallback
        // reading, matching the categories' own NOT NULL default.
        minMs: minMsFromPolicy(gamePolicy, metadata.primaryTiming ?? 'rt'),
    };
}

/** Whether the board states a default for a column at all. */
export function hasDefault(
    defaults: BoardDefaults,
    column: MatrixColumn,
): boolean {
    switch (column) {
        case 'timing':
            return defaults.primaryTiming !== null;
        // Stored as two non-null booleans, so the board always states one.
        case 'otherTime':
            return true;
        case 'minimum':
            return defaults.minMs !== null;
        case 'rules':
            return (defaults.rulesTemplate ?? '').trim().length > 0;
        case 'ranking':
            return defaults.sortAscending !== null;
        case 'milliseconds':
            return defaults.showMilliseconds !== null;
    }
}

export type RulesState = 'default' | 'custom' | 'none';

/**
 * How a category's rules relate to the board template. `default` means the
 * text is byte-identical to the template after trimming — the common case
 * right after "apply template", and the one the matrix renders as a blank.
 */
export function rulesState(category: ResolvedCategory): RulesState {
    // Rules are authored per category — there is no board-level template to
    // match against, so a category either has its own rules or none.
    return (category.rules ?? '').trim() ? 'custom' : 'none';
}

/** The category's own minimum in ms, or null when it has none of its own. */
export function categoryMinMs(
    category: ResolvedCategory,
    policies: BoardPolicyRow[],
): number | null {
    return minMsFromPolicy(
        findCategoryMinPolicy(policies, category.id),
        category.primaryTiming,
    );
}

/**
 * Whether a category deviates from the board default in one column.
 *
 * A column with no stated board default never counts as a deviation: there is
 * nothing to deviate from, so highlighting every row would be noise.
 */
export function deviates(
    category: ResolvedCategory,
    column: MatrixColumn,
    defaults: BoardDefaults,
    policies: BoardPolicyRow[],
): boolean {
    if (!hasDefault(defaults, column)) return false;
    switch (column) {
        case 'timing':
            // The choice, not just the clock: an LRT category on an IGT-default
            // board is a deviation even though both rank by game time.
            return (
                timingChoiceOf(
                    category.primaryTiming,
                    category.gameTimeLabel,
                ) !==
                timingChoiceOf(
                    defaults.primaryTiming ?? 'rt',
                    defaults.gameTimeLabel ?? 'igt',
                )
            );
        case 'otherTime':
            return showsOtherTime(category) !== defaults.showOtherTime;
        case 'minimum': {
            // A category with no minimum of its own does not deviate: the
            // board minimum is what applies to it.
            const own = categoryMinMs(category, policies);
            return own !== null && own !== defaults.minMs;
        }
        case 'rules':
            // No board rules template to deviate from any more.
            return false;
        case 'ranking':
            return (category.sortAscending ?? true) !== defaults.sortAscending;
        case 'milliseconds':
            return (
                (category.showMilliseconds ?? true) !==
                defaults.showMilliseconds
            );
    }
}

export function deviatingColumns(
    category: ResolvedCategory,
    defaults: BoardDefaults,
    policies: BoardPolicyRow[],
): MatrixColumn[] {
    return MATRIX_COLUMNS.filter((c) =>
        deviates(category, c, defaults, policies),
    );
}

/** Count of a category's own variable rows — variables are category-scoped. */
export function variableCount(
    categoryId: number,
    variables: VariableRow[],
): number {
    return variables.filter((v) => v.categoryId === categoryId).length;
}

/**
 * Categories not on a value — the ones a board default change could still
 * bring along.
 *
 * Defaults are a stamp source, not an inheritance tier, so changing one leaves
 * every existing category exactly where it was. That is the right storage
 * behaviour and a surprising editing one: a moderator who sets the board to
 * IGT usually means the board, not "the board and also nothing". So the write
 * is followed by one question, asked only when there is something to ask
 * about.
 */
export function categoriesNotOn<T>(
    categories: ResolvedCategory[],
    value: T,
    readValue: (c: ResolvedCategory) => T,
): ResolvedCategory[] {
    return categories.filter((c) => readValue(c) !== value);
}
