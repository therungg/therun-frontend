import type {
    LeaderboardsProfileEntry,
    LeaderboardsProfileGame,
} from '../../../../types/leaderboards-profile.types';
import type { ProfileUrl } from './url-state';

export type RunsSegment = 'all' | 'podium' | 'verified' | 'pending';
export type RunsScope = 'any' | 'full' | 'levels';

export interface RunsFilter {
    /** Search text over game, category and level names. */
    search: string;
    show: RunsSegment;
    video: boolean;
    scope: RunsScope;
    platform: string;
    /** A year: runs on or after 1 January of it. */
    since: string;
    archived: boolean;
}

export const SEGMENTS: { id: RunsSegment; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'podium', label: 'Podium' },
    { id: 'verified', label: 'Verified' },
    { id: 'pending', label: 'Pending' },
];

/** Full game runs show by default; levels are one click away. */
export const DEFAULT_SCOPE: RunsScope = 'full';

/** The scope after turning full game or levels on or off; one stays on. */
export function toggleScope(
    scope: RunsScope,
    part: 'full' | 'levels',
): RunsScope {
    const full = scope !== 'levels';
    const levels = scope !== 'full';
    const nextFull = part === 'full' ? !full : full;
    const nextLevels = part === 'levels' ? !levels : levels;
    if (nextFull && nextLevels) return 'any';
    if (nextLevels) return 'levels';
    if (nextFull) return 'full';
    return scope;
}

const oneOf = <T extends string>(value: string, ids: T[], fallback: T): T =>
    (ids as string[]).includes(value) ? (value as T) : fallback;

export function filterFromUrl(url: ProfileUrl): RunsFilter {
    return {
        search: url.game,
        show: oneOf(
            url.show,
            SEGMENTS.map((s) => s.id),
            'all',
        ),
        video: url.video === '1',
        scope: oneOf(url.scope, ['any', 'full', 'levels'], DEFAULT_SCOPE),
        platform: url.platform,
        since: /^\d{4}$/.test(url.since) ? url.since : '',
        archived: url.archived === '1',
    };
}

/** The URL parts for a filter change; defaults clear their key. */
export function filterToUrl(f: Partial<RunsFilter>): Partial<ProfileUrl> {
    const parts: Partial<ProfileUrl> = {};
    if (f.search !== undefined) parts.game = f.search;
    if (f.show !== undefined) parts.show = f.show === 'all' ? '' : f.show;
    if (f.video !== undefined) parts.video = f.video ? '1' : '';
    if (f.scope !== undefined) {
        parts.scope = f.scope === DEFAULT_SCOPE ? '' : f.scope;
    }
    if (f.platform !== undefined) parts.platform = f.platform;
    if (f.since !== undefined) parts.since = f.since;
    if (f.archived !== undefined) parts.archived = f.archived ? '1' : '';
    return parts;
}

export const CLEARED: RunsFilter = {
    search: '',
    show: 'all',
    video: false,
    scope: DEFAULT_SCOPE,
    platform: '',
    since: '',
    archived: false,
};

const needleOf = (f: RunsFilter) => f.search.trim().toLowerCase();

export const isSearching = (f: RunsFilter) => needleOf(f) !== '';

/** Any filter besides the search text. */
export const isNarrowed = (f: RunsFilter) =>
    f.show !== 'all' ||
    f.video ||
    f.scope !== DEFAULT_SCOPE ||
    f.platform !== '' ||
    f.since !== '';

/** The runs a game offers before filtering: archived boards only on request. */
export const runsOf = (game: LeaderboardsProfileGame, f: RunsFilter) =>
    f.archived ? [...game.entries, ...game.archived] : game.entries;

const yearOf = (e: LeaderboardsProfileEntry) =>
    e.runDate ? e.runDate.slice(0, 4) : '';

/** Whether one run of `game` passes the filter, search included. */
export function matchesEntry(
    game: LeaderboardsProfileGame,
    e: LeaderboardsProfileEntry,
    f: RunsFilter,
): boolean {
    const needle = needleOf(f);
    if (
        needle &&
        !game.game.toLowerCase().includes(needle) &&
        !e.category.toLowerCase().includes(needle) &&
        !(e.level ?? '').toLowerCase().includes(needle)
    ) {
        return false;
    }
    if (f.show === 'podium' && !(e.rank !== null && e.rank <= 3)) return false;
    if (f.show === 'verified' && e.status !== 'verified') return false;
    if (f.show === 'pending' && e.status !== 'pending') return false;
    if (f.video && !e.vodUrl) return false;
    if (f.scope === 'full' && e.level !== null) return false;
    if (f.scope === 'levels' && e.level === null) return false;
    if (f.platform && e.platform !== f.platform) return false;
    if (f.since && (yearOf(e) === '' || yearOf(e) < f.since)) return false;
    return true;
}

/** Platforms across every run, only worth offering when there are two or more. */
export function platformOptions(games: LeaderboardsProfileGame[]): string[] {
    const all = new Set<string>();
    for (const g of games) {
        for (const e of [...g.entries, ...g.archived]) {
            if (e.platform) all.add(e.platform);
        }
    }
    return all.size > 1 ? [...all].sort((a, b) => a.localeCompare(b)) : [];
}

/** The years runs were done in, newest first. */
export function yearOptions(games: LeaderboardsProfileGame[]): string[] {
    const all = new Set<string>();
    for (const g of games) {
        for (const e of [...g.entries, ...g.archived]) {
            const y = yearOf(e);
            if (/^\d{4}$/.test(y)) all.add(y);
        }
    }
    return [...all].sort().reverse();
}

/** The active filters as removable pills: what each clears, and its label. */
export function activeFilters(
    f: RunsFilter,
): { clear: Partial<RunsFilter>; label: string }[] {
    const pills: { clear: Partial<RunsFilter>; label: string }[] = [];
    const search = f.search.trim();
    if (search) pills.push({ clear: { search: '' }, label: `“${search}”` });
    if (f.show !== 'all') {
        pills.push({
            clear: { show: 'all' },
            label: SEGMENTS.find((s) => s.id === f.show)?.label ?? f.show,
        });
    }
    if (f.video) pills.push({ clear: { video: false }, label: 'Has video' });
    if (f.platform) pills.push({ clear: { platform: '' }, label: f.platform });
    if (f.since)
        pills.push({ clear: { since: '' }, label: `Since ${f.since}` });
    if (f.archived) {
        pills.push({ clear: { archived: false }, label: 'Archived boards' });
    }
    return pills;
}
