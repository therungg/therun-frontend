import { splitLevelBoards } from '~src/lib/levels/display';
import type {
    GameStandings,
    ResolvedCategory,
    ResolvedGroup,
    StandingsCell,
} from '../../../../../types/leaderboards.types';
import { sortCategoriesForDisplay } from '../category-sort';

/**
 * The one display order for a game's categories — groups in group sortOrder,
 * categories within each group by the shared display sort, ungrouped last —
 * exactly what the category wall and the board plate render. Returns category
 * names in that order.
 */
export function boardDisplayOrder(
    categories: ResolvedCategory[],
    groups: ResolvedGroup[],
): string[] {
    const byGroup = new Map<number, ResolvedCategory[]>();
    const ungrouped: ResolvedCategory[] = [];
    for (const c of categories) {
        if (c.groupId == null) ungrouped.push(c);
        else {
            const arr = byGroup.get(c.groupId) ?? [];
            arr.push(c);
            byGroup.set(c.groupId, arr);
        }
    }

    const ordered: ResolvedCategory[] = [];
    for (const g of [...groups].sort((a, b) => a.sortOrder - b.sortOrder)) {
        ordered.push(...sortCategoriesForDisplay(byGroup.get(g.id) ?? []));
    }
    ordered.push(...sortCategoriesForDisplay(ungrouped));
    return ordered.map((c) => c.name);
}

/**
 * One toggle-band row: a group of categories (or the ungrouped tail,
 * label null). `defaultCounted` mirrors the wall: a hidden-by-default
 * group (category extensions and the like) starts out of the competition
 * — the headline standings shouldn't move because a meme category exists.
 */
export interface StandingsSection {
    label: string | null;
    names: string[];
    defaultCounted: boolean;
}

export function standingsSections(
    categories: ResolvedCategory[],
    groups: ResolvedGroup[],
): StandingsSection[] {
    const byGroup = new Map<number, ResolvedCategory[]>();
    const ungrouped: ResolvedCategory[] = [];
    for (const c of categories) {
        if (c.groupId == null) ungrouped.push(c);
        else {
            const arr = byGroup.get(c.groupId) ?? [];
            arr.push(c);
            byGroup.set(c.groupId, arr);
        }
    }

    const sections: StandingsSection[] = [];
    for (const g of [...groups].sort((a, b) => a.sortOrder - b.sortOrder)) {
        const members = byGroup.get(g.id);
        if (!members?.length) continue;
        sections.push({
            label: g.name,
            names: sortCategoriesForDisplay(members).map((c) => c.name),
            defaultCounted: !g.hiddenByDefault,
        });
    }
    if (ungrouped.length > 0) {
        sections.push({
            label: null,
            names: sortCategoriesForDisplay(ungrouped).map((c) => c.name),
            defaultCounted: true,
        });
    }
    return sections;
}

/**
 * Reorder a standings payload's category columns to the board display order.
 * The wire order is whatever the backend emitted — without this, the matrix
 * opened with extension categories first while every other view leads with
 * the main group. Cells carry category *indices*, so they're remapped through
 * the same permutation. Categories the resolver doesn't know keep their
 * relative order after the known ones.
 */
export function orderStandingsForDisplay(
    standings: GameStandings,
    categories: ResolvedCategory[],
    groups: ResolvedGroup[],
): GameStandings {
    const pos = new Map(
        boardDisplayOrder(categories, groups).map((n, i) => [n, i]),
    );
    const oldIndices = standings.categories.map((_, i) => i);
    const key = (i: number) =>
        pos.get(standings.categories[i].name) ?? pos.size + i;
    const perm = [...oldIndices].sort((a, b) => key(a) - key(b));

    // perm[newIdx] = oldIdx — cells need the inverse.
    const oldToNew = new Map(perm.map((oldIdx, newIdx) => [oldIdx, newIdx]));

    return {
        ...standings,
        categories: perm.map((i) => standings.categories[i]),
        cells: standings.cells.map(
            ([c, r, rank, time]): StandingsCell => [
                oldToNew.get(c) ?? c,
                r,
                rank,
                time,
            ],
        ),
    };
}

/**
 * The standings scope: full-game boards only.
 *
 * A level board is Featured (it copies its level category's isMain) and sits
 * in a level group, so without this the matrix grows one column per level per
 * level category — 120 on a 30-level game — and one toggle section per level.
 * They also cannot be ordered: the backend's column `name` for an instance is
 * a real board slug (`e1m1-any%`) while every other view keys off
 * `normalizeSlug(display)`, so they sort into the unknown tail regardless.
 * Standings compare a game's boards against each other; the levels of one game
 * are not that comparison.
 */
export function standingsScope(
    categories: ResolvedCategory[],
    groups: ResolvedGroup[],
): {
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    /** Category ids to drop from the payload's columns. */
    excludedIds: Set<number>;
} {
    const { fullGame, levelBoards } = splitLevelBoards(categories, groups);
    return {
        categories: fullGame,
        groups: groups.filter((g) => g.kind !== 'level'),
        excludedIds: new Set(levelBoards.map((c) => c.id)),
    };
}

/**
 * Drops whole columns from a standings payload, remapping the surviving
 * columns' indices and dropping the cells that pointed at the removed ones.
 * Column identity is the category `id`, never the slug — an instance's
 * backend slug doesn't match the frontend's derived one, which is half the
 * reason these columns have to go.
 */
export function dropStandingsCategories(
    standings: GameStandings,
    excludedIds: Set<number>,
): GameStandings {
    if (excludedIds.size === 0) return standings;
    const keptOldIndices = standings.categories
        .map((c, i) => [c, i] as const)
        .filter(([c]) => !excludedIds.has(c.id))
        .map(([, i]) => i);
    if (keptOldIndices.length === standings.categories.length) return standings;

    const oldToNew = new Map(keptOldIndices.map((oldIdx, i) => [oldIdx, i]));
    return {
        ...standings,
        categories: keptOldIndices.map((i) => standings.categories[i]),
        cells: standings.cells.flatMap(
            ([c, r, rank, time]): StandingsCell[] => {
                const next = oldToNew.get(c);
                return next === undefined ? [] : [[next, r, rank, time]];
            },
        ),
    };
}
