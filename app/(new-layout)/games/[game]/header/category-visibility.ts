import { splitLevelBoards } from '~src/lib/levels/display';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';
import { sortCategoriesForDisplay } from '../category-sort';

export interface CategorySection {
    id: number | null;
    name: string | null;
    pills: ResolvedCategory[];
    /**
     * The group is marked hidden-by-default: render the label with its
     * categories behind a disclosure. Never set on the trivial flattened
     * section — with one section there is nothing left to collapse against.
     */
    collapsedByDefault: boolean;
    /**
     * How this section draws its categories, already resolved: 'auto' is
     * settled here against the section's own count so no renderer has to
     * re-derive it, and so the wizard preview cannot disagree with the board.
     */
    displayMode: ResolvedDisplayMode;
}

export type ResolvedDisplayMode = 'pills' | 'dropdown';

/**
 * Where 'auto' stops laying pills out and reaches for a dropdown.
 *
 * Nine is roughly two rows of pills at a typical name length. Past that the
 * band starts pushing the board below the fold, which costs more than the
 * click a dropdown costs — and a reader who has to scan three rows is not
 * getting the at-a-glance benefit pills exist for in the first place.
 */
export const AUTO_PILL_LIMIT = 9;

/** One level (category group with kind: 'level'), its rules, and its boards
 *  (category instances of level templates, already display-sorted). */
export interface LevelGroupVisibility {
    id: number;
    name: string;
    rules: string | null;
    boards: ResolvedCategory[];
}

export interface CategoryVisibility {
    sections: CategorySection[];
    levels: {
        groups: LevelGroupVisibility[];
        /** The active category's level group id, or null when the active
         *  category isn't a level board (or no level is selected yet). */
        activeLevelId: number | null;
    };
}

/**
 * Settles a group's stated mode against the game default and, for 'auto',
 * against how many categories the section actually holds.
 *
 * Two NULL levels both mean "inherit": a group with no mode of its own takes
 * the game's, and a game with none defaults to pills — the board-wide default
 * is no longer settable, so an unset group just draws pills.
 */
function resolveDisplayMode(
    groupMode: string | null | undefined,
    gameMode: string | null | undefined,
    categoryCount: number,
): ResolvedDisplayMode {
    const stated = groupMode ?? gameMode ?? 'pills';
    if (stated === 'pills' || stated === 'dropdown') return stated;
    return categoryCount > AUTO_PILL_LIMIT ? 'dropdown' : 'pills';
}

/**
 * Splits the pill band into labeled group sections. Callers pass
 * Featured-only categories — the band never lists anything else (site
 * policy: non-Featured categories are not publicly viewable, so there is
 * no fallback set and no overflow/"More…" affordance anymore). Pills within
 * a section order by explicit sortOrder first (unset last), playtime
 * tiebreak.
 */
export function computeCategoryVisibility(
    categories: ResolvedCategory[],
    groups: ResolvedGroup[],
    /** games_pg.category_display_mode — the default every group inherits. */
    gameDisplayMode?: string | null,
    /** The board's active category name — resolves `levels.activeLevelId`. */
    activeCategoryName?: string | null,
): CategoryVisibility {
    const visible = sortCategoriesForDisplay(categories);

    const levelGroups = groups.filter((g) => g.kind === 'level');
    const nonLevelGroups = groups.filter((g) => g.kind !== 'level');
    const { fullGame, levelBoards } = splitLevelBoards(visible, groups);

    const levels = {
        groups: levelGroups
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((g) => ({
                id: g.id,
                name: g.name,
                rules: g.rules,
                boards: sortCategoriesForDisplay(
                    levelBoards.filter((c) => c.groupId === g.id),
                ),
            }))
            .filter((g) => g.boards.length > 0),
        activeLevelId:
            levelBoards.find((c) => c.name === activeCategoryName)?.groupId ??
            null,
    };

    const usedGroupIds = new Set(
        visible.map((c) => c.groupId ?? null).filter((id) => id != null),
    );
    const trivial =
        groups.length === 0 || (groups.length <= 1 && usedGroupIds.size <= 1);
    // A levels-only game (every visible category is a level board) has
    // nothing for the flattened/ungrouped section to hold — an empty
    // section here would render an empty well ("No categories enabled for
    // this group.") above the level picker, which owns these boards.
    const levelsOnly = fullGame.length === 0 && levels.groups.length > 0;
    if (trivial) {
        // One group collapses to a flat, unlabeled list — but its Pills /
        // Dropdown choice still applies to that list. Carry the sole group's
        // mode into the flattened section so setting one group to Dropdown
        // actually renders a dropdown.
        const soleGroup =
            usedGroupIds.size === 1
                ? (nonLevelGroups.find((g) => usedGroupIds.has(g.id)) ?? null)
                : null;
        return {
            sections: levelsOnly
                ? []
                : [
                      {
                          id: null,
                          name: null,
                          pills: fullGame,
                          collapsedByDefault: false,
                          displayMode: resolveDisplayMode(
                              soleGroup?.displayMode,
                              gameDisplayMode,
                              fullGame.length,
                          ),
                      },
                  ],
            levels,
        };
    }

    const byGroup = new Map<number, ResolvedCategory[]>();
    const ungrouped: ResolvedCategory[] = [];
    for (const c of fullGame) {
        if (c.groupId == null) ungrouped.push(c);
        else {
            const arr = byGroup.get(c.groupId) ?? [];
            arr.push(c);
            byGroup.set(c.groupId, arr);
        }
    }
    // Sort by sortOrder like the level groups above — pageData arrival order
    // is not a guarantee, and the header must not shuffle between loads.
    const sections: CategorySection[] = nonLevelGroups
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((g) => {
            const pills = sortCategoriesForDisplay(byGroup.get(g.id) ?? []);
            return {
                id: g.id,
                name: g.name,
                pills,
                collapsedByDefault: g.hiddenByDefault ?? false,
                displayMode: resolveDisplayMode(
                    g.displayMode,
                    gameDisplayMode,
                    pills.length,
                ),
            };
        });
    if (ungrouped.length > 0) {
        const pills = sortCategoriesForDisplay(ungrouped);
        sections.push({
            id: null,
            name: null,
            pills,
            displayMode: resolveDisplayMode(
                null,
                gameDisplayMode,
                pills.length,
            ),
            // Ungrouped categories have no group to carry the flag, and
            // hiding the unlabeled section would hide them with no way back.
            collapsedByDefault: false,
        });
    }
    return { sections, levels };
}
