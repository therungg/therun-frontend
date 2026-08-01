// Plain module (no 'use client'): the Recent PBs panel renders as a server
// component on the overview view, so it can't call helpers out of
// ~src/components/util/datetime (a client file).

/** Compact improvement amount: "12.3s", "1:04", "1:02:44". */
export function formatImprovement(ms: number): string {
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = String(totalSeconds % 60).padStart(2, '0');
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
