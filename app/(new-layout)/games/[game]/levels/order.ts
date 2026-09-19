import { splitLevelBoards } from '~src/lib/levels/display';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';
import { sortCategoriesForDisplay } from '../category-sort';

/**
 * How many level boards get a record request. A levelled game is either a
 * handful of named places (Super Mario 64: 15, every one of them run) or a
 * numbered tail (Tomb of the Mask: 650, almost none of them run), so the cap
 * only ever bites on games whose levels nobody has played. Empty boards are
 * excluded before the cap applies, so a long tail of them costs nothing and
 * never pushes a played level out of the budget.
 */
export const MAX_RECORD_PROBES = 40;

export interface LevelGroup {
    id: number;
    name: string;
    rules: string | null;
    boards: ResolvedCategory[];
}

/**
 * A game's featured level boards, grouped by their level group, in the
 * moderator's display order.
 *
 * Level boards are Featured (an instance copies its level category's isMain)
 * but deliberately off the category wall — see root-view.ts. The Levels tab is
 * the one place that lists them, so it is the one place that reads them
 * straight rather than through `splitLevelBoards(...).fullGame`.
 */
export function levelSections(
    categories: ResolvedCategory[],
    groups: ResolvedGroup[],
): LevelGroup[] {
    const featured = categories.filter((c) => !c.archived && c.isMain);
    const { levelBoards } = splitLevelBoards(featured, groups);
    return groups
        .filter((g) => g.kind === 'level')
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((g) => ({
            id: g.id,
            name: g.name,
            rules: g.rules ?? null,
            boards: sortCategoriesForDisplay(
                levelBoards.filter((c) => c.groupId === g.id),
            ),
        }))
        .filter((g) => g.boards.length > 0);
}

/**
 * Whether the game has a Levels view: at least one featured level board. The
 * one threshold the levels route and every Levels tab use.
 */
export function hasLevels(
    categories: ResolvedCategory[],
    groups: ResolvedGroup[],
): boolean {
    return levelSections(categories, groups).length > 0;
}

/**
 * Which level boards are worth a record request.
 *
 * pageData counts the rows per category, so an empty board answers "no record"
 * for free — that is most of a long-tailed game. Only when the backend sends no
 * counts at all (older deploy) does this fall back to probing blind, and then
 * only up to the cap.
 */
export function planRecordProbes<T extends { id: number }>(
    rows: T[],
    entryCounts: Record<number, number>,
    cap: number = MAX_RECORD_PROBES,
): T[] {
    const counted = Object.keys(entryCounts).length > 0;
    const candidates = counted
        ? rows.filter((r) => (entryCounts[r.id] ?? 0) > 0)
        : rows;
    return candidates.slice(0, cap);
}
