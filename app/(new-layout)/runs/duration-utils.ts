/**
 * Parse a user-entered duration string into total seconds.
 * Accepts: "1:30:00" (h:mm:ss), "1:30" (m:ss), "90:00" (m:ss), "5400" (seconds).
 * Returns null if invalid.
 */
export function parseDuration(input: string): number | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Pure number → treat as seconds
    if (/^\d+$/.test(trimmed)) {
        return parseInt(trimmed, 10);
    }

    const parts = trimmed.split(':').map((p) => parseInt(p, 10));
    if (parts.some((p) => isNaN(p) || p < 0)) return null;

    if (parts.length === 3) {
        // h:mm:ss
        const [h, m, s] = parts;
        if (m >= 60 || s >= 60) return null;
        return h * 3600 + m * 60 + s;
    }

    if (parts.length === 2) {
        const [a, b] = parts;
        if (b >= 60) return null;
        // Always treat 2-part as m:ss — users enter h:mm:ss for hours
        return a * 60 + b;
    }

    return null;
}

/**
 * Format total seconds to h:mm:ss display string.
 * Omits hours if zero: "5:30" for 330 seconds, "1:05:30" for 3930 seconds.
 */
export function formatDurationFromSeconds(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    if (h > 0) {
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
}
