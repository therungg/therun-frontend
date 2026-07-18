import type {
    FlagSeverity,
    ManualTimeRow,
    ModReportRow,
    QueueItem,
} from '../../../../../../../types/moderation.types';

export type AttentionSource = 'flag' | 'report' | 'appeal' | 'self_claim';

const ATTENTION_SOURCES: readonly AttentionSource[] = [
    'flag',
    'report',
    'appeal',
    'self_claim',
];

/**
 * Parse a `?kind=` query value (e.g. from the sidebar's Reports shortcut,
 * `?pane=attention&kind=report`) into a valid attention-source filter, or
 * `null` if absent/unrecognized. Pure so the URL-driven pre-filter on
 * NeedsAttention is trivially testable.
 */
export function parseKindFilter(raw: string | null): AttentionSource | null {
    if (raw && (ATTENTION_SOURCES as readonly string[]).includes(raw)) {
        return raw as AttentionSource;
    }
    return null;
}

export interface SourceOk<T> {
    ok: true;
    data: T;
}
export interface SourceFail {
    ok: false;
    source: string;
}
export type SourceResult<T> = SourceOk<T> | SourceFail;

/**
 * Wrap a best-effort inbox fetch so a backend failure is visible instead
 * of silently swallowed: resolves `{ ok: true, data }` on success or
 * `{ ok: false, source }` on rejection. Callers collect the `source`
 * names into `degradedSources` so a moderator can tell "no work" from
 * "backend down" — see NeedsAttention.
 */
export function resolveSource<T>(
    promise: Promise<T>,
    source: string,
): Promise<SourceResult<T>> {
    return promise.then(
        (data): SourceResult<T> => ({ ok: true, data }),
        (): SourceResult<T> => ({ ok: false, source }),
    );
}

/** Extract the failed `source` names from a list of resolved results. */
export function degradedSourcesOf(
    results: Array<SourceResult<unknown>>,
): string[] {
    return results.filter((r) => !r.ok).map((r) => (r as SourceFail).source);
}

/**
 * Join degraded source names for the warning copy:
 * "flags" / "flags and reports" / "flags, reports, and manual times".
 */
export function formatSourceList(sources: string[]): string {
    if (sources.length <= 1) return sources[0] ?? '';
    if (sources.length === 2) return `${sources[0]} and ${sources[1]}`;
    const head = sources.slice(0, -1).join(', ');
    return `${head}, and ${sources[sources.length - 1]}`;
}

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

/**
 * Group consecutive items by non-null userId for the "this runner has many" case.
 *
 * Task 18 looked for runner-trust context (verified-run count, prior
 * rejections, account age) to render on the group header, e.g.
 * "3 verified runs · first seen Mar 2026". None of the three upstream
 * payloads (QueueItem, ModReportRow, ManualTimeRow — see
 * types/moderation.types.ts) carry any such field, and fetching it per
 * group would be an N+1 call the brief explicitly rules out. So the group
 * header renders no trust line today; see task-18-report-uxfixes.md for
 * the exact fields requested from backend (verifiedCount, rejectedCount,
 * accountCreatedAt).
 */
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
