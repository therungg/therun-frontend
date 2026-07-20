import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';

export interface CategorySection {
    id: number | null;
    name: string | null;
    pills: ResolvedCategory[];
}

export interface CategoryVisibility {
    sections: CategorySection[];
}

function byPlaytimeDesc(a: ResolvedCategory, b: ResolvedCategory): number {
    return (b.totalRunTime ?? 0) - (a.totalRunTime ?? 0);
}

/**
 * Splits the pill band into labeled group sections. Callers pass
 * Featured-only categories — the band never lists anything else (site
 * policy: non-Featured categories are not publicly viewable, so there is
 * no fallback set and no overflow/"More…" affordance anymore).
 */
export function computeCategoryVisibility(
    categories: ResolvedCategory[],
    groups: ResolvedGroup[],
): CategoryVisibility {
    const visible = [...categories].sort(byPlaytimeDesc);

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
        pills: (byGroup.get(g.id) ?? []).sort(byPlaytimeDesc),
    }));
    if (ungrouped.length > 0) {
        sections.push({
            id: null,
            name: null,
            pills: ungrouped.sort(byPlaytimeDesc),
        });
    }
    return { sections };
}
