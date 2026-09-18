import { getRunnerGameEntries } from '~src/lib/leaderboards-v1';
import type { RecentPb } from '../../../../../types/leaderboards.types';

/**
 * Ceiling on the fan-out. One probe is one cached `getRunnerGameEntries`,
 * which returns every entry that runner holds on this game — so a probe
 * covers all of their rows at once, whichever board the panel is scoped to.
 * Past this bound the remaining rows render with no rank; a missing number is
 * a smaller failure than a slow rail.
 */
const MAX_RUNNER_PROBES = 8;

/**
 * How far down the feed to collect runners from. The panel shows five rows,
 * but the scope toggle can swap which five, so the window has to cover more
 * than the first five names.
 */
const RANKED_WINDOW = 15;

export interface PbRank {
    rank: number;
    totalRunners: number;
}

/** Keyed by the join keys below, not by a single id — see loadPbRanks. */
export type PbRankMap = Record<string, PbRank>;

const runKey = (runId: number) => `run:${runId}`;
const timeKey = (username: string, categoryId: number, ms: number) =>
    `time:${username.toLowerCase()}:${categoryId}:${ms}`;

/**
 * Board rank for each recent PB.
 *
 * The rank comes from the runner's own standing entries on this game, not
 * from the leaderboard page the board view happens to have loaded: that page
 * is the board's top 25, and a recent PB is almost never in it, so the rank
 * effectively never rendered.
 *
 * Two join keys, because one isn't enough. `/v1/finished-runs` carries a
 * `runId`, but it is NULL on plenty of real rows (every Spyro the Dragon PB
 * on 2026-09-18, for instance) — so a row is also indexed by runner,
 * category and exact time, which the two endpoints do agree on. The time
 * key is matched against both clocks, since `timeMs` is whichever one the
 * board ranks on.
 *
 * A row only gets a rank while its run is still the runner's standing entry
 * on that board. Once they beat it, the older row drops its rank rather than
 * inheriting the newer run's — the number means "where this run sits", and a
 * superseded run doesn't sit anywhere.
 */
export async function loadPbRanks(
    gameId: number,
    pbs: RecentPb[],
): Promise<PbRankMap> {
    const runners: string[] = [];
    for (const pb of pbs.slice(0, RANKED_WINDOW)) {
        if (pb.username && !runners.includes(pb.username)) {
            runners.push(pb.username);
            if (runners.length >= MAX_RUNNER_PROBES) break;
        }
    }
    if (runners.length === 0) return {};

    const results = await Promise.all(
        runners.map((username) =>
            getRunnerGameEntries(gameId, { username })
                .then((r) => ({ username, r }))
                .catch(() => null),
        ),
    );

    const ranks: PbRankMap = {};
    for (const result of results) {
        if (!result || result.r.status !== 'found') continue;
        for (const entry of result.r.entries) {
            if (entry.rank == null) continue;
            const rank = {
                rank: entry.rank,
                totalRunners: entry.totalRunners,
            };
            if (typeof entry.runId === 'number') {
                ranks[runKey(entry.runId)] = rank;
            }
            ranks[timeKey(result.username, entry.categoryId, entry.timeMs)] =
                rank;
        }
    }
    return ranks;
}

/** The rank for one PB row, or undefined when it has none. */
export function lookupPbRank(
    ranks: PbRankMap | undefined,
    pb: RecentPb,
): PbRank | undefined {
    if (!ranks) return undefined;
    if (typeof pb.runId === 'number') {
        const byRun = ranks[runKey(pb.runId)];
        if (byRun) return byRun;
    }
    if (pb.categoryId == null) return undefined;
    return (
        ranks[timeKey(pb.username, pb.categoryId, pb.time)] ??
        (typeof pb.gameTime === 'number'
            ? ranks[timeKey(pb.username, pb.categoryId, pb.gameTime)]
            : undefined)
    );
}
