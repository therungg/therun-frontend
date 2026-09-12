import { getGameActivityTimeseries } from '~src/lib/game-activity';
import { EMPTY_GAME_METADATA } from '~src/lib/game-metadata';
import type { GameMetadata } from '~src/lib/game-mgmt';
import { getGameMetadata } from '~src/lib/game-mgmt';
import { getQuickStats, getRecentPbs } from '~src/lib/games-v1';
import {
    getLeaderboard,
    getUserRankingsByName,
    getVariables,
} from '~src/lib/leaderboards-v1';
import { splitLevelBoards } from '~src/lib/levels/display';
import {
    readSliceSelection,
    type SliceSelection,
    sliceLabel,
    sliceValuesForCategory,
    subcategoryKeyOf,
    unionSubcategoryVariables,
} from '~src/lib/variables/slice-selection';
import type {
    LeaderboardEntry,
    QuickStats,
    RecentPb,
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
    StandingsVariable,
    UserRanking,
    VariableRow,
} from '../../../../../types/leaderboards.types';
import { isoDaysAgo, toSparklineSeries } from '../header/sparkline-data';
import {
    filterPbsToFeatured,
    RECENT_PB_FETCH_LIMIT,
} from '../sidebar/featured-pbs';
import type { GamePageSearchParams } from '../types';

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
    /** "Mario · 1P" — which board of the category the card shows; null when it has no subcategories. */
    sliceLabel: string | null;
    /** The board's `name=value|…` key for the card's link; "" when none. */
    subcategoryKey: string;
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
    /** The subcategory picker's definition (union over the cards' categories); [] = no picker. */
    sliceVariables: StandingsVariable[];
    /** The picker's state from the URL (normalized, validated). */
    sliceSelection: SliceSelection;
}

// The card's record is the top of the board the picker names for this
// category — the exact board clicking the card lands on (not combined,
// unverified included), so the numbers on the card always match the top of
// the table behind it. One request per category, top 3 for the podium.
async function fetchCardEntries(
    gameSlug: string,
    category: ResolvedCategory,
    subcategoryValues: Record<string, string>,
): Promise<{ entries: LeaderboardEntry[]; boardRunners: number | null }> {
    try {
        const res = await getLeaderboard({
            gameSlug,
            categorySlug: category.name,
            subcategoryValues,
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
    sp: GamePageSearchParams,
): Promise<GameOverviewData> {
    const cardCategories = overviewCardCategories(featured, groups);
    const today = isoDaysAgo(0);

    // These five don't depend on the variable defs below — start them
    // immediately so a cold defs cache doesn't hold up the rest of the page.
    const quickStatsPromise = getQuickStats(game.id).catch(() => ({
        totalRunTime: 0,
        totalAttemptCount: 0,
        totalFinishedAttemptCount: 0,
        totalPbs: 0,
        uniqueRunners: 0,
    }));
    const gameMetaPromise = getGameMetadata(game.id).catch(
        () => EMPTY_GAME_METADATA,
    );
    const recentPbsPromise = getRecentPbs(game.id, RECENT_PB_FETCH_LIMIT, {
        featuredOnly: true,
    }).catch(() => []);
    const rawYourRunsPromise = sessionUsername
        ? getUserRankingsByName(sessionUsername).catch(() => [])
        : Promise.resolve([]);
    const activity90Promise = getGameActivityTimeseries(
        game.id,
        isoDaysAgo(90),
        today,
    ).catch(() => []);

    // Variable definitions: the picker's union and each card's board depend
    // on them. Cached for hours per category, so this is cheap after the
    // first view; a failed fetch means "no subcategories" for that card.
    const defsByCategory = await Promise.all(
        cardCategories.map(async (c) => ({
            categoryId: c.id,
            defs: await getVariables(game.name, c.name)
                .then((r) => r.variables as VariableRow[])
                .catch(() => [] as VariableRow[]),
        })),
    );
    const sliceVariables = unionSubcategoryVariables(defsByCategory);
    const sliceSelection = readSliceSelection(sp, sliceVariables);
    const cardSlices = defsByCategory.map(({ defs }) =>
        sliceValuesForCategory(defs, sliceSelection, sliceVariables),
    );

    const [
        quickStats,
        gameMeta,
        recentPbs,
        rawYourRuns,
        cardEntries,
        activity90,
    ] = await Promise.all([
        quickStatsPromise,
        gameMetaPromise,
        recentPbsPromise,
        rawYourRunsPromise,
        Promise.all(
            cardCategories.map((c, i) =>
                fetchCardEntries(game.name, c, cardSlices[i]),
            ),
        ),
        activity90Promise,
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
            sliceLabel: sliceLabel(cardSlices[i], sliceVariables),
            subcategoryKey: subcategoryKeyOf(cardSlices[i], sliceVariables),
        })),
        // The sidebar must not surface PBs from boards the wall can't link to.
        recentPbs: filterPbsToFeatured(recentPbs, cardCategories),
        yourRuns: rawYourRuns.filter((r) => r.gameSlug === game.name),
        activitySparkline: toSparklineSeries(activity90, 90),
        sessionUsername,
        sliceVariables,
        sliceSelection,
    };
}
