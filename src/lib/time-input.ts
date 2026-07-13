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
