import { resolveGame } from '~src/lib/games-v1';
import { getRunById } from '~src/lib/leaderboards-v1';
import type { ManageRunData } from './types';

export async function loadManageRunData(
    gameSlug: string,
    runId: number,
): Promise<ManageRunData | null> {
    const game = await resolveGame(gameSlug);
    if (!game) return null;

    const run = await getRunById(runId);
    if (!run || run.gameId !== game.id) return null;

    return { game, run };
}
