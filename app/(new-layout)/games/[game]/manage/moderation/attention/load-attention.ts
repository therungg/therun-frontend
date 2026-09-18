import { listManualTimes } from '~src/lib/moderation/manual-times';
import { listGameReports } from '~src/lib/moderation/reports';
import { listQueue } from '~src/lib/moderation/triage';
import type {
    ManualTimeRow,
    ModReportRow,
    QueueItem,
} from '../../../../../../../types/moderation.types';
import {
    type AttentionItem,
    type CategoryNameLookup,
    mergeAttention,
    resolveSource,
} from './attention-model';

export interface AttentionData {
    items: AttentionItem[];
    /** Names of the inbox sources that failed — a non-empty list means
     * `items` is an undercount, which NeedsAttention says out loud. */
    degradedSources: string[];
}

const ALL_SOURCES = ['flags', 'reports', 'manual times'];

/** Nothing loaded, and the pane says so rather than claiming an empty queue. */
export const ATTENTION_UNAVAILABLE: AttentionData = {
    items: [],
    degradedSources: ALL_SOURCES,
};

/** A source that answered with something other than a list is no better than
 * one that failed — merging it would throw where nobody can catch it. */
function rows<T>(result: { ok: boolean; data?: unknown }): T[] | null {
    if (!result.ok) return null;
    return Array.isArray(result.data) ? (result.data as T[]) : null;
}

/**
 * The console's inbox: flags, reports and self-claims merged into one list.
 *
 * The flags call (`/queue`) re-runs the same board-ranking query the mod
 * worklist does and can take tens of seconds on a big board, so the manage
 * page never awaits this — it hands the promise to the console and the
 * inbox streams in behind its own Suspense boundary.
 */
export function loadAttention(
    sessionId: string,
    gameId: number,
    categoryName: CategoryNameLookup,
): Promise<AttentionData> {
    // Nobody awaits this on the server — it is handed to the console
    // unresolved — so the promise this returns must be un-rejectable from the
    // moment it is created. Not just the fetches: the merge below has to be
    // inside the guard too, and the guard has to be attached synchronously,
    // or a rejection in the gap becomes an unhandled server rejection (or
    // swaps the whole console for the route's error page).
    return merge(sessionId, gameId, categoryName).catch(
        () => ATTENTION_UNAVAILABLE,
    );
}

async function merge(
    sessionId: string,
    gameId: number,
    categoryName: CategoryNameLookup,
): Promise<AttentionData> {
    const source = <T>(call: () => Promise<T>, name: string) =>
        resolveSource(Promise.resolve().then(call), name);

    const [queueRes, reportsRes, manualTimesRes] = await Promise.all([
        source(() => listQueue(sessionId, gameId, { limit: 200 }), 'flags'),
        source(() => listGameReports(sessionId, gameId), 'reports'),
        source(() => listManualTimes(sessionId, gameId), 'manual times'),
    ]);
    const queueItems = rows<QueueItem>(queueRes);
    const reports = rows<ModReportRow>(reportsRes);
    const manualTimes = rows<ManualTimeRow>(manualTimesRes);
    // A source that answered with something other than a list is degraded
    // too, even though the call itself "succeeded" — `rows` already folded
    // that into a null, so one pass over the three covers both cases.
    const degradedSources = ALL_SOURCES.filter(
        (_name, i) => [queueItems, reports, manualTimes][i] === null,
    );
    const pendingClaims = (manualTimes ?? []).filter(
        (m) => m.verificationStatus === 'pending',
    );
    return {
        items: mergeAttention(
            queueItems ?? [],
            reports ?? [],
            pendingClaims,
            categoryName,
        ),
        degradedSources,
    };
}
