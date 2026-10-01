import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';
import { effectiveSortKey, sortCategoriesForDisplay } from '../category-sort';

/** The game's whole category catalog, unscoped — see YourRunsPanel. */
export interface StandingCatalog {
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
}

/** Where one of the runner's boards sits: its filter group and board order. */
export interface StandingPlacement {
    groupKey: string;
    groupLabel: string;
    /** Position in the game's own board order — group first, then category. */
    order: number;
}

const UNGROUPED = 'ungrouped';
const LEVELS = 'levels';

/**
 * Places each category in a filter group. A level game can have dozens of
 * level groups, and one option per level would bury the dropdown, so they
 * fold into one "Levels" option. Category Extensions groups keep their own
 * names. Ungrouped boards are the game's main boards when the game has no
 * groups of its own, and "Other" when it does.
 *
 * Group order follows the page: ungrouped boards, the game's own groups by
 * sortOrder, levels, then extensions.
 */
export function placeCategories(
    catalog: StandingCatalog,
): Map<number, StandingPlacement> {
    const groupById = new Map(catalog.groups.map((g) => [g.id, g]));
    const tier = (g: ResolvedGroup | undefined): number =>
        g == null ? 0 : g.mirrored ? 3 : g.kind === 'level' ? 2 : 1;
    const groupRank = (g: ResolvedGroup | undefined): number =>
        g == null || g.kind === 'level' ? 0 : effectiveSortKey(g.sortOrder);

    const hasOwnGroups = catalog.groups.some(
        (g) => !g.mirrored && g.kind !== 'level',
    );
    const ordered = sortCategoriesForDisplay(catalog.categories).sort(
        (a, b) => {
            const ga = groupById.get(a.groupId ?? -1);
            const gb = groupById.get(b.groupId ?? -1);
            return tier(ga) - tier(gb) || groupRank(ga) - groupRank(gb);
        },
    );

    const placements = new Map<number, StandingPlacement>();
    ordered.forEach((c, order) => {
        const g = groupById.get(c.groupId ?? -1);
        placements.set(c.id, {
            ...groupOf(g, hasOwnGroups),
            order,
        });
    });
    return placements;
}

function groupOf(
    g: ResolvedGroup | undefined,
    hasOwnGroups: boolean,
): Pick<StandingPlacement, 'groupKey' | 'groupLabel'> {
    if (g == null) {
        return {
            groupKey: UNGROUPED,
            groupLabel: hasOwnGroups ? 'Other' : 'Main boards',
        };
    }
    if (g.kind === 'level' && !g.mirrored) {
        return { groupKey: LEVELS, groupLabel: 'Levels' };
    }
    return { groupKey: `group-${g.id}`, groupLabel: g.name };
}

/** A board missing from the catalog (deleted since the ranking was read). */
export const UNPLACED: StandingPlacement = {
    groupKey: UNGROUPED,
    groupLabel: 'Other',
    order: Number.MAX_SAFE_INTEGER,
};
