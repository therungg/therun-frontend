// The "this board is alive" line in the setup header. Everything comes from
// the QuickStats the setup page already fetches — no extra request, so the
// header can't fail independently of the page it sits on.
import type { QuickStats } from '../../../types/leaderboards.types';

export interface PulseStat {
    value: string;
    label: string;
}

const HOUR_MS = 60 * 60 * 1000;

// Default compact rounding, deliberately: it keeps every value to at most
// three characters plus a suffix (538K, 12K, 1.2K, 312). Forcing
// maximumFractionDigits here would widen the big ones back out to "537.9K".
const compact = new Intl.NumberFormat('en-US', { notation: 'compact' });

/**
 * Total run time (ms) as a header-sized string, or null when there's no time
 * to report. Big boards run to hundreds of thousands of hours (SM64 ≈ 538K),
 * so hours are compacted rather than spelled out; a board with under an hour
 * on it would round to "0" and read as broken, so it says "<1" instead.
 */
export function formatPlaytime(totalRunTimeMs: number): string | null {
    if (!Number.isFinite(totalRunTimeMs) || totalRunTimeMs <= 0) return null;
    const hours = totalRunTimeMs / HOUR_MS;
    if (hours < 1) return '<1';
    return compact.format(Math.round(hours));
}

/**
 * The stats shown next to the game title, in order. Returns an empty array for
 * a board with nothing on it yet — "0 runners · 0 runs · 0 hours" says the
 * opposite of what this strip is for, so it renders nothing instead.
 */
export function boardPulse(stats: QuickStats): PulseStat[] {
    if (stats.uniqueRunners <= 0 && stats.totalFinishedAttemptCount <= 0) {
        return [];
    }

    const out: PulseStat[] = [
        {
            value: stats.uniqueRunners.toLocaleString('en-US'),
            label: stats.uniqueRunners === 1 ? 'runner' : 'runners',
        },
        {
            value: stats.totalFinishedAttemptCount.toLocaleString('en-US'),
            // "runs" alone reads as leaderboard entries next to a board;
            // these are every finished attempt the game has ever seen.
            label:
                stats.totalFinishedAttemptCount === 1
                    ? 'finished run'
                    : 'finished runs',
        },
    ];

    const playtime = formatPlaytime(stats.totalRunTime);
    if (playtime) {
        out.push({
            value: playtime,
            // "<1 hour played" — anything else is plural, including "0.5K".
            label: playtime === '<1' ? 'hour played' : 'hours played',
        });
    }

    return out;
}
