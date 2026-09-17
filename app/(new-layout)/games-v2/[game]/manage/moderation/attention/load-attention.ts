import { listManualTimes } from '~src/lib/moderation/manual-times';
import { listGameReports } from '~src/lib/moderation/reports';
import { listQueue } from '~src/lib/moderation/triage';
import {
    type AttentionItem,
    type CategoryNameLookup,
    degradedSourcesOf,
    mergeAttention,
    resolveSource,
} from './attention-model';

export interface AttentionData {
    items: AttentionItem[];
    /** Names of the inbox sources that failed — a non-empty list means
     * `items` is an undercount, which NeedsAttention says out loud. */
    degradedSources: string[];
}

/**
 * The console's inbox: flags, reports and self-claims merged into one list.
 *
 * The flags call (`/queue`) re-runs the same board-ranking query the mod
 * worklist does and can take tens of seconds on a big board, so the manage
 * page never awaits this — it hands the promise to the console and the
 * inbox streams in behind its own Suspense boundary.
 */
export async function loadAttention(
    sessionId: string,
    gameId: number,
    categoryName: CategoryNameLookup,
): Promise<AttentionData> {
    // Nobody awaits this promise on the server, so it must never reject —
    // a source that throws has to come back as a degraded source instead.
    const source = <T>(call: () => Promise<T>, name: string) =>
        resolveSource(Promise.resolve().then(call), name);

    const [queueRes, reportsRes, manualTimesRes] = await Promise.all([
        source(() => listQueue(sessionId, gameId, { limit: 200 }), 'flags'),
        source(() => listGameReports(sessionId, gameId), 'reports'),
        source(() => listManualTimes(sessionId, gameId), 'manual times'),
    ]);
    const degradedSources = degradedSourcesOf([
        queueRes,
        reportsRes,
        manualTimesRes,
    ]);
    const queueItems = queueRes.ok ? queueRes.data : [];
    const reports = reportsRes.ok ? reportsRes.data : [];
    const manualTimes = manualTimesRes.ok ? manualTimesRes.data : [];
    const pendingClaims = manualTimes.filter(
        (m) => m.verificationStatus === 'pending',
    );
    return {
        items: mergeAttention(queueItems, reports, pendingClaims, categoryName),
        degradedSources,
    };
}
