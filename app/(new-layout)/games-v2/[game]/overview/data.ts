import { getGameActivityTimeseries } from '~src/lib/game-activity';
import { EMPTY_GAME_METADATA } from '~src/lib/game-metadata';
import type { GameMetadata } from '~src/lib/game-mgmt';
import { getGameMetadata } from '~src/lib/game-mgmt';
import { getQuickStats, getRecentPbs } from '~src/lib/games-v1';
import {
    getLeaderboard,
    getUserRankingsByName,
} from '~src/lib/leaderboards-v1';
import { splitLevelBoards } from '~src/lib/levels/display';
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
    /**
     * How many runners are on that same board — the row count behind the card,
     * NOT `category_stats.unique_runners` (which counts everyone whose timer
     * ever synced the category and is therefore 0 for an imported board with a
     * full leaderboard on it). `null` = the board fetch failed, so the card
     * says nothing rather than claiming zero.
     */
    boardRunners: number | null;
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
): Promise<{ entries: LeaderboardEntry[]; boardRunners: number | null }> {
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
        if (!res.ok) return { entries: [], boardRunners: null };
        // totalItems is the whole board, not this page of 3 — the count is
        // already in the response the podium came from, so an accurate
        // "N runners" costs no extra request.
        return {
            entries: res.result.entries,
            boardRunners: res.result.totalItems,
        };
    } catch {
        return { entries: [], boardRunners: null };
    }
}

/**
 * The categories the wall is made of.
 *
 * Level boards are Featured — an instance copies its level category's isMain —
 * but they are not cards: a 30-level game with four level categories would put
 * 120 of them on the wall and fire 120 leaderboard requests to fill them in.
 * They are reached through the level picker on a board, so the wall (and the
 * fetches, and the "featured" scope the sidebar's PBs are filtered to) is
 * full-game only. Narrowed here as well as at the caller so no route can
 * accidentally pay for the fan-out.
 */
export function overviewCardCategories(
    featured: ResolvedCategory[],
    groups: ResolvedGroup[],
): ResolvedCategory[] {
    return splitLevelBoards(featured, groups).fullGame;
}

export async function loadGameOverviewData(
    game: ResolvedGame,
    featured: ResolvedCategory[],
    groups: ResolvedGroup[],
    sessionUsername: string | null,
): Promise<GameOverviewData> {
    const cardCategories = overviewCardCategories(featured, groups);
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
        Promise.all(cardCategories.map((c) => fetchCardEntries(game.name, c))),
        getGameActivityTimeseries(game.id, isoDaysAgo(90), today).catch(
            () => [],
        ),
    ]);

    return {
        game,
        gameMeta,
        quickStats,
        groups,
        cards: cardCategories.map((category, i) => ({
            category,
            entries: cardEntries[i].entries,
            boardRunners: cardEntries[i].boardRunners,
        })),
        // The sidebar must not surface PBs from boards the wall can't link to.
        recentPbs: filterPbsToFeatured(recentPbs, cardCategories),
        yourRuns: rawYourRuns.filter((r) => r.gameSlug === game.name),
        activitySparkline: toSparklineSeries(activity90, 90),
        sessionUsername,
    };
}
