import { getLeaderboard } from '~src/lib/leaderboards-v1';
import { mapWithConcurrency } from '~src/utils/array';
import type {
    LeaderboardEntry,
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';
import { levelSections, MAX_RECORD_PROBES, planRecordProbes } from './order';

/** Records fetched in parallel; the same ceiling the board's own fan-outs use. */
const RECORD_CONCURRENCY = 8;

export interface LevelRow {
    id: number;
    /** Category slug — the `?board=` value. */
    name: string;
    display: string;
    /** Entries on the board, from pageData's live count. Null = not counted. */
    entries: number | null;
    /** Top of the board; null when empty, unprobed or the fetch failed. */
    record: LeaderboardEntry | null;
    /** Whole-millisecond rendering, per the board's own setting. */
    showMilliseconds: boolean;
}

export interface LevelSection {
    id: number;
    name: string;
    rules: string | null;
    rows: LevelRow[];
}

/**
 * The Levels tab's rows: every featured level board, with its entry count from
 * pageData and the top of the board for the ones that have runs.
 */
export async function loadLevelsData(
    gameSlug: string,
    categories: ResolvedCategory[],
    groups: ResolvedGroup[],
    entryCounts: Record<number, number>,
): Promise<{ sections: LevelSection[]; probeCap: number }> {
    const sections = levelSections(categories, groups);
    const all = sections.flatMap((s) => s.boards);
    const probes = planRecordProbes(all, entryCounts);

    const records = await mapWithConcurrency(
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
                    pageSize: 1,
                    varFilters: {},
                    timing: category.primaryTiming,
                });
                return res.ok ? (res.result.entries[0] ?? null) : null;
            } catch {
                return null;
            }
        },
    );
    const recordById = new Map<number, LeaderboardEntry | null>();
    probes.forEach((p, i) => recordById.set(p.id, records[i]));

    return {
        sections: sections.map((s) => ({
            id: s.id,
            name: s.name,
            rules: s.rules,
            rows: s.boards.map((c) => ({
                id: c.id,
                name: c.name,
                display: c.display,
                entries: entryCounts[c.id] ?? null,
                record: recordById.get(c.id) ?? null,
                showMilliseconds: c.showMilliseconds ?? true,
            })),
        })),
        probeCap: MAX_RECORD_PROBES,
    };
}
