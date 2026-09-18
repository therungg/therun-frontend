import { cacheLife, cacheTag } from 'next/cache';
import { getApiKey } from '~src/actions/api-key.action';
import { getGamesPage } from '~src/components/game/get-tabulated-game-stats';
import type {
    LeaderboardRow,
    TopBoardsResult,
} from '../../types/leaderboards-page.types';

/** Over-fetch so the series cap still lands ROW_COUNT rows when one series
 *  dominates the head of the list. Also the endpoint's own ceiling. */
const CANDIDATE_COUNT = 40;
const ROW_COUNT = 10;

async function getTopBoards(gameIds: number[]): Promise<TopBoardsResult> {
    'use cache';
    cacheLife('hours');
    cacheTag('leaderboards-top-boards');

    if (gameIds.length === 0) return {};

    try {
        const url = `${process.env.NEXT_PUBLIC_DATA_URL}/games?view=top-boards&gameIds=${gameIds.join(',')}`;
        const response = await fetch(url, {
            headers: { 'x-api-key': await getApiKey() },
        });
        if (!response.ok) return {};
        const json = await response.json();
        return (json.result ?? {}) as TopBoardsResult;
    } catch {
        // The page renders without board lines rather than not at all.
        return {};
    }
}

/**
 * The ten rows of /leaderboards: the most-run games, one per series.
 *
 * Runner counts come from the games endpoint (Algolia); boards, records and
 * the series come from top-boards (Postgres). Ranking by unique runners puts
 * seven Mario games in the top ten, which reads as a Mario site, so the first
 * game of each series is kept and the rest skipped. A null series is its own
 * series, so unaffiliated games are never collapsed together.
 */
export async function getLeaderboardRows(): Promise<LeaderboardRow[]> {
    'use cache';
    cacheLife('hours');
    cacheTag('leaderboards-rows');

    let page;
    try {
        page = await getGamesPage('', 1, CANDIDATE_COUNT, 'runners');
    } catch {
        // The masthead and sidebar still render without rows rather than
        // taking the whole page down.
        return [];
    }
    const candidates = page?.items ?? [];
    if (candidates.length === 0) return [];

    const boards = await getTopBoards(candidates.map((g) => g.gameId));

    // No board data at all (the endpoint failed): fall back to the raw order.
    // A presentation preference must never be able to empty the page.
    const capping = Object.keys(boards).length > 0;

    const rows: LeaderboardRow[] = [];
    const seenSeries = new Set<number>();

    for (const game of candidates) {
        if (rows.length >= ROW_COUNT) break;
        const entry = boards[String(game.gameId)];

        if (capping && entry?.seriesId != null) {
            if (seenSeries.has(entry.seriesId)) continue;
            seenSeries.add(entry.seriesId);
        }

        rows.push({
            gameId: game.gameId,
            game: game.game,
            display: game.display,
            image: game.image,
            uniqueRunners: game.uniqueRunners ?? 0,
            boards: entry?.boards ?? [],
        });
    }

    return rows;
}
