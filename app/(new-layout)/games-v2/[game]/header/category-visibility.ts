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

export interface CategoryVisibility {
    sections: CategorySection[];
}

/**
 * Settles a group's stated mode against the game default and, for 'auto',
 * against how many categories the section actually holds.
 *
 * Two NULL levels both mean "inherit": a group with no mode of its own takes
 * the game's, and a game with none takes 'auto'.
 */
function resolveDisplayMode(
    groupMode: string | null | undefined,
    gameMode: string | null | undefined,
    categoryCount: number,
): ResolvedDisplayMode {
    const stated = groupMode ?? gameMode ?? 'auto';
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
): CategoryVisibility {
    const visible = sortCategoriesForDisplay(categories);

    const usedGroupIds = new Set(
        visible.map((c) => c.groupId ?? null).filter((id) => id != null),
    );
    const trivial =
        groups.length === 0 || (groups.length <= 1 && usedGroupIds.size <= 1);
    if (trivial) {
        return {
            sections: [
                {
                    id: null,
                    name: null,
                    pills: visible,
                    collapsedByDefault: false,
                    // The flat case has no group row to carry an override,
                    // which is exactly why the game-level default exists.
                    displayMode: resolveDisplayMode(
                        null,
                        gameDisplayMode,
                        visible.length,
                    ),
                },
            ],
        };
    }

    const byGroup = new Map<number, ResolvedCategory[]>();
    const ungrouped: ResolvedCategory[] = [];
    for (const c of visible) {
        if (c.groupId == null) ungrouped.push(c);
        else {
            const arr = byGroup.get(c.groupId) ?? [];
            arr.push(c);
            byGroup.set(c.groupId, arr);
        }
    }
    const sections: CategorySection[] = groups.map((g) => {
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
    return { sections };
}
