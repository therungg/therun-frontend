import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';

const FALLBACK_VISIBLE_COUNT = 5;

export interface CategorySection {
    id: number | null;
    name: string | null;
    pills: ResolvedCategory[];
}

export interface CategoryVisibility {
    sections: CategorySection[];
    /** Active, non-visible categories — reachable only via "More…". */
    overflow: ResolvedCategory[];
}

function byPlaytimeDesc(a: ResolvedCategory, b: ResolvedCategory): number {
    return (b.totalRunTime ?? 0) - (a.totalRunTime ?? 0);
}

/**
 * Splits categories into the pill band's visible sections plus an overflow
 * list. The band shows featured (`isMain`) categories, falling back to the
 * top N by playtime when nothing is marked featured; the currently-selected
 * category is always appended if it isn't already in that set. Everything
 * else active but not visible is "overflow" — unreachable by browsing the
 * band directly, surfaced instead through the "More…" pill.
 */
export function computeCategoryVisibility(
    categories: ResolvedCategory[],
    groups: ResolvedGroup[],
    selectedCategoryName: string,
): CategoryVisibility {
    const mains = categories.filter((c) => c.isMain);
    const usingFallback = mains.length === 0;
    const base = usingFallback
        ? [...categories].sort(byPlaytimeDesc).slice(0, FALLBACK_VISIBLE_COUNT)
        : [...mains].sort(byPlaytimeDesc);

    // Append selected-but-not-in-base, so the active pill is always visible.
    const baseIds = new Set(base.map((c) => c.id));
    const selected = categories.find((c) => c.name === selectedCategoryName);
    const visible =
        selected && !baseIds.has(selected.id) ? [...base, selected] : base;
    const visibleIds = new Set(visible.map((c) => c.id));

    const overflow = categories.filter(
        (c) => !visibleIds.has(c.id) && (c.active ?? true),
    );

    // Trivial case: no group structure to show.
    const usedGroupIds = new Set(
        visible.map((c) => c.groupId ?? null).filter((id) => id != null),
    );
    const trivial =
        usingFallback ||
        groups.length === 0 ||
        (groups.length <= 1 && usedGroupIds.size <= 1);

    if (trivial) {
        return {
            sections: [{ id: null, name: null, pills: visible }],
            overflow,
        };
    }

    // Build labeled sections for each group in sortOrder, then trailing ungrouped.
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
        pills: (byGroup.get(g.id) ?? []).sort(byPlaytimeDesc),
    }));
    if (ungrouped.length > 0) {
        sections.push({
            id: null,
            name: null,
            pills: ungrouped.sort(byPlaytimeDesc),
        });
    }
    return { sections, overflow };
}
