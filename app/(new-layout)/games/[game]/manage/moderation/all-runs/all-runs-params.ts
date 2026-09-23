import type {
    AllRunsApiQuery,
    AllRunsPosition,
    AllRunsSource,
    AllRunsVerification,
} from '../../../../../../../types/all-runs.types';

export type AllRunsSort = 'arrived' | 'date' | 'time' | 'runner' | 'category';
export type Arrived = '24h' | '7d' | '30d';

export interface AllRunsQuery {
    position: AllRunsPosition[];
    verification: AllRunsVerification[];
    heldReason: string[];
    categoryId: number | null;
    /** nameNormalized -> picked values ('' = not set). Only with a category. */
    vars: Record<string, string[]>;
    runner: string;
    video: 'has' | 'missing' | null;
    source: AllRunsSource[];
    fasterThan: number | null;
    slowerThan: number | null;
    arrived: Arrived | null;
    sort: AllRunsSort;
    dir: 'asc' | 'desc';
    page: number;
}

const POSITIONS: AllRunsPosition[] = ['board', 'beaten', 'held', 'rejected'];
const VERIFICATIONS: AllRunsVerification[] = ['pending', 'verified'];
const SOURCES: AllRunsSource[] = ['livesplit', 'manual', 'import'];
const SORTS: AllRunsSort[] = ['arrived', 'date', 'time', 'runner', 'category'];

const blank = (): AllRunsQuery => ({
    position: [],
    verification: [],
    heldReason: [],
    categoryId: null,
    vars: {},
    runner: '',
    video: null,
    source: [],
    fasterThan: null,
    slowerThan: null,
    arrived: null,
    sort: 'arrived',
    dir: 'desc',
    page: 1,
});

export type ViewId = 'recent' | 'pending' | 'needs-video' | 'held' | 'rejected';

export const VIEWS: Array<{
    id: ViewId;
    label: string;
    query: Partial<AllRunsQuery>;
}> = [
    { id: 'recent', label: 'Recent', query: { position: ['board', 'beaten'] } },
    {
        id: 'pending',
        label: 'Pending on board',
        query: { position: ['board'], verification: ['pending'], dir: 'asc' },
    },
    {
        id: 'needs-video',
        label: 'Needs video',
        query: { position: ['held'], heldReason: ['missing_video'] },
    },
    { id: 'held', label: 'Held back', query: { position: ['held'] } },
    { id: 'rejected', label: 'Rejected', query: { position: ['rejected'] } },
];

export const viewQuery = (id: ViewId): AllRunsQuery => ({
    ...blank(),
    ...VIEWS.find((v) => v.id === id)?.query,
});

const csv = (v: string | null) => (v == null || v === '' ? [] : v.split(','));
const num = (v: string | null) => {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

/** No filter params at all = the Recent view, so the bare pane URL is useful. */
export function parseQuery(sp: URLSearchParams): AllRunsQuery {
    const touched = [...sp.keys()].some((k) => k !== 'pane');
    if (!touched) return viewQuery('recent');
    const vars: Record<string, string[]> = {};
    for (const [k, v] of sp.entries()) {
        if (k.startsWith('v.')) vars[k.slice(2)] = v.split(',');
    }
    const sort = sp.get('sort') as AllRunsSort | null;
    return {
        position: csv(sp.get('pos')).filter((p): p is AllRunsPosition =>
            POSITIONS.includes(p as AllRunsPosition),
        ),
        verification: csv(sp.get('ver')).filter((p): p is AllRunsVerification =>
            VERIFICATIONS.includes(p as AllRunsVerification),
        ),
        heldReason: csv(sp.get('reason')),
        categoryId: num(sp.get('cat')),
        vars: num(sp.get('cat')) == null ? {} : vars,
        runner: sp.get('runner') ?? '',
        video:
            sp.get('video') === 'has' || sp.get('video') === 'missing'
                ? (sp.get('video') as 'has' | 'missing')
                : null,
        source: csv(sp.get('source')).filter((s): s is AllRunsSource =>
            SOURCES.includes(s as AllRunsSource),
        ),
        fasterThan: num(sp.get('faster')),
        slowerThan: num(sp.get('slower')),
        arrived:
            (['24h', '7d', '30d'] as const).find(
                (a) => a === sp.get('arrived'),
            ) ?? null,
        sort: sort && SORTS.includes(sort) ? sort : 'arrived',
        dir: sp.get('dir') === 'asc' ? 'asc' : 'desc',
        page: Math.max(1, num(sp.get('page')) ?? 1),
    };
}

/** URL form. Always non-empty (pos is written even when empty as `pos=`),
 *  so an explicitly cleared filter set doesn't read back as the Recent view. */
export function toSearch(q: AllRunsQuery): string {
    const sp = new URLSearchParams();
    sp.set('pane', 'all-runs');
    sp.set('pos', q.position.join(','));
    if (q.verification.length) sp.set('ver', q.verification.join(','));
    if (q.heldReason.length) sp.set('reason', q.heldReason.join(','));
    if (q.categoryId != null) {
        sp.set('cat', String(q.categoryId));
        for (const [k, vs] of Object.entries(q.vars)) {
            if (vs.length) sp.set(`v.${k}`, vs.join(','));
        }
        if (q.fasterThan != null) sp.set('faster', String(q.fasterThan));
        if (q.slowerThan != null) sp.set('slower', String(q.slowerThan));
    }
    if (q.runner.trim()) sp.set('runner', q.runner.trim());
    if (q.video) sp.set('video', q.video);
    if (q.source.length) sp.set('source', q.source.join(','));
    if (q.arrived) sp.set('arrived', q.arrived);
    if (q.sort !== 'arrived') sp.set('sort', q.sort);
    if (q.dir !== 'desc') sp.set('dir', q.dir);
    if (q.page > 1) sp.set('page', String(q.page));
    return sp.toString();
}

export function toCountsApi(q: AllRunsQuery): AllRunsApiQuery {
    const out: AllRunsApiQuery = {
        position: q.position.join(',') || undefined,
        verification: q.verification.join(',') || undefined,
        heldReason: q.heldReason.join(',') || undefined,
        categoryId: q.categoryId ?? undefined,
        runner: q.runner.trim() || undefined,
        video: q.video ?? undefined,
        source: q.source.join(',') || undefined,
        arrivedWithin: q.arrived ?? undefined,
    };
    if (q.categoryId != null) {
        for (const [k, vs] of Object.entries(q.vars)) {
            // join keeps '' so "not set" survives; a lone '' becomes ',' so
            // buildUrl doesn't drop it. An empty pick sends nothing.
            if (vs.length) out[`var.${k}`] = vs.join(',') || ',';
        }
        out.fasterThan = q.fasterThan ?? undefined;
        out.slowerThan = q.slowerThan ?? undefined;
    }
    return out;
}

export function toApi(q: AllRunsQuery): AllRunsApiQuery {
    return {
        ...toCountsApi(q),
        sort: q.sort,
        dir: q.dir,
        page: q.page,
        pageSize: 50,
    };
}

/** The view whose preset the query matches exactly (page ignored). */
export function activeView(q: AllRunsQuery): ViewId | null {
    const key = toSearch({ ...q, page: 1 });
    return VIEWS.find((v) => toSearch(viewQuery(v.id)) === key)?.id ?? null;
}
