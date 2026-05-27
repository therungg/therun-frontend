import type {
    FlagSeverity,
    ManualTimeRow,
    ModReportRow,
    QueueItem,
} from '../../../../../../../types/moderation.types';

export type AttentionSource = 'flag' | 'report' | 'appeal' | 'self_claim';

export interface AttentionItem {
    key: string;
    sources: AttentionSource[]; // one row may carry several
    severity: FlagSeverity; // max across sources
    createdAt: string; // earliest across sources (oldest wins for "deal with first")
    // run identity (null for a pure manual-time self-claim):
    runId: number | null;
    manualTimeId: number | null;
    runnerName: string;
    userId: number | null;
    categoryId: number | null;
    categoryName: string;
    subcategoryKey: string;
    timeMs: number;
    gameTimeMs: number | null;
    vodUrl: string | null;
    verificationStatus: string | null;
    note: string | null; // report/appeal reason, or a short flag detail
}

const SEV_RANK: Record<FlagSeverity, number> = { high: 3, medium: 2, low: 1 };
export function maxSeverity(a: FlagSeverity, b: FlagSeverity): FlagSeverity {
    return SEV_RANK[a] >= SEV_RANK[b] ? a : b;
}

/** Map a queue flag reason to a coarse source bucket. */
function sourceForFlag(reason: string): AttentionSource {
    if (reason === 'reported') return 'report';
    if (reason === 'appeal') return 'appeal';
    if (reason === 'pending_self_claim') return 'self_claim';
    return 'flag';
}

export interface CategoryNameLookup {
    (categoryId: number): string;
}

/**
 * Merge the three backend streams into one prioritized list.
 * Dedupe by runId (a run flagged + reported = one row, both sources).
 * Manual-time self-claims (no runId) key by manualTimeId and never dedupe vs runs.
 * Sort: severity desc, then createdAt asc (oldest first within a severity).
 */
export function mergeAttention(
    queue: QueueItem[],
    reports: ModReportRow[],
    pendingClaims: ManualTimeRow[],
    categoryName: CategoryNameLookup,
): AttentionItem[] {
    const byRun = new Map<number, AttentionItem>();
    const standalone: AttentionItem[] = [];

    const fold = (runId: number | null, next: AttentionItem) => {
        if (runId == null) {
            standalone.push(next);
            return;
        }
        const prev = byRun.get(runId);
        if (!prev) {
            byRun.set(runId, next);
            return;
        }
        prev.sources = Array.from(new Set([...prev.sources, ...next.sources]));
        prev.severity = maxSeverity(prev.severity, next.severity);
        if (next.createdAt < prev.createdAt) prev.createdAt = next.createdAt;
        // Prefer a human-written reason (report/appeal) over a machine flag
        // detail, so the moderator sees why a person flagged the run.
        const nextIsHuman =
            next.sources.includes('report') || next.sources.includes('appeal');
        prev.note = nextIsHuman
            ? (next.note ?? prev.note)
            : (prev.note ?? next.note);
        prev.vodUrl = prev.vodUrl ?? next.vodUrl;
    };

    for (const q of queue) {
        const src = sourceForFlag(String(q.reason));
        fold(q.run.runId, {
            key: `run:${q.run.runId}`,
            sources: [src],
            severity: q.severity,
            createdAt: q.createdAt,
            runId: q.run.runId,
            manualTimeId: null,
            runnerName: q.run.runnerName,
            userId: q.run.userId,
            categoryId: q.run.categoryId,
            categoryName: q.run.categoryName,
            subcategoryKey: q.run.subcategoryKey,
            timeMs: q.run.timeMs,
            gameTimeMs: q.run.gameTimeMs,
            vodUrl: q.run.vodUrl,
            verificationStatus: q.run.verificationStatus,
            note: q.reason === 'reported' ? null : shortDetail(q.details),
        });
    }
    for (const r of reports) {
        fold(r.runId, {
            key: `run:${r.runId}`,
            sources: ['report'],
            severity: 'medium',
            createdAt: r.createdAt,
            runId: r.runId,
            manualTimeId: null,
            runnerName: r.runnerName,
            userId: r.runnerUserId,
            categoryId: r.categoryId,
            categoryName: categoryName(r.categoryId),
            subcategoryKey: r.subcategoryKey,
            timeMs: r.timeMs,
            gameTimeMs: null,
            vodUrl: null,
            verificationStatus: null,
            note: r.reason,
        });
    }
    for (const m of pendingClaims) {
        // self-claims = source 'self'; mod-added pendings aren't a triage item.
        if (m.source !== 'self') continue;
        standalone.push({
            key: `mt:${m.id}`,
            sources: ['self_claim'],
            severity: 'low',
            createdAt: m.createdAt,
            runId: null,
            manualTimeId: m.id,
            runnerName: m.runnerName,
            userId: m.userId,
            categoryId: m.categoryId,
            categoryName: categoryName(m.categoryId),
            subcategoryKey: m.subcategoryKey,
            timeMs: m.timeMs,
            gameTimeMs: null,
            vodUrl: m.evidenceUrl,
            verificationStatus: m.verificationStatus,
            note: m.reason || null,
        });
    }

    const all = [...byRun.values(), ...standalone];
    all.sort(
        (a, b) =>
            SEV_RANK[b.severity] - SEV_RANK[a.severity] ||
            a.createdAt.localeCompare(b.createdAt),
    );
    return all;
}

function shortDetail(details: Record<string, unknown>): string | null {
    const entries = Object.entries(details ?? {});
    if (entries.length === 0) return null;
    return entries
        .slice(0, 2)
        .map(
            ([k, v]) =>
                `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`,
        )
        .join(' · ');
}

/** Group consecutive items by non-null userId for the "this runner has many" case. */
export interface RunnerGroup {
    userId: number | null;
    runnerName: string;
    items: AttentionItem[];
}
export function groupByRunner(items: AttentionItem[]): RunnerGroup[] {
    const groups = new Map<string, RunnerGroup>();
    const order: string[] = [];
    for (const it of items) {
        const gkey = it.userId != null ? `u:${it.userId}` : `g:${it.key}`;
        let g = groups.get(gkey);
        if (!g) {
            g = { userId: it.userId, runnerName: it.runnerName, items: [] };
            groups.set(gkey, g);
            order.push(gkey);
        }
        g.items.push(it);
    }
    // Preserve priority order: a group's position = its first (highest-priority) item.
    return order.map((k) => groups.get(k) as RunnerGroup);
}
