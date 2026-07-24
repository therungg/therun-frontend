// Parses presenter-entered target times. Convention: '95' = minutes,
// '12:30' = mm:ss, '1:40:00' = h:mm:ss. A trailing '.d+' (as produced by
// formatTimeMs round-trips) is tolerated and truncated.
export const parseTimeInput = (raw: string): number | undefined => {
    const trimmed = raw.trim().replace(/\.\d+$/, '');
    if (!trimmed || !/^\d+(:\d+)*$/.test(trimmed)) return undefined;
    const parts = trimmed.split(':').map(Number);
    if (parts.some((n) => Number.isNaN(n) || n < 0)) return undefined;
    if (parts.length === 1) return parts[0] * 60_000;
    if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
    if (parts.length === 3) {
        return ((parts[0] * 60 + parts[1]) * 60 + parts[2]) * 1000;
    }
    return undefined;
};

/** h:mm:ss / m:ss form of a duration, round-trippable through parseTimeInput. */
export const formatTimeInput = (ms: number): string => {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${m}:${String(s).padStart(2, '0')}`;
};
