import { timeToMillis } from '~src/components/util/datetime';

/** Format ms as h:mm:ss(.SSS) for a time input. Empty string for null. */
export function msToTimeInput(ms: number | null | undefined): string {
    if (ms == null) return '';
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
 * Parse a h:mm:ss(.SSS) / m:ss string to ms.
 * Returns `null` for empty input and `NaN` for an invalid/non-positive value.
 */
export function parseTimeInput(s: string): number | null {
    const trimmed = s.trim();
    if (trimmed === '') return null;
    const ms = timeToMillis(trimmed);
    if (!Number.isFinite(ms) || ms <= 0) return Number.NaN;
    return ms;
}
