import type { LiveRun } from '~app/(new-layout)/live/live.types';
import { normalizeSlug } from '~src/lib/normalize-slug';
import type {
    RecentPb,
    ResolvedCategory,
} from '../../../../../types/leaderboards.types';

/**
 * What the rail's pulse panels (Live now, Recent PBs) are looking at.
 * `board` = only the board on screen; `game` = every Featured board. The
 * overview has no board, so it's always `game` there.
 */
export type RailScope = 'board' | 'game';

/**
 * Finds the Featured board a live run's category string belongs to. LiveSplit
 * category names are runner-typed ("70 star", "16 Star", "120 Star ") and a
 * board is `name`/`display`, so compare slugs of both. Undefined when nothing
 * matches — the row then just isn't linkable to a board.
 */
export function matchLiveCategory(
    liveCategory: string | null | undefined,
    categories: ResolvedCategory[],
): ResolvedCategory | undefined {
    const key = normalizeSlug(liveCategory ?? '');
    if (!key) return undefined;
    return categories.find(
        (c) =>
            normalizeSlug(c.display) === key || normalizeSlug(c.name) === key,
    );
}

/** Importance-first, the same order the live page opens on. */
export function sortLiveRuns(runs: LiveRun[]): LiveRun[] {
    return [...runs].sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0));
}

/**
 * Narrows live runs to the board on screen. A run whose category matches no
 * Featured board is game-scope only.
 */
export function scopeLiveRuns(
    runs: LiveRun[],
    scope: RailScope,
    board: ResolvedCategory | null | undefined,
    categories: ResolvedCategory[],
): LiveRun[] {
    if (scope !== 'board' || !board) return runs;
    return runs.filter(
        (r) => matchLiveCategory(r.category, categories)?.id === board.id,
    );
}

/** Narrows the PB feed to the board on screen (by resolved category id). */
export function scopePbs(
    pbs: RecentPb[],
    scope: RailScope,
    board: ResolvedCategory | null | undefined,
): RecentPb[] {
    if (scope !== 'board' || !board) return pbs;
    return pbs.filter((p) => p.categoryId === board.id);
}

/**
 * Whether the run's timer is between attempts. `hasReset` is the explicit
 * signal; a negative split index means the timer hasn't started.
 */
export function isBetweenRuns(run: LiveRun): boolean {
    return run.hasReset || run.currentSplitIndex < 0 || !run.currentSplitName;
}
