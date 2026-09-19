import { getLeaderboard } from '~src/lib/leaderboards-v1';
import { mapWithConcurrency } from '~src/utils/array';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';
import type { OverviewCardData } from '../overview/data';
import { levelSections, MAX_RECORD_PROBES, planRecordProbes } from './order';

/** Records fetched in parallel; the same ceiling the board's own fan-outs use. */
const RECORD_CONCURRENCY = 8;

/**
 * A level nobody has run: a name and a board to open, nothing to show on a
 * card. Deliberately not a `ResolvedCategory` — a 650-level game would ship
 * its whole category table to the browser to render six hundred links.
 */
export interface LevelChip {
    id: number;
    /** Category slug — the `?board=` value. */
    name: string;
    display: string;
}

export interface LevelSection {
    id: number;
    name: string;
    /** Levels with runs, as the same card the category wall is built from. */
    cards: OverviewCardData[];
    /** The rest, in display order. */
    rest: LevelChip[];
}

export interface LevelsData {
    sections: LevelSection[];
    /** Levels across every section. */
    total: number;
    /** How many of them have a ranked run. */
    withRuns: number;
    /** Ranked runs across every level board. */
    rankedRuns: number;
    /** The most-run level, for the page's figures; null when none has runs. */
    busiest: { display: string; entries: number } | null;
    /** The record fan-out's ceiling — what the page did, not a policy. */
    probeCap: number;
}

/**
 * The Levels tab's data.
 *
 * A level that has been run gets the same card the category wall gives a
 * category — emblem, record, podium — which is one leaderboard request each
 * (top 3, the podium's depth, for the price of the top 1). A level nobody has
 * touched gets a chip: pageData already counted its rows, so it costs nothing
 * to know there is nothing to show.
 */
export async function loadLevelsData(
    gameSlug: string,
    categories: ResolvedCategory[],
    groups: ResolvedGroup[],
    entryCounts: Record<number, number>,
): Promise<LevelsData> {
    const sections = levelSections(categories, groups);
    const all = sections.flatMap((s) => s.boards);
    const probes = planRecordProbes(all, entryCounts);
    const probeIds = new Set(probes.map((p) => p.id));

    const boards = await mapWithConcurrency(
        probes,
        RECORD_CONCURRENCY,
        async (category) => {
            try {
                const res = await getLeaderboard({
                    gameSlug,
                    categorySlug: category.name,
                    // No subcategory values: the backend applies the board's
                    // own defaults, which is the board this page links to.
                    subcategoryValues: {},
                    combined: false,
                    verified: false,
                    page: 1,
                    pageSize: 3,
                    varFilters: {},
                    timing: category.primaryTiming,
                });
                if (!res.ok) return null;
                return {
                    entries: res.result.entries,
                    boardRunners: res.result.totalItems,
                };
            } catch {
                return null;
            }
        },
    );
    const boardById = new Map(probes.map((p, i) => [p.id, boards[i]]));

    const out: LevelSection[] = sections.map((s) => {
        const cards: OverviewCardData[] = [];
        const rest: LevelChip[] = [];
        for (const category of s.boards) {
            const board = probeIds.has(category.id)
                ? boardById.get(category.id)
                : undefined;
            // A probe that came back empty is a level with no ranked run, so it
            // belongs with the chips rather than holding a card that says "—".
            if (board && board.entries.length > 0) {
                cards.push({
                    category,
                    entries: board.entries,
                    boardRunners: board.boardRunners,
                    // Levels have no subcategory picker on this page: the card
                    // links to the board's own default slice.
                    sliceLabel: null,
                    subcategoryKey: '',
                });
            } else {
                rest.push({
                    id: category.id,
                    name: category.name,
                    display: category.display,
                });
            }
        }
        return { id: s.id, name: s.name, cards, rest };
    });

    const cards = out.flatMap((s) => s.cards);
    const busiest = cards.reduce<OverviewCardData | null>(
        (best, c) =>
            (c.boardRunners ?? 0) > (best?.boardRunners ?? 0) ? c : best,
        null,
    );

    return {
        sections: out,
        total: all.length,
        withRuns: cards.length,
        rankedRuns: cards.reduce((n, c) => n + (c.boardRunners ?? 0), 0),
        busiest: busiest
            ? {
                  display: busiest.category.display,
                  entries: busiest.boardRunners ?? 0,
              }
            : null,
        probeCap: MAX_RECORD_PROBES,
    };
}
