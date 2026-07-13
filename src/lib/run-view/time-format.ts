// Human duration for titles/metadata. Sub-minute times keep milliseconds;
// longer times drop them (matches how boards read).
export function formatTimeMs(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const millis = ms % 1000;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
    if (m > 0) return `${m}:${pad(s)}`;
    return `0:${pad(s)}.${String(millis).padStart(3, '0')}`;
}
