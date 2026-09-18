import { formatSubcategoryKey } from '~app/(new-layout)/games-v2/[game]/labels';
import {
    buildBoardHref,
    buildManualTimeHref,
    buildRunHref,
} from '~src/lib/board-url';
import { safeEncodeURI } from '~src/utils/uri';
import type {
    LeaderboardsProfileEntry,
    ProfileProvenance,
} from '../../../../types/leaderboards-profile.types';

/**
 * The game ref run and board links carry: `gameName` (`games.name`). Older
 * payloads lack it and `gameSlug` is empty for most games; the routes resolve
 * the display name just as well.
 */
export const gameRefOf = (game: {
    gameName?: string;
    gameSlug?: string;
    game: string;
}) => game.gameName || game.gameSlug || game.game;

/**
 * Where a game on the profile links: its board when this viewer can open
 * boards, else its stats page.
 */
export function profileGameHref(
    game: { gameName?: string; gameSlug?: string; game: string },
    boardsVisible: boolean,
): string {
    return boardsVisible
        ? buildBoardHref(gameRefOf(game))
        : `/games/${safeEncodeURI(game.game)}`;
}

/**
 * The board an entry sits on, for its category name. Null when this viewer
 * can't open boards or the payload doesn't name the category.
 */
export function profileBoardHref(
    gameRef: string | null,
    entry: { categorySlug?: string | null; subcategoryKey?: string | null },
    boardsVisible: boolean,
): string | null {
    if (!boardsVisible || !gameRef || !entry.categorySlug) return null;
    return buildBoardHref(gameRef, {
        categorySlug: entry.categorySlug,
        subcategoryKey: entry.subcategoryKey,
    });
}

/** The entry's own page: the run, or the manual time. Null without an id. */
export function entryHref(
    gameRef: string,
    entry: Pick<LeaderboardsProfileEntry, 'kind' | 'runId' | 'manualTimeId'>,
): string | null {
    if (entry.kind === 'run' && entry.runId !== null) {
        return buildRunHref(gameRef, entry.runId);
    }
    if (entry.kind === 'manual' && entry.manualTimeId !== null) {
        return buildManualTimeHref(gameRef, entry.manualTimeId);
    }
    return null;
}

export const plural = (count: number, one: string, many: string) =>
    count === 1 ? one : many;

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

/** Where a run came from, as a row label; empty when unknown. */
export function sourceLabel(p: ProfileProvenance): string {
    switch (p) {
        case 'live':
            return 'Live on therun';
        case 'submitted':
            return 'Submitted';
        case 'mod':
            return 'Added by a mod';
        case 'self':
            return 'Added by runner';
        case 'splits':
            return 'Splits';
        case 'imported':
            return 'Imported';
        default:
            return '';
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
    entry: SubcategoryNamed,
    separator = ' · ',
): string {
    return entrySubcategoryLabels(entry).join(separator);
}

/** What a subcategory label needs: the key, and the names that may already say it. */
export interface SubcategoryNamed {
    subcategoryKey: string;
    category: string;
    level?: string | null;
}

/** The same labels, one per value, for surfaces that tag them individually. */
export function entrySubcategoryLabels(entry: SubcategoryNamed): string[] {
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
    return labels;
}
