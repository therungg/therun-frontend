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
    return entry.showMilliseconds
        ? `${base}.${String(ms % 1000).padStart(3, '0')}`
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

export function timingLabel(
    entry: Pick<LeaderboardsProfileEntry, 'timing' | 'gameTimeLabel'>,
): string {
    return entry.timing === 'gametime'
        ? entry.gameTimeLabel.toUpperCase()
        : 'RTA';
}
