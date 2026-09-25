import type { AllRunsSource } from '../../../../../../../types/all-runs.types';
import type {
    QueueRan,
    QueueReason,
    WorklistFilter,
    WorklistSort,
} from '../../../../../../../types/worklist.types';

export interface QueueQuery {
    categoryIds: number[];
    /** nameNormalized -> picked values ('' = not set). Only with a category. */
    vars: Record<string, string[]>;
    maxRank: 1 | 3 | 10 | null;
    ran: QueueRan | null;
    video: 'has' | 'missing' | null;
    source: AllRunsSource[];
    reason: QueueReason[];
    newRunner: boolean;
    runner: string;
    sort: WorklistSort;
    page: number;
}

const RANKS = [1, 3, 10] as const;
const RANS: QueueRan[] = ['7d', '30d', '90d', 'older30d'];
const REASONS: QueueReason[] = [
    'reported',
    'appeal',
    'claim',
    'missing_video',
    'checks',
    'pending',
];
const SOURCES: AllRunsSource[] = ['livesplit', 'manual', 'import'];
const SORTS: WorklistSort[] = [
    'priority',
    'placing',
    'newest',
    'oldest',
    'improvement',
    'time',
];

export const QUEUE_SORTS: Array<{ value: WorklistSort; label: string }> = [
    { value: 'priority', label: 'Priority' },
    { value: 'placing', label: 'Best placing' },
    { value: 'newest', label: 'Newest run' },
    { value: 'oldest', label: 'Longest waiting' },
    { value: 'improvement', label: 'Biggest improvement' },
    { value: 'time', label: 'Fastest time' },
];

export function blankQueueQuery(): QueueQuery {
    return {
        categoryIds: [],
        vars: {},
        maxRank: null,
        ran: null,
        video: null,
        source: [],
        reason: [],
        newRunner: false,
        runner: '',
        sort: 'priority',
        page: 1,
    };
}

const csv = (v: string | null) => (v == null || v === '' ? [] : v.split(','));
const num = (v: string | null) => {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

interface QueryParamsLike {
    get(key: string): string | null;
    entries(): IterableIterator<[string, string]>;
}

/** Accepts both URLSearchParams and Next's ReadonlyURLSearchParams. */
export function parseQueueQuery(sp: QueryParamsLike): QueueQuery {
    const vars: Record<string, string[]> = {};
    for (const [k, v] of sp.entries()) {
        if (k.startsWith('v.')) vars[k.slice(2)] = v.split(',');
    }
    const catIds = [
        ...new Set(
            csv(sp.get('cat'))
                .map(Number)
                .filter((n) => Number.isInteger(n) && n > 0),
        ),
    ];
    const rank = num(sp.get('rank'));
    const ran = sp.get('ran') as QueueRan | null;
    const video = sp.get('video');
    const sort = sp.get('sort') as WorklistSort | null;
    return {
        categoryIds: catIds,
        vars: catIds.length === 1 ? vars : {},
        maxRank: RANKS.includes(rank as 1 | 3 | 10)
            ? (rank as 1 | 3 | 10)
            : null,
        ran: ran && RANS.includes(ran) ? ran : null,
        video: video === 'has' || video === 'missing' ? video : null,
        source: csv(sp.get('source')).filter((s): s is AllRunsSource =>
            SOURCES.includes(s as AllRunsSource),
        ),
        reason: csv(sp.get('reason')).filter((r): r is QueueReason =>
            REASONS.includes(r as QueueReason),
        ),
        newRunner: sp.get('new') === '1',
        runner: sp.get('runner') ?? '',
        sort: sort && SORTS.includes(sort) ? sort : 'priority',
        page: Math.max(1, num(sp.get('page')) ?? 1),
    };
}

const QUEUE_KEYS = [
    'cat',
    'rank',
    'ran',
    'video',
    'source',
    'reason',
    'new',
    'runner',
    'sort',
    'page',
];

/** Rewrites only the queue's own params: pane and the open review (?run= / ?manual=) stay. */
export function writeQueueQuery(q: QueueQuery): void {
    const url = new URL(window.location.href);
    for (const k of [...url.searchParams.keys()]) {
        if (QUEUE_KEYS.includes(k) || k.startsWith('v.'))
            url.searchParams.delete(k);
    }
    const sp = url.searchParams;
    if (q.categoryIds.length) sp.set('cat', q.categoryIds.join(','));
    if (oneQueueCategory(q) != null) {
        for (const [k, vs] of Object.entries(q.vars)) {
            if (vs.length) sp.set(`v.${k}`, vs.join(','));
        }
    }
    if (q.maxRank) sp.set('rank', String(q.maxRank));
    if (q.ran) sp.set('ran', q.ran);
    if (q.video) sp.set('video', q.video);
    if (q.source.length) sp.set('source', q.source.join(','));
    if (q.reason.length) sp.set('reason', q.reason.join(','));
    if (q.newRunner) sp.set('new', '1');
    if (q.runner.trim()) sp.set('runner', q.runner.trim());
    if (q.sort !== 'priority') sp.set('sort', q.sort);
    if (q.page > 1) sp.set('page', String(q.page));
    window.history.replaceState(null, '', url.toString());
}

export function toWorklistFilter(
    q: QueueQuery,
    page: number,
    pageSize: number,
): WorklistFilter {
    return {
        categoryIds: q.categoryIds.length ? q.categoryIds : undefined,
        vars: oneQueueCategory(q) != null ? q.vars : undefined,
        maxRank: q.maxRank ?? undefined,
        ran: q.ran ?? undefined,
        video: q.video ?? undefined,
        source: q.source.length ? q.source : undefined,
        reason: q.reason.length ? q.reason : undefined,
        newRunner: q.newRunner || undefined,
        runner: q.runner.trim() || undefined,
        sort: q.sort,
        page,
        pageSize,
    };
}

/** The one picked board, or null when none or several are picked. Variables
 *  need exactly one. */
export function oneQueueCategory(q: QueueQuery): number | null {
    return q.categoryIds.length === 1 ? q.categoryIds[0] : null;
}

/** The query with these boards picked. When that changes which single board
 *  is picked, its variable filters go with it. */
export function withCategories(q: QueueQuery, ids: number[]): QueueQuery {
    const next = { ...q, categoryIds: [...new Set(ids)], page: 1 };
    if (oneQueueCategory(next) === oneQueueCategory(q)) return next;
    return { ...next, vars: {} };
}

/** True when any filter other than sort/page is active. */
export function hasQueueFilters(q: QueueQuery): boolean {
    return (
        q.categoryIds.length > 0 ||
        Object.values(q.vars).some((vs) => vs.length > 0) ||
        q.maxRank != null ||
        q.ran != null ||
        q.video != null ||
        q.source.length > 0 ||
        q.reason.length > 0 ||
        q.newRunner ||
        q.runner.trim().length > 0
    );
}
