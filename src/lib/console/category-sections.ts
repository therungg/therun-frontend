import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../types/leaderboards.types';

export interface CategorySection {
    id: number | null;
    name: string | null;
    items: ResolvedCategory[];
}

/**
 * Groups featured categories into labeled sections, same shape as the
 * public masthead's rail — shared by BoardCuration and the setup wizard's
 * category hub. Callers pass categories already in admin display order
 * (`compareByBoardOrder`) rather than the public read's playtime tiebreak.
 *
 * Mirrors the public band's flatten-when-trivial rule: with no groups, or
 * one group and at most one in use, everything stays in a single unlabeled
 * section. Ungrouped categories trail the named sections.
 */
export function sectionsFor(
    featured: ResolvedCategory[],
    groups: ResolvedGroup[],
): CategorySection[] {
    const usedGroupIds = new Set(
        featured.map((c) => c.groupId ?? null).filter((id) => id != null),
    );
    const trivial =
        groups.length === 0 || (groups.length <= 1 && usedGroupIds.size <= 1);
    if (trivial) {
        return [{ id: null, name: null, items: featured }];
    }

    const byGroup = new Map<number, ResolvedCategory[]>();
    const ungrouped: ResolvedCategory[] = [];
    for (const c of featured) {
        if (c.groupId == null) {
            ungrouped.push(c);
        } else {
            const arr = byGroup.get(c.groupId) ?? [];
            arr.push(c);
            byGroup.set(c.groupId, arr);
        }
    }

    const sections: CategorySection[] = [...groups]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((g) => ({
            id: g.id,
            name: g.name,
            items: byGroup.get(g.id) ?? [],
        }));
    if (ungrouped.length > 0) {
        sections.push({ id: null, name: null, items: ungrouped });
    }
    return sections;
}
