import type { RunnerStatsGame } from '../../../../types/runner-profile.types';

/**
 * Games in the Leaderboards tab's order, so both tabs group a runner the same
 * way. Games with no leaderboard runs follow, most played first.
 */
export function inLeaderboardsOrder(
    games: RunnerStatsGame[],
    order: number[],
): RunnerStatsGame[] {
    const pos = new Map(order.map((id, i) => [id, i]));
    const at = (g: RunnerStatsGame) => pos.get(g.gameId) ?? order.length;
    return [...games].sort(
        (a, b) => at(a) - at(b) || b.playtimeMs - a.playtimeMs,
    );
}
