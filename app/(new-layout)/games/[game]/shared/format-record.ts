import type { MillisecondsMode } from '../../../../../types/leaderboards.types';

/**
 * A record time, rendered the way the board's own surfaces render one.
 *
 * Local rather than datetime.tsx's `getFormattedString`, which is a
 * 'use client' export and throws when a server component calls it. Unlike it,
 * the leading unit is never zero-padded: sub-hour records used to render
 * "06:56.070" next to "46:11.185"; a record reads "6:56.070", with interior
 * components still padded.
 */
export function formatRecord(
    duration: number | string,
    withMillis: boolean,
): string {
    const ms = Math.abs(Math.round(Number(duration)));
    if (!Number.isFinite(ms)) return '-';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    let out =
        hours > 0
            ? `${hours}:${pad(minutes)}:${pad(seconds)}`
            : `${minutes}:${pad(seconds)}`;
    if (withMillis) out += `.${String(ms % 1000).padStart(3, '0')}`;
    return out;
}

/**
 * The board's rule for a record's milliseconds: shown when the board always
 * shows them, dropped on a whole-second time (common on imported runs).
 *
 * A record stands on its own, with no list around it to find a tie in, so the
 * tie setting reads here the same way "never" does.
 */
export function recordShowsMillis(
    time: number | string | null | undefined,
    precision: MillisecondsMode,
): boolean {
    return precision === 'always' && Math.round(Number(time)) % 1000 !== 0;
}
