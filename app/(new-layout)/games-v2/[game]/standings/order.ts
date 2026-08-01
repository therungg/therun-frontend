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
