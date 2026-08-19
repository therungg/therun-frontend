/**
 * A level board's display is always "<Level> — <Template>" (see
 * docs/frontend-guide-levels.md). Inside a level context we want to show
 * just the template's own label ("Any%"), not the full board display
 * ("E1M1 — Any%"). Prefer the live template's display (renames land here
 * immediately); fall back to stripping the "<groupName> — " prefix off the
 * board's own display when the template is unknown (e.g. detached/excluded
 * boards, or level-only rows with no template at all).
 */
export function levelBoardLabel(
    c: {
        display: string;
        levelTemplateId?: number | null;
        groupName?: string | null;
    },
    templates: ReadonlyArray<{ id: number; display: string }>,
): string {
    if (c.levelTemplateId != null) {
        const t = templates.find((x) => x.id === c.levelTemplateId);
        if (t) return t.display;
    }
    const sep = ' — ';
    const i = c.display.indexOf(sep);
    if (i > 0 && (!c.groupName || c.display.slice(0, i) === c.groupName)) {
        return c.display.slice(i + sep.length);
    }
    return c.display;
}

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
