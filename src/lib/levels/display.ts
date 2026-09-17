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
