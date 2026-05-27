import { timeToMillis } from '~src/components/util/datetime';

// Shared h:mm:ss(.SSS) parse/format idiom for moderation time inputs.
// Used by the plain-language Standards panel.

/** Format milliseconds into an `h:mm:ss.SSS` / `m:ss(.SSS)` input string. */
export function msToInput(ms: number | null): string {
    if (ms === null) return '';
    const totalMs = Math.max(0, Math.round(ms));
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const millis = totalMs % 1000;
    const pad = (n: number, w: number) => String(n).padStart(w, '0');
    const base =
        hours > 0
            ? `${hours}:${pad(minutes, 2)}:${pad(seconds, 2)}`
            : `${pad(minutes, 2)}:${pad(seconds, 2)}`;
    return millis === 0 ? base : `${base}.${pad(millis, 3)}`;
}

/**
 * Parse an `h:mm:ss(.SSS)` input string into milliseconds.
 * Returns `null` for empty input, `NaN` for invalid/non-positive input.
 */
export function parseTime(s: string): number | null {
    const trimmed = s.trim();
    if (trimmed === '') return null;
    const ms = timeToMillis(trimmed);
    if (!Number.isFinite(ms) || ms <= 0) return Number.NaN;
    return ms;
}
