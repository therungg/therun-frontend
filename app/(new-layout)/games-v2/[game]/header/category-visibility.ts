import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';
import { sortCategoriesForDisplay } from '../category-sort';

export interface CategorySection {
    id: number | null;
    name: string | null;
    pills: ResolvedCategory[];
}

export interface CategoryVisibility {
    sections: CategorySection[];
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
): CategoryVisibility {
    const visible = sortCategoriesForDisplay(categories);

    const usedGroupIds = new Set(
        visible.map((c) => c.groupId ?? null).filter((id) => id != null),
    );
    const trivial =
        groups.length === 0 || (groups.length <= 1 && usedGroupIds.size <= 1);
    if (trivial) {
        return { sections: [{ id: null, name: null, pills: visible }] };
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
    const sections: CategorySection[] = groups.map((g) => ({
        id: g.id,
        name: g.name,
        pills: sortCategoriesForDisplay(byGroup.get(g.id) ?? []),
    }));
    if (ungrouped.length > 0) {
        sections.push({
            id: null,
            name: null,
            pills: sortCategoriesForDisplay(ungrouped),
        });
    }
    return { sections };
}
