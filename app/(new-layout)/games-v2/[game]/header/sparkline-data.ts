import type { GameActivityPoint } from '~src/lib/game-activity';

/** Day-granular ISO date — stable cache keys per day. */
export function isoDaysAgo(days: number): string {
    return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Daily playtime series for the hero's sparkline cell, zero-filled: the
 * endpoint omits quiet days, and a sparkline that skips them would lie
 * about the rhythm. Returns [] when the window has no activity at all so
 * the cell can omit itself.
 */
export function toSparklineSeries(
    points: GameActivityPoint[],
    days: number,
): number[] {
    if (points.length === 0) return [];
    const by = new Map(points.map((p) => [p.date, p.playtime]));
    const end = new Date(new Date().toISOString().slice(0, 10));
    const out: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
        const key = new Date(end.getTime() - i * 86_400_000)
            .toISOString()
            .slice(0, 10);
        out.push(by.get(key) ?? 0);
    }
    return out.some((v) => v > 0) ? out : [];
}
