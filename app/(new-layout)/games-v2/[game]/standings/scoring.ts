import type {
    GameStandings,
    StandingsCategory,
    StandingsRunner,
} from '../../../../../types/leaderboards.types';

/**
 * A runner's result on one category. `null` where they haven't run it — an
 * absent board simply pays no points.
 */
export interface ScoredCell {
    /** Placement points: entryCount / sqrt(rank). */
    pts: number;
    rank: number;
    timeMs: number;
}

export interface ScoredRunner {
    runner: StandingsRunner;
    /** Total placement points over the selected categories. */
    score: number;
    /** Selected categories this runner has actually run. */
    coverage: number;
    /** Highest single-cell points across the selected categories; the second tie-break. */
    best: number;
    /** Indexed by position in the SELECTED category list, not the full one. */
    cells: (ScoredCell | null)[];
}

/**
 * The decoded matrix. Columns are typed arrays indexed by runner, with 0
 * meaning "no run" — decoded once at load so a toggle is a pass over typed
 * arrays rather than a walk over the sparse wire format.
 */
export interface StandingsMatrix {
    categories: StandingsCategory[];
    runners: StandingsRunner[];
    /** pts[categoryIndex][runnerIndex]; 0 = absent. */
    pts: Float64Array[];
    /** rank[categoryIndex][runnerIndex]; 0 = absent. */
    rank: Int32Array[];
    /** timeMs[categoryIndex][runnerIndex]; 0 = absent. */
    timeMs: Float64Array[];
    truncated: boolean;
}

/**
 * Placement points for one board: the whole field for #1, decaying with the
 * square root of rank — #4 pays half the field, #100 a tenth. Steep enough
 * that podium places clearly outweigh mid-pack ones (the linear
 * "runners-outranked" count made #1 and #10 near-identical on a big board),
 * but not so steep that one lucky podium on a tiny board beats deep
 * excellence everywhere (the harmonic curve's failure mode).
 */
export function placementPoints(entryCount: number, rank: number): number {
    return entryCount / Math.sqrt(rank);
}

/**
 * Decode the columnar payload into typed columns.
 *
 * Cells whose time or rank is non-positive are dropped, as are cells whose
 * category reports no entryCount. Boards platform-wide carry auto-imported
 * runs with 0ms times sitting at rank 1; none of these may enter the matrix
 * as points. The backend applies the same rule, this is defence in depth
 * against a payload from an older deploy.
 */
export function decodeStandings(data: GameStandings): StandingsMatrix {
    const nCats = data.categories.length;
    const nRunners = data.runners.length;

    const pts = Array.from({ length: nCats }, () => new Float64Array(nRunners));
    const rank = Array.from({ length: nCats }, () => new Int32Array(nRunners));
    const timeMs = Array.from(
        { length: nCats },
        () => new Float64Array(nRunners),
    );

    for (const [categoryIdx, runnerIdx, cellRank, cellTime] of data.cells) {
        if (cellTime <= 0 || cellRank <= 0) continue;
        const field = data.categories[categoryIdx]?.entryCount;
        if (!field || field <= 0) continue;
        pts[categoryIdx][runnerIdx] = placementPoints(field, cellRank);
        rank[categoryIdx][runnerIdx] = cellRank;
        timeMs[categoryIdx][runnerIdx] = cellTime;
    }

    return {
        categories: data.categories,
        runners: data.runners,
        pts,
        rank,
        timeMs,
        truncated: data.truncated,
    };
}

/**
 * Rank runners across the selected categories.
 *
 *     score = sum(placementPoints over the selected categories they've run)
 *
 * Every number is grounded: a board pays points by placement and field size,
 * a board you haven't run pays nothing. Deep fields are worth more than
 * shallow ones by construction, and coverage adds — but the sqrt curve keeps
 * podium places on big boards decisive.
 *
 * `selected` holds indices into `matrix.categories`. Order is preserved into
 * each row's `cells`, so the caller's column order drives the row layout.
 *
 * Tie-break: coverage, then best single-cell points, then name — fully
 * deterministic, so the table never reshuffles between renders of identical
 * input.
 */
export function computeStandings(
    matrix: StandingsMatrix,
    selected: number[],
    limit: number,
): ScoredRunner[] {
    if (selected.length === 0 || limit <= 0) return [];

    const n = matrix.runners.length;
    const rows: ScoredRunner[] = [];

    for (let r = 0; r < n; r++) {
        let sum = 0;
        let coverage = 0;
        let best = 0;
        const cells: (ScoredCell | null)[] = [];

        for (const c of selected) {
            const p = matrix.pts[c][r];
            if (p > 0) {
                sum += p;
                coverage += 1;
                if (p > best) best = p;
                cells.push({
                    pts: p,
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
            score: sum,
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
