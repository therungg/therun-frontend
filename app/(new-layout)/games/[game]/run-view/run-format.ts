import { originSummary } from '~src/lib/run-view/origin-summary';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import type { RunViewModel } from './run-view';

/** Unsigned gap: "4.002" under a minute, "2:16" above. */
export function formatDelta(ms: number): string {
    const abs = Math.abs(ms);
    if (abs < 60_000) return (abs / 1000).toFixed(3);
    return formatTimeMs(abs);
}

/** Signed gap between two times: "+3:34", "−0:12", "+0.412". */
export function formatGap(ms: number): string {
    return `${ms < 0 ? '−' : '+'}${formatDelta(ms)}`;
}

/**
 * The runner's splits & attempt stats page, when the run came off their timer.
 * Resolved by the backend from the timer's splits record (its run key carries
 * the category, platform and variables). Built here from the game's display
 * name it pointed at `/<runner>/<game>`, which is a run's custom URL and 404'd.
 */
export function runnerSplitsHref(model: RunViewModel): string | null {
    const summary = originSummary(model.origin, model.runnerName);
    if (!summary?.showSplitsLink || model.userId == null || model.isGuest)
        return null;
    return model.splitsHref ?? null;
}
