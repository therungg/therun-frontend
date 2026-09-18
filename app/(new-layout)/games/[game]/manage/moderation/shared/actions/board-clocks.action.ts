'use server';

import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { type BoardClocks, clocksOfCategory } from '../board-clocks';

export type { BoardClocks };

/**
 * A category's clocks, for the surfaces that take a manual time without
 * already holding the category (the roster, the runner dossier, the board
 * kebab). Without this they would offer a bare clock picker and let a
 * moderator enter one time on a board that needs both.
 */
export async function loadBoardClocksAction(
    gameSlug: string,
    categoryId: number,
): Promise<BoardClocks | null> {
    const game = await resolveGame(gameSlug);
    if (!game) return null;

    const { categories } = await resolveCategory(game.id);
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return null;

    return clocksOfCategory(category);
}
