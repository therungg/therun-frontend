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

/** A 200 with the wrong shape must not silently become an empty result:
 *  'use cache' would then pin that emptiness for hours. So this checks the
 *  payload is at least plausible before trusting it — result is a non-null
 *  object and, if it has any entries, the first one has a boards array. */
function isPlausibleTopBoardsResult(value: unknown): value is TopBoardsResult {
    if (typeof value !== 'object' || value === null) return false;
    const entries = Object.values(value as Record<string, unknown>);
    if (entries.length === 0) return true;
    const first = entries[0] as { boards?: unknown } | null;
    return Array.isArray(first?.boards);
}

async function getTopBoards(gameIds: number[]): Promise<TopBoardsResult> {
    'use cache';
    cacheLife('hours');
    cacheTag('leaderboards-top-boards');

    if (gameIds.length === 0) return {};

    let response: Response;
    try {
        const url = `${process.env.NEXT_PUBLIC_DATA_URL}/games?view=top-boards&gameIds=${gameIds.join(',')}`;
        response = await fetch(url, {
            headers: { 'x-api-key': await getApiKey() },
        });
    } catch (err) {
        console.error('leaderboards-page: top-boards fetch failed', err);
        // The page renders without board lines rather than not at all.
        return {};
    }

    if (!response.ok) {
        console.error(
            `leaderboards-page: top-boards responded ${response.status}`,
        );
        return {};
    }

    const json = await response.json();
    const result = json.result ?? {};
    if (!isPlausibleTopBoardsResult(result)) {
        console.error(
            'leaderboards-page: top-boards returned an unexpected shape',
            result,
        );
        return {};
    }
    return result;
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

    let boards: TopBoardsResult;
    try {
        boards = await getTopBoards(candidates.map((g) => g.gameId));
    } catch (err) {
        // A board-data failure must never take the whole row list down —
        // the rest of the page (rank, art, name, runners) still renders.
        console.error('leaderboards-page: getTopBoards threw', err);
        boards = {};
    }

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
