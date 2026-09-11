'use server';

import { resolveCategory, resolveGame } from '~src/lib/games-v1';

/** One board the whole-game export will pull, in the order it should appear. */
export interface ExportableBoard {
    categorySlug: string;
    categoryDisplay: string;
    timing: 'rt' | 'gt';
    /** Group label, or null when the category sits outside any group. */
    group: string | null;
    /** True when the group is a level — the board is one level, not the full game. */
    isLevel: boolean;
}

/**
 * Every board the whole-game export covers: exactly the boards a visitor can
 * open — Featured, non-archived categories, level boards included (the same
 * filter the board page applies). Non-Featured categories are not publicly
 * viewable, so they stay out of the file too.
 *
 * Public read, like the boards themselves. Returns null on an unknown game so
 * the client can show a retryable error instead of downloading an empty file.
 */
export async function listExportableBoards(
    gameSlug: string,
): Promise<ExportableBoard[] | null> {
    try {
        const game = await resolveGame(gameSlug);
        if (!game) return null;
        const { categories, groups } = await resolveCategory(game.id);
        const levelGroupIds = new Set(
            groups.filter((g) => g.kind === 'level').map((g) => g.id),
        );
        return categories
            .filter((c) => !c.archived && c.isMain)
            .map((c) => ({
                categorySlug: c.name,
                categoryDisplay: c.display,
                timing: c.primaryTiming,
                group: c.groupName ?? null,
                isLevel: c.groupId != null && levelGroupIds.has(c.groupId),
            }));
    } catch {
        return null;
    }
}
