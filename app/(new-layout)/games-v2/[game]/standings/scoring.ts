import type {
    GameStandings,
    StandingsCategory,
    StandingsRunner,
} from '../../../../../types/leaderboards.types';

/**
 * A runner's result on one category. `null` where they haven't run it — the
 * distinction between "absent" and "scored zero" matters for display even
 * though both contribute 0 to the score.
 */
export interface ScoredCell {
    /** wrTimeMs / timeMs, in (0, 1]. 1 for the WR holder. */
    pct: number;
    rank: number;
    timeMs: number;
}

export interface ScoredRunner {
    runner: StandingsRunner;
    /** Mean pct over the selected categories, absent = 0. In [0, 1]. */
    score: number;
    /** Selected categories this runner has actually run. */
    coverage: number;
    /** Highest pct across the selected categories; the first tie-break. */
    best: number;
    /** Indexed by position in the SELECTED category list, not the full one. */
    cells: (ScoredCell | null)[];
}

/**
 * The decoded matrix. Columns are `Float64Array` of pct indexed by runner, with
 * 0 meaning "no run" — decoded once at load so a toggle is a pass over typed
 * arrays rather than a walk over the sparse wire format.
 */
export interface StandingsMatrix {
    categories: StandingsCategory[];
    runners: StandingsRunner[];
    /** pct[categoryIndex][runnerIndex]; 0 = absent. */
    pct: Float64Array[];
    /** rank[categoryIndex][runnerIndex]; 0 = absent. */
    rank: Int32Array[];
    /** timeMs[categoryIndex][runnerIndex]; 0 = absent. */
    timeMs: Float64Array[];
    truncated: boolean;
}

/**
 * Decode the columnar payload into typed columns.
 *
 * Cells whose time is non-positive are dropped. Boards platform-wide carry
 * auto-imported runs with 0ms times sitting at rank 1; a 0 denominator would
 * yield Infinity and a 0 numerator would zero out an entire column, so neither
 * is allowed to enter the matrix. The backend applies the same rule, this is
 * defence in depth against a payload from an older deploy.
 */
export function decodeStandings(data: GameStandings): StandingsMatrix {
    const nCats = data.categories.length;
    const nRunners = data.runners.length;

    const pct = Array.from({ length: nCats }, () => new Float64Array(nRunners));
    const rank = Array.from({ length: nCats }, () => new Int32Array(nRunners));
    const timeMs = Array.from(
        { length: nCats },
        () => new Float64Array(nRunners),
    );

    for (const [categoryIdx, runnerIdx, cellRank, cellTime] of data.cells) {
        if (cellTime <= 0) continue;
        const wr = data.categories[categoryIdx]?.wrTimeMs;
        if (!wr || wr <= 0) continue;
        // Clamp: a runner can't be faster than the fastest time on their own
        // board, but a stale cached wrTimeMs shouldn't be able to print 104%.
        pct[categoryIdx][runnerIdx] = Math.min(1, wr / cellTime);
        rank[categoryIdx][runnerIdx] = cellRank;
        timeMs[categoryIdx][runnerIdx] = cellTime;
    }

    return {
        categories: data.categories,
        runners: data.runners,
        pct,
        rank,
        timeMs,
        truncated: data.truncated,
    };
}

/**
 * Rank runners across the selected categories.
 *
 *     score = mean(pct over ALL selected categories, absent = 0)
 *
 * Absent-counts-as-zero is the point of the toggles: they change the question
 * being asked, not merely which rows are visible. A consequence worth stating
 * because it looks like a bug and isn't — **coverage beats peak**. A runner
 * 60th on two selected boards scores (0.85 + 0.85) / 2 = 0.85 and outranks the
 * world-record holder of one who never ran the other, at (1.0 + 0) / 2 = 0.50.
 *
 * `selected` holds indices into `matrix.categories`. Order is preserved into
 * each row's `cells`, so the caller's column order drives the row layout.
 *
 * Tie-break: coverage, then best single pct, then name — fully deterministic,
 * so the table never reshuffles between renders of identical input.
 */
export function computeStandings(
    matrix: StandingsMatrix,
    selected: number[],
    limit: number,
): ScoredRunner[] {
    if (selected.length === 0 || limit <= 0) return [];

    const n = matrix.runners.length;
    const divisor = selected.length;
    const rows: ScoredRunner[] = [];

    for (let r = 0; r < n; r++) {
        let sum = 0;
        let coverage = 0;
        let best = 0;
        const cells: (ScoredCell | null)[] = [];

        for (const c of selected) {
            const p = matrix.pct[c][r];
            if (p > 0) {
                sum += p;
                coverage += 1;
                if (p > best) best = p;
                cells.push({
                    pct: p,
                    rank: matrix.rank[c][r],
                    timeMs: matrix.timeMs[c][r],
                });
            } else {
                cells.push(null);
            }
        }

        // A runner with no run in any selected category isn't ranked zeroth,
        // they're simply not in this competition.
        if (coverage === 0) continue;

        rows.push({
            runner: matrix.runners[r],
            score: sum / divisor,
            coverage,
            best,
            cells,
        });
    }

    rows.sort(compareScored);
    return rows.slice(0, limit);
}

function compareScored(a: ScoredRunner, b: ScoredRunner): number {
    if (b.score !== a.score) return b.score - a.score;
    if (b.coverage !== a.coverage) return b.coverage - a.coverage;
    if (b.best !== a.best) return b.best - a.best;
    return a.runner.name.localeCompare(b.runner.name);
}
