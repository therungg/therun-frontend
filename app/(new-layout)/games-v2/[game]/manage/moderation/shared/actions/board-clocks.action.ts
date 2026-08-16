'use server';

import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import type { ModTiming } from '../../../../../../../../types/moderation.types';

export interface BoardClocks {
    /** The clock this board ranks by. */
    primaryTiming: ModTiming;
    /** The category shows both clocks, so a submission can carry both. */
    showSecondary: boolean;
    /** What this board calls its game-time clock: 'igt' or 'lrt'. */
    gameTimeLabel: string;
}

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

    return {
        primaryTiming:
            category.primaryTiming === 'gt' ? 'gametime' : 'realtime',
        showSecondary: !category.hideRealTime && !category.hideGameTime,
        gameTimeLabel: category.gameTimeLabel ?? 'igt',
    };
}
