import { cacheLife, cacheTag } from 'next/cache';
import {
    degradedSourcesOf,
    mergeAttention,
    resolveSource,
} from '~app/(new-layout)/games-v2/[game]/manage/moderation/attention/attention-model';
import { listManualTimes } from './manual-times';
import { listGameReports } from './reports';
import { listQueue } from './triage';

export interface ModSummary {
    count: number;
    /** True when one or more of the three inbox sources failed to load —
     * `count` may be an undercount, not a confirmed total. */
    degraded: boolean;
}

/** mergeAttention only uses category names for display, never for the
 * dedup/count logic — a count-only caller has no use for the real names. */
const noCategoryName = (id: number) => String(id);

/**
 * Computes the same "needs attention" count as the console's own inbox
 * (mergeAttention over the three list endpoints), tolerating a failed
 * source rather than throwing. Shared, uncached primitive — reused by
 * `getCachedModSummary` (the cross-game hub) and `countAttentionAction`
 * (the console's live poll, which must never see stale data).
 */
export async function resolveModSummary(
    sessionId: string,
    gameId: number,
): Promise<ModSummary> {
    const [queueRes, reportsRes, manualTimesRes] = await Promise.all([
        resolveSource(listQueue(sessionId, gameId, { limit: 200 }), 'flags'),
        resolveSource(listGameReports(sessionId, gameId), 'reports'),
        resolveSource(listManualTimes(sessionId, gameId), 'manual times'),
    ]);
    const degraded =
        degradedSourcesOf([queueRes, reportsRes, manualTimesRes]).length > 0;
    const queueItems = queueRes.ok ? queueRes.data : [];
    const reports = reportsRes.ok ? reportsRes.data : [];
    const manualTimes = manualTimesRes.ok ? manualTimesRes.data : [];
    const pendingClaims = manualTimes.filter(
        (m) => m.verificationStatus === 'pending',
    );
    const count = mergeAttention(
        queueItems,
        reports,
        pendingClaims,
        noCategoryName,
    ).length;
    return { count, degraded };
}

/**
 * Cached per-game summary for the cross-game hub (`/games-v2/manage`) —
 * one row per moderated game, so the hub doesn't re-fan-out to the backend
 * on every render. Tagged per game slug so a future targeted
 * `revalidateTag('mod-summary:{slug}', 'minutes')` (e.g. after a triage
 * action) only busts that one row. Backend handoff W8 (a single summary
 * endpoint) would let this collapse to one call instead of three per game.
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
