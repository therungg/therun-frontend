import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';
import { sortCategoriesForDisplay } from '../category-sort';
import type { LevelGroup } from '../levels/order';

export interface BoardScope {
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
}

/**
 * A game's boards split into its own and its Category Extensions.
 *
 * A game that merged its extensions in holds two sets of boards under one
 * URL, and they share names on purpose — Super Mario 64 has a 16 Star and so
 * do its extensions. Drawn in one band the only thing telling them apart is a
 * group heading, so each set gets its own tab instead and every public view
 * asks this which set it is drawing.
 */
export function splitExtensions(
    categories: ResolvedCategory[],
    groups: ResolvedGroup[],
): { own: BoardScope; extensions: BoardScope } {
    const mirrored = new Set(groups.filter((g) => g.mirrored).map((g) => g.id));
    const isExt = (c: ResolvedCategory) =>
        c.groupId != null && mirrored.has(c.groupId);
    return {
        own: {
            categories: categories.filter((c) => !isExt(c)),
            groups: groups.filter((g) => !g.mirrored),
        },
        extensions: {
            categories: categories.filter(isExt),
            groups: groups.filter((g) => g.mirrored),
        },
    };
}

/** The Category Extensions tab's sections: boards first, then its levels. */
export function extensionSections(
    categories: ResolvedCategory[],
    groups: ResolvedGroup[],
): LevelGroup[] {
    const { extensions } = splitExtensions(categories, groups);
    const featured = extensions.categories.filter(
        (c) => !c.archived && c.isMain,
    );
    return extensions.groups
        .slice()
        .sort(
            (a, b) =>
                Number(a.kind === 'level') - Number(b.kind === 'level') ||
                a.sortOrder - b.sortOrder,
        )
        .map((g) => ({
            id: g.id,
            name: g.kind === 'level' ? 'Levels' : 'Categories',
            rules: g.rules ?? null,
            boards: sortCategoriesForDisplay(
                featured.filter((c) => c.groupId === g.id),
            ),
        }))
        .filter((g) => g.boards.length > 0);
}

export function hasExtensions(
    categories: ResolvedCategory[],
    groups: ResolvedGroup[],
): boolean {
    return extensionSections(categories, groups).length > 0;
}
