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

export interface OverviewCardData {
    category: ResolvedCategory;
    /** Rank-1 entry of the category's default board; null = fetch failed or empty board. */
    wrEntry: LeaderboardEntry | null;
}

export interface GameOverviewData {
    game: ResolvedGame;
    gameMeta: GameMetadata;
    quickStats: QuickStats;
    groups: ResolvedGroup[];
    cards: OverviewCardData[];
    recentPbs: RecentPb[];
    yourRuns: UserRanking[];
    sessionUsername: string | null;
}

// The card's WR is the rank-1 of the category's DEFAULT board — the exact
// board clicking the card lands on (no subcategory values, not combined,
// unverified included), so the number on the card always matches the top
// of the table behind it.
async function fetchCardWr(
    gameSlug: string,
    category: ResolvedCategory,
): Promise<LeaderboardEntry | null> {
    try {
        const res = await getLeaderboard({
            gameSlug,
            categorySlug: category.name,
            subcategoryValues: {},
            combined: false,
            verified: false,
            page: 1,
            pageSize: 1,
            varFilters: {},
            timing: category.primaryTiming,
        });
        if (!res.ok) return null;
        const entry = res.result.entries[0] ?? null;
        return entry && entry.rank === 1 && entry.time !== null ? entry : null;
    } catch {
        return null;
    }
}

export async function loadGameOverviewData(
    game: ResolvedGame,
    featured: ResolvedCategory[],
    groups: ResolvedGroup[],
    sessionUsername: string | null,
): Promise<GameOverviewData> {
    const [quickStats, gameMeta, recentPbs, rawYourRuns, wrEntries] =
        await Promise.all([
            getQuickStats(game.id).catch(() => ({
                totalRunTime: 0,
                totalAttemptCount: 0,
                totalFinishedAttemptCount: 0,
                uniqueRunners: 0,
            })),
            getGameMetadata(game.id).catch(() => EMPTY_GAME_METADATA),
            getRecentPbs(game.id).catch(() => []),
            sessionUsername
                ? getUserRankingsByName(sessionUsername).catch(() => [])
                : Promise.resolve([]),
            Promise.all(featured.map((c) => fetchCardWr(game.name, c))),
        ]);

    return {
        game,
        gameMeta,
        quickStats,
        groups,
        cards: featured.map((category, i) => ({
            category,
            wrEntry: wrEntries[i],
        })),
        recentPbs,
        yourRuns: rawYourRuns.filter((r) => r.gameSlug === game.name),
        sessionUsername,
    };
}
