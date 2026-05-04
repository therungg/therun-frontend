export const formatDelta = (
    deltaMs: number | null | undefined,
): { text: string; tone: 'ahead' | 'behind' | 'neutral' } => {
    if (deltaMs == null || Number.isNaN(deltaMs)) {
        return { text: '—', tone: 'neutral' };
    }
    const sign = deltaMs < 0 ? '-' : '+';
    const abs = Math.abs(deltaMs);
    const totalSeconds = abs / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const tenths = Math.floor((totalSeconds * 10) % 10);
    const body =
        minutes > 0
            ? `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`
            : `${seconds}.${tenths}`;
    const tone = deltaMs < 0 ? 'ahead' : deltaMs > 0 ? 'behind' : 'neutral';
    return { text: `${sign}${body}`, tone };
};

export const formatPercent = (n: number | null | undefined): string => {
    if (n == null || Number.isNaN(n)) return '—';
    return `${Math.round(n * 100)}%`;
};

export const formatTimeMs = (ms: number | null | undefined): string => {
    if (ms == null || Number.isNaN(ms) || ms <= 0) return '—';
    const totalSeconds = ms / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
