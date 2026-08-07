import { getGameActivityTimeseries } from '~src/lib/game-activity';
import { EMPTY_GAME_METADATA } from '~src/lib/game-metadata';
import type { GameMetadata } from '~src/lib/game-mgmt';
import { getGameMetadata } from '~src/lib/game-mgmt';
import { getQuickStats, getRecentPbs } from '~src/lib/games-v1';
import {
    getLeaderboard,
    getUserRankingsByName,
} from '~src/lib/leaderboards-v1';
import type {
    LeaderboardEntry,
    QuickStats,
    RecentPb,
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
    UserRanking,
} from '../../../../../types/leaderboards.types';
import { isoDaysAgo, toSparklineSeries } from '../header/sparkline-data';
import {
    filterPbsToFeatured,
    RECENT_PB_FETCH_LIMIT,
} from '../sidebar/featured-pbs';

export interface OverviewCardData {
    category: ResolvedCategory;
    /** Top-3 of the category's default board (page 1); [] = fetch failed or empty. */
    entries: LeaderboardEntry[];
}

export interface GameOverviewData {
    game: ResolvedGame;
    gameMeta: GameMetadata;
    quickStats: QuickStats;
    groups: ResolvedGroup[];
    cards: OverviewCardData[];
    recentPbs: RecentPb[];
    yourRuns: UserRanking[];
    /** Zero-filled daily playtime, last 90 days — the hero's sparkline. */
    activitySparkline: number[];
    sessionUsername: string | null;
}

// The card's record is the top of the category's DEFAULT board — the exact
// board clicking the card lands on (no subcategory values, not combined,
// unverified included), so the numbers on the card always match the top
// of the table behind it. One request per category, top 3 for the podium.
async function fetchCardEntries(
    gameSlug: string,
    category: ResolvedCategory,
): Promise<LeaderboardEntry[]> {
    try {
        const res = await getLeaderboard({
            gameSlug,
            categorySlug: category.name,
            subcategoryValues: {},
            combined: false,
            verified: false,
            page: 1,
            pageSize: 3,
            varFilters: {},
            timing: category.primaryTiming,
        });
        if (!res.ok) return [];
        return res.result.entries;
    } catch {
        return [];
    }
}

export async function loadGameOverviewData(
    game: ResolvedGame,
    featured: ResolvedCategory[],
    groups: ResolvedGroup[],
    sessionUsername: string | null,
): Promise<GameOverviewData> {
    const today = isoDaysAgo(0);
    const [
        quickStats,
        gameMeta,
        recentPbs,
        rawYourRuns,
        cardEntries,
        activity90,
    ] = await Promise.all([
        getQuickStats(game.id).catch(() => ({
            totalRunTime: 0,
            totalAttemptCount: 0,
            totalFinishedAttemptCount: 0,
            totalPbs: 0,
            uniqueRunners: 0,
        })),
        getGameMetadata(game.id).catch(() => EMPTY_GAME_METADATA),
        getRecentPbs(game.id, RECENT_PB_FETCH_LIMIT, {
            featuredOnly: true,
        }).catch(() => []),
        sessionUsername
            ? getUserRankingsByName(sessionUsername).catch(() => [])
            : Promise.resolve([]),
        Promise.all(featured.map((c) => fetchCardEntries(game.name, c))),
        getGameActivityTimeseries(game.id, isoDaysAgo(90), today).catch(
            () => [],
        ),
    ]);

    return {
        game,
        gameMeta,
        quickStats,
        groups,
        cards: featured.map((category, i) => ({
            category,
            entries: cardEntries[i],
        })),
        // The sidebar must not surface PBs from boards the wall can't link to.
        recentPbs: filterPbsToFeatured(recentPbs, featured),
        yourRuns: rawYourRuns.filter((r) => r.gameSlug === game.name),
        activitySparkline: toSparklineSeries(activity90, 90),
        sessionUsername,
    };
}
