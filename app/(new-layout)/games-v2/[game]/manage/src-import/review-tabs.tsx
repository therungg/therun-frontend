'use client';

import { useEffect, useState } from 'react';
import { getFormattedString } from '~src/components/util/datetime';
import type {
    Paged,
    SrcImportCategory,
    SrcImportJob,
    SrcImportMatchKind,
    SrcImportPlayer,
    SrcImportRun,
    SrcImportRunPlayer,
    SrcImportVariable,
} from '../../../../../../types/src-import.types';
import { SegmentedControl } from '../shared/form-kit';
import styles from './src-import.module.scss';
import {
    type ActionResult,
    listSrcImportCategoriesAction,
    listSrcImportPlayersAction,
    listSrcImportRunsAction,
    listSrcImportVariablesAction,
} from './src-import-actions';

type Tab = 'categories' | 'variables' | 'players' | 'runs';
const TABS: Array<{ value: Tab; label: string }> = [
    { value: 'categories', label: 'Categories' },
    { value: 'variables', label: 'Subcategories & filters' },
    { value: 'players', label: 'Players' },
    { value: 'runs', label: 'Runs' },
];

export const PAGE_SIZE = 100;

interface Scope {
    gameId: number;
    gameSlug: string;
    jobId: number;
}

/**
 * The review half of the pane: what the worker staged, one tab per table.
 * Every tab loads on first open and re-fetches only when its filters change —
 * the job is `done`, so the data is fixed.
 */
export function ReviewTabs({
    gameId,
    gameSlug,
    job,
}: {
    gameId: number;
    gameSlug: string;
    job: SrcImportJob;
}) {
    const [tab, setTab] = useState<Tab>('categories');
    const scope: Scope = { gameId, gameSlug, jobId: job.id };
    // Categories are shared with the Runs tab's filter, so they live here.
    const categories = useLoad(
        () => listSrcImportCategoriesAction(scope),
        [job.id],
    );

    return (
        <section aria-label="Review staged data">
            <SegmentedControl
                label="Review"
                value={tab}
                options={TABS}
                onChange={(v) => setTab(v as Tab)}
            />
            <div style={{ marginTop: '0.75rem' }}>
                {tab === 'categories' && <CategoriesTab state={categories} />}
                {tab === 'variables' && (
                    <VariablesTab
                        scope={scope}
                        categories={categories.data ?? []}
                    />
                )}
                {tab === 'players' && <PlayersTab scope={scope} />}
                {tab === 'runs' && (
                    <RunsTab scope={scope} categories={categories.data ?? []} />
                )}
            </div>
        </section>
    );
}

// ---- Loading helper --------------------------------------------------------

interface LoadState<T> {
    data: T | null;
    error: string | null;
    loading: boolean;
}

function useLoad<T>(
    fetcher: () => Promise<ActionResult<T>>,
    deps: unknown[],
): LoadState<T> {
    const [state, setState] = useState<LoadState<T>>({
        data: null,
        error: null,
        loading: true,
    });
    useEffect(() => {
        let cancelled = false;
        setState((s) => ({ ...s, loading: true }));
        void fetcher().then((res) => {
            if (cancelled) return;
            if ('error' in res) {
                setState({ data: null, error: res.error, loading: false });
            } else {
                setState({ data: res.result, error: null, loading: false });
            }
        });
        return () => {
            cancelled = true;
        };
    }, deps);
    return state;
}

function Status<T>({
    state,
    empty,
    children,
}: {
    state: LoadState<T>;
    empty: string;
    children: (data: T) => React.ReactNode;
}) {
    if (state.loading && state.data === null) {
        return (
            <div className={styles.jobHead}>
                <span className={styles.spinner} aria-hidden />
                <span className={styles.muted}>Loading…</span>
            </div>
        );
    }
    if (state.error) {
        return (
            <div className={`${styles.callout} ${styles.calloutError}`}>
                {state.error}
            </div>
        );
    }
    if (state.data === null) return null;
    const isEmpty = Array.isArray(state.data)
        ? state.data.length === 0
        : (state.data as Paged<unknown>).items?.length === 0;
    if (isEmpty) return <div className={styles.empty}>{empty}</div>;
    return <>{children(state.data)}</>;
}

// ---- Categories ------------------------------------------------------------

function CategoriesTab({ state }: { state: LoadState<SrcImportCategory[]> }) {
    return (
        <Status state={state} empty="No categories were staged.">
            {(rows) => (
                <>
                    <p className={styles.muted}>
                        Level (IL) categories are listed but not imported —
                        marked “skipped”.
                    </p>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Default timing</th>
                                    <th>Misc</th>
                                    <th>Rules</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((c) => (
                                    <tr
                                        key={c.id}
                                        className={
                                            c.skipped ? styles.rowSkipped : ''
                                        }
                                    >
                                        <td className={styles.cellMono}>
                                            {c.sortOrder + 1}
                                        </td>
                                        <td>
                                            {c.name}{' '}
                                            {c.skipped && (
                                                <span className={styles.pill}>
                                                    skipped
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <span
                                                className={`${styles.pill} ${
                                                    c.type === 'per-game'
                                                        ? styles.pillPrimary
                                                        : ''
                                                }`}
                                            >
                                                {c.type === 'per-game'
                                                    ? 'full game'
                                                    : 'level'}
                                            </span>
                                        </td>
                                        <td>{timingLabel(c.defaultTiming)}</td>
                                        <td>{c.misc ? 'yes' : ''}</td>
                                        <td>
                                            <Rules text={c.rules} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </Status>
    );
}

function timingLabel(t: SrcImportCategory['defaultTiming']): string {
    switch (t) {
        case 'realtime':
            return 'Real time';
        case 'realtime_noloads':
            return 'Real time (no loads)';
        case 'ingame':
            return 'In-game time';
        default:
            return '—';
    }
}

function Rules({ text }: { text: string | null }) {
    const [open, setOpen] = useState(false);
    if (!text) return <span className={styles.muted}>—</span>;
    if (text.length <= 140 || open) {
        return <div className={styles.rules}>{text}</div>;
    }
    return (
        <div className={styles.rules}>
            {text.slice(0, 140)}…{' '}
            <button
                type="button"
                className="btn btn-link btn-sm p-0 align-baseline"
                onClick={() => setOpen(true)}
            >
                more
            </button>
        </div>
    );
}

// ---- Variables -------------------------------------------------------------

function VariablesTab({
    scope,
    categories,
}: {
    scope: Scope;
    categories: SrcImportCategory[];
}) {
    const state = useLoad(
        () => listSrcImportVariablesAction(scope),
        [scope.jobId],
    );
    const catName = new Map(categories.map((c) => [c.srcId, c.name]));
    return (
        <Status state={state} empty="No variables were staged.">
            {(rows) => (
                <>
                    <p className={styles.muted}>
                        Subcategories split a board; filters narrow it. Level
                        -scoped variables are marked “skipped”.
                    </p>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Kind</th>
                                    <th>Applies to</th>
                                    <th>Values</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((v) => (
                                    <tr
                                        key={v.id}
                                        className={
                                            v.skipped ? styles.rowSkipped : ''
                                        }
                                    >
                                        <td>
                                            {v.name}{' '}
                                            {v.skipped && (
                                                <span className={styles.pill}>
                                                    skipped
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <span
                                                className={`${styles.pill} ${
                                                    v.isSubcategory
                                                        ? styles.pillPrimary
                                                        : ''
                                                }`}
                                            >
                                                {v.isSubcategory
                                                    ? 'subcategory'
                                                    : 'filter'}
                                            </span>
                                        </td>
                                        <td>
                                            {v.srcCategoryId
                                                ? (catName.get(
                                                      v.srcCategoryId,
                                                  ) ?? v.srcCategoryId)
                                                : 'All categories'}
                                        </td>
                                        <td>
                                            {v.values.map((val) => (
                                                <span
                                                    key={val.id}
                                                    className={`${styles.pill} ${
                                                        val.id ===
                                                        v.defaultValueId
                                                            ? styles.pillPrimary
                                                            : ''
                                                    }`}
                                                    style={{
                                                        marginRight: '0.25rem',
                                                    }}
                                                    title={
                                                        val.id ===
                                                        v.defaultValueId
                                                            ? 'default'
                                                            : undefined
                                                    }
                                                >
                                                    {val.label}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </Status>
    );
}

// ---- Players ---------------------------------------------------------------

const MATCH_OPTIONS: Array<{
    value: SrcImportMatchKind | 'all';
    label: string;
}> = [
    { value: 'all', label: 'All' },
    { value: 'src_verified', label: 'Verified' },
    { value: 'twitch', label: 'Twitch match' },
    { value: 'none', label: 'Unmatched' },
];

const MATCH_LABEL: Record<SrcImportMatchKind, string> = {
    src_verified: 'verified SRC identity',
    twitch: 'same Twitch login',
    none: 'no match',
};

function PlayersTab({ scope }: { scope: Scope }) {
    const [match, setMatch] = useState<SrcImportMatchKind | 'all'>('all');
    const [page, setPage] = useState(1);
    const state = useLoad(
        () =>
            listSrcImportPlayersAction({
                ...scope,
                query: {
                    match: match === 'all' ? undefined : match,
                    page,
                    pageSize: PAGE_SIZE,
                },
            }),
        [scope.jobId, match, page],
    );
    return (
        <>
            <div className={styles.toolbar}>
                <SegmentedControl
                    label="Match"
                    value={match}
                    options={MATCH_OPTIONS}
                    onChange={(v) => {
                        setMatch(v as SrcImportMatchKind | 'all');
                        setPage(1);
                    }}
                />
            </div>
            <p className={styles.muted}>
                “Verified” players have an admin-confirmed speedrun.com
                identity. A Twitch match is only a suggestion. Unmatched players
                are the ones who will need to claim their runs.
            </p>
            <Status state={state} empty="No players in this view.">
                {(paged) => (
                    <>
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>speedrun.com name</th>
                                        <th>therun.gg user</th>
                                        <th>Match</th>
                                        <th>Twitch</th>
                                        <th>Country</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paged.items.map((p) => (
                                        <PlayerRow key={p.id} p={p} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pager
                            page={page}
                            total={paged.total}
                            onPage={setPage}
                        />
                    </>
                )}
            </Status>
        </>
    );
}

function PlayerRow({ p }: { p: SrcImportPlayer }) {
    const pill =
        p.matchKind === 'src_verified'
            ? styles.pillPrimary
            : p.matchKind === 'twitch'
              ? styles.pillWarn
              : '';
    return (
        <tr>
            <td>
                {p.name}
                {!p.srcUserId && (
                    <>
                        {' '}
                        <span className={styles.pill}>guest</span>
                    </>
                )}
            </td>
            <td>
                {p.therunUsername ?? <span className={styles.muted}>—</span>}
            </td>
            <td>
                <span className={`${styles.pill} ${pill}`}>
                    {MATCH_LABEL[p.matchKind]}
                </span>
            </td>
            <td>{p.twitchLogin ?? ''}</td>
            <td>{p.country ?? ''}</td>
        </tr>
    );
}

// ---- Runs ------------------------------------------------------------------

function RunsTab({
    scope,
    categories,
}: {
    scope: Scope;
    categories: SrcImportCategory[];
}) {
    const [categoryId, setCategoryId] = useState<string>('');
    const [status, setStatus] = useState<'all' | 'verified' | 'new'>('all');
    const [page, setPage] = useState(1);
    const state = useLoad(
        () =>
            listSrcImportRunsAction({
                ...scope,
                query: {
                    categoryId: categoryId || undefined,
                    status: status === 'all' ? undefined : status,
                    page,
                    pageSize: PAGE_SIZE,
                },
            }),
        [scope.jobId, categoryId, status, page],
    );
    const catName = new Map(categories.map((c) => [c.srcId, c.name]));
    return (
        <>
            <div className={styles.toolbar}>
                <label className={styles.field} style={{ flex: '0 1 auto' }}>
                    <span className={styles.label}>Category</span>
                    <select
                        className={styles.select}
                        value={categoryId}
                        onChange={(e) => {
                            setCategoryId(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">All categories</option>
                        {categories
                            .filter((c) => !c.skipped)
                            .map((c) => (
                                <option key={c.srcId} value={c.srcId}>
                                    {c.name}
                                </option>
                            ))}
                    </select>
                </label>
                <SegmentedControl
                    label="Status"
                    value={status}
                    options={[
                        { value: 'all', label: 'All' },
                        { value: 'verified', label: 'Verified' },
                        { value: 'new', label: 'Awaiting verification' },
                    ]}
                    onChange={(v) => {
                        setStatus(v as 'all' | 'verified' | 'new');
                        setPage(1);
                    }}
                />
            </div>
            <Status state={state} empty="No runs in this view.">
                {(paged) => (
                    <>
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Category</th>
                                        <th>Players</th>
                                        <th>Time</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                        <th>Platform</th>
                                        <th>Video</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paged.items.map((r) => (
                                        <RunRow
                                            key={r.id}
                                            r={r}
                                            categoryName={
                                                catName.get(r.srcCategoryId) ??
                                                r.srcCategoryId
                                            }
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pager
                            page={page}
                            total={paged.total}
                            onPage={setPage}
                        />
                    </>
                )}
            </Status>
        </>
    );
}

/** A staged player's display name; a guest is flagged, an unstaged ref falls back to its SRC id. */
export function runPlayerLabel(p: SrcImportRunPlayer): string {
    if ('guestName' in p) return `${p.guestName} (guest)`;
    return p.name ?? p.srcUserId;
}

export function primaryTime(r: SrcImportRun): string {
    const ms = r.realtimeMs ?? r.ingameMs ?? r.realtimeNoloadsMs;
    if (ms === null || ms === undefined) return '—';
    return getFormattedString(String(ms), ms % 1000 !== 0);
}

function RunRow({
    r,
    categoryName,
}: {
    r: SrcImportRun;
    categoryName: string;
}) {
    return (
        <tr>
            <td>{categoryName}</td>
            <td>
                {r.players.map((p, i) => (
                    <span
                        key={
                            'guestName' in p ? `g:${p.guestName}` : p.srcUserId
                        }
                    >
                        {i > 0 && ', '}
                        {runPlayerLabel(p)}
                        {'twitchLogin' in p && p.twitchLogin && (
                            <span
                                className={styles.muted}
                                style={{ marginLeft: '0.25rem' }}
                                title="Twitch login on speedrun.com"
                            >
                                (twitch: {p.twitchLogin})
                            </span>
                        )}
                        {'therunUsername' in p && p.therunUsername && (
                            <span
                                className={`${styles.pill} ${styles.pillPrimary}`}
                                style={{ marginLeft: '0.25rem' }}
                                title="Matched therun.gg user"
                            >
                                {p.therunUsername}
                            </span>
                        )}
                    </span>
                ))}
                {r.playerCount > 1 && (
                    <>
                        {' '}
                        <span className={styles.pill}>co-op</span>
                    </>
                )}
            </td>
            <td className={styles.cellMono}>{primaryTime(r)}</td>
            <td>
                <span
                    className={`${styles.pill} ${
                        r.status === 'verified'
                            ? styles.pillPrimary
                            : styles.pillWarn
                    }`}
                >
                    {r.status === 'verified' ? 'verified' : 'new'}
                </span>
            </td>
            <td className={styles.cellMono}>{r.date ?? '—'}</td>
            <td>
                {r.platformName ?? ''}
                {r.emulated ? ' (emu)' : ''}
            </td>
            <td>
                {r.videoUrl ? (
                    <a
                        href={r.videoUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                    >
                        video
                    </a>
                ) : (
                    <span className={styles.pill}>no video</span>
                )}
            </td>
        </tr>
    );
}

// ---- Pager -----------------------------------------------------------------

function Pager({
    page,
    total,
    onPage,
}: {
    page: number;
    total: number;
    onPage: (p: number) => void;
}) {
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (pages <= 1) {
        return (
            <div className={styles.pager}>{total.toLocaleString()} total</div>
        );
    }
    return (
        <div className={styles.pager}>
            <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => onPage(page - 1)}
            >
                Previous
            </button>
            <span>
                Page {page} of {pages} · {total.toLocaleString()} total
            </span>
            <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= pages}
                onClick={() => onPage(page + 1)}
            >
                Next
            </button>
        </div>
    );
}
