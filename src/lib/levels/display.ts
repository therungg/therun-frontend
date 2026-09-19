/**
 * Splits categories into full-game boards vs. level boards, by whether the
 * category's group is a 'level' group. Ungrouped categories and categories
 * in normal groups both land in `fullGame`.
 */
export function splitLevelBoards<T extends { groupId?: number | null }>(
    categories: T[],
    groups: ReadonlyArray<{ id: number; kind: string }>,
): { fullGame: T[]; levelBoards: T[] } {
    const levelIds = new Set(
        groups.filter((g) => g.kind === 'level').map((g) => g.id),
    );
    const fullGame: T[] = [];
    const levelBoards: T[] = [];
    for (const c of categories)
        (c.groupId != null && levelIds.has(c.groupId)
            ? levelBoards
            : fullGame
        ).push(c);
    return { fullGame, levelBoards };
}

/**
 * Display order for the boards of one level group.
 *
 * Levels are ordered data — level 1 comes before level 2 — but the site's
 * shared category order treats `sortOrder: 0` as the "unset" sentinel and
 * sorts it last. Importers number a game's levels from zero, so on Tomb of
 * the Mask that rule put Level 1 at the bottom of six hundred and fifty.
 *
 * A group whose boards all carry a distinct sortOrder has been ordered
 * deliberately, so the zero in it is a position and the raw order is the
 * order. A group with repeats has not (they are all zero, or all unset), and
 * falls back to the shared rule: sortOrder with unset last, playtime tiebreak.
 */
export function sortLevelBoards<
    T extends { sortOrder: number; totalRunTime?: number },
>(boards: T[], fallback: (boards: T[]) => T[]): T[] {
    const orders = new Set(boards.map((b) => b.sortOrder));
    if (orders.size !== boards.length) return fallback(boards);
    return [...boards].sort((a, b) => a.sortOrder - b.sortOrder);
}
