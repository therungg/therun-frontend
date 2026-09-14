const pad = (n: number) => n.toString().padStart(2, '0');

/** 4:21:33, 12:05, 0:42 — whole seconds, hours only when needed. */
export function formatDuration(ms: number | null): string {
    if (ms === null || !Number.isFinite(ms) || ms <= 0) return '—';
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Whole hours, grouped: "3,912 h". */
export function formatHours(ms: number): string {
    return `${Math.floor(ms / 3_600_000).toLocaleString('en-US')} h`;
}

export function formatCount(n: number): string {
    return n.toLocaleString('en-US');
}

/** "19:00–23:00" from local start and end hours (end may pass 24). */
export function formatHourWindow(startHour: number, endHour: number): string {
    return `${pad(startHour % 24)}:00–${pad(endHour % 24)}:00`;
}
