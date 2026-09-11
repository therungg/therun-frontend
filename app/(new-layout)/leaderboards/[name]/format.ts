import { formatSubcategoryKey } from '~app/(new-layout)/games-v2/[game]/labels';
import type {
    LeaderboardsProfileEntry,
    ProfileProvenance,
} from '../../../../types/leaderboards-profile.types';

export function formatEntryTime(
    entry: Pick<LeaderboardsProfileEntry, 'timeMs' | 'showMilliseconds'>,
): string {
    const ms = entry.timeMs;
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (v: number) => String(v).padStart(2, '0');
    const base = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
    const millis = ms % 1000;
    return entry.showMilliseconds && millis !== 0
        ? `${base}.${String(millis).padStart(3, '0')}`
        : base;
}

const utcDateFmt = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
});

/**
 * "1 Mar 2026", fixed to UTC so the server render and the client hydration
 * of the tabs always print the same day.
 */
export function formatProfileDate(iso: string): string {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : utcDateFmt.format(date);
}

export function provenanceLabel(p: ProfileProvenance): string {
    switch (p) {
        case 'live':
            return 'Live on therun';
        case 'submitted':
            return 'Submitted';
        case 'mod':
            return 'Entered by a moderator';
        case 'self':
            return 'Entered by the runner';
        case 'splits':
            return 'Uploaded splits';
        case 'imported':
            return 'Imported';
        default:
            return 'Unknown source';
    }
}

/** The board's game-time label (e.g. `IGT`); real time carries no label. */
export function timingLabel(
    entry: Pick<LeaderboardsProfileEntry, 'timing' | 'gameTimeLabel'>,
): string | null {
    return entry.timing === 'gametime'
        ? entry.gameTimeLabel.toUpperCase()
        : null;
}

/** Lowercase word tokens: "Night Flight" -> ["night", "flight"]. */
function wordTokens(text: string): string[] {
    return text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean);
}

/**
 * The entry's subcategory as copy, minus any value the category or level
 * name already says in whole words: "Night Flight" with `category=flight`
 * prints nothing extra, while "16 Star" still keeps a value of `1`.
 */
export function entrySubcategoryLabel(
    entry: Pick<
        LeaderboardsProfileEntry,
        'subcategoryKey' | 'category' | 'level'
    >,
): string {
    const nameWords = new Set(
        wordTokens(`${entry.category} ${entry.level ?? ''}`),
    );
    const said = (text: string) => {
        const words = wordTokens(text);
        return words.length > 0 && words.every((w) => nameWords.has(w));
    };
    const labels: string[] = [];
    for (const pair of entry.subcategoryKey?.split('|') ?? []) {
        const eq = pair.indexOf('=');
        if (eq < 0) continue;
        const label = formatSubcategoryKey(pair);
        if (!label || said(pair.slice(eq + 1)) || said(label)) continue;
        labels.push(label);
    }
    return labels.join(' · ');
}
