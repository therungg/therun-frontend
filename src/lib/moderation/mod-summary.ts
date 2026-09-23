import { cacheLife, cacheTag } from 'next/cache';
import { getWorklist } from './worklist';

export interface ModSummary {
    count: number;
    /** True when the queue could not be read — `count` is then 0, not a
     * confirmed total. */
    degraded: boolean;
}

/**
 * The queue's "needs you" count for one game — the same number as the
 * console's Queue badge. Tolerates a failed call rather than throwing.
 */
export async function resolveModSummary(
    sessionId: string,
    gameId: number,
): Promise<ModSummary> {
    try {
        const page = await getWorklist(sessionId, gameId, { pageSize: 1 });
        return { count: page.counts.needsYou, degraded: false };
    } catch {
        return { count: 0, degraded: true };
    }
}

/**
 * Cached per-game summary for the cross-game hub (`/games/manage`) —
 * one row per moderated game, so the hub doesn't re-fan-out to the backend
 * on every render. Tagged per game slug so a targeted
 * `revalidateTag('mod-summary:{slug}', 'minutes')` only busts that one row.
 */
export async function getCachedModSummary(
    sessionId: string,
    gameId: number,
    gameSlug: string,
): Promise<ModSummary> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`mod-summary:${gameSlug}`);
    return resolveModSummary(sessionId, gameId);
}
