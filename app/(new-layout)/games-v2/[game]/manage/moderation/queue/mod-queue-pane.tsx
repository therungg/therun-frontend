'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { CheckCircle, Dash } from 'react-bootstrap-icons';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    LeaderboardEntry,
    ResolvedCategory,
    VariableRow,
} from '../../../../../../../types/leaderboards.types';
import type {
    ModQueueItem,
    ModQueueStatus,
} from '../../../../../../../types/moderation.types';
import { AutoVerifiedBadge } from '../../../run-view/run-badges';
import { BackLink } from '../../../shared/back-link';
import { ModeratePanel } from '../moderate/moderate-panel';
import type { SheetBoard } from '../moderate/subject';
import { loadModQueueAction } from './actions/load-mod-queue.action';
import styles from './mod-queue-pane.module.scss';

interface Props {
    gameSlug: string;
    gameId: number;
    gameDisplay: string;
    categories: Array<{ id: number; display: string }>;
    /** Full board rows, for the moderate modal. */
    boardCategories: ResolvedCategory[];
    variables: VariableRow[];
    canSiteBan: boolean;
}

const PAGE_SIZE = 25;

const STATUS_TABS: Array<{ value: ModQueueStatus; label: string }> = [
    { value: 'pending', label: 'Waiting' },
    { value: 'verified', label: 'Approved' },
    { value: 'rejected', label: 'Declined' },
    { value: 'all', label: 'Everything' },
];

/** Whole days a run has been sitting in the queue. */
function waitingDays(iso: string, now: number): number | null {
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return null;
    return Math.max(0, Math.floor((now - t) / 86_400_000));
}

/** How loudly a row's age reads. The queue's whole job is to make the runs
 * nobody has looked at in a week impossible to miss, so age — not time, not
 * rank — carries the only colour in the table. */
function ageTone(days: number | null): 'fresh' | 'aging' | 'stale' {
    if (days == null) return 'fresh';
    if (days >= 14) return 'stale';
    if (days >= 3) return 'aging';
    return 'fresh';
}

function waitingLabel(days: number | null): string {
    if (days == null) return '—';
    if (days === 0) return 'today';
    if (days === 1) return '1 day';
    if (days < 30) return `${days} days`;
    const months = Math.floor(days / 30);
    return months === 1 ? '1 month' : `${months} months`;
}

const SPOT_CHECK_WINDOW_MS = 7 * 86_400_000;

/** The spot-check filter: passed the auto-verify checks, and recently — an
 * older `'grant'`-verified row can have `verifiedAt: null`, which just
 * excludes it here rather than throwing. */
function isRecentAutoVerify(row: ModQueueItem, now: number): boolean {
    if (row.verifiedVia !== 'auto' || !row.verifiedAt) return false;
    const t = Date.parse(row.verifiedAt);
    if (Number.isNaN(t)) return false;
    return now - t <= SPOT_CHECK_WINDOW_MS;
}

/** The board a row sits on, or null when the console does not list it. */
function rowBoard(
    row: ModQueueItem,
    boardCategories: ResolvedCategory[],
): SheetBoard | null {
    const category = boardCategories.find((c) => c.id === row.categoryId);
    if (!category) return null;
    return {
        categoryId: category.id,
        categorySlug: category.name,
        categoryDisplay: category.display,
        subcategoryKey: row.subcategoryKey,
        primaryTiming: category.primaryTiming === 'gt' ? 'gt' : 'rt',
    };
}

function rowEntry(row: ModQueueItem, board: SheetBoard): LeaderboardEntry {
    const status = row.verificationStatus;
    return {
        runId: row.id,
        rank: 0,
        runnerName: row.runnerName,
        userId: row.userId,
        isGuest: row.isGuest,
        time:
            board.primaryTiming === 'gt' && row.gameTime != null
                ? row.gameTime
                : row.time,
        realTime: row.time,
        gameTime: row.gameTime,
        runDate: row.createdAt,
        vodUrl: row.vodUrl,
        verificationStatus:
            status === 'verified' || status === 'rejected' ? status : 'pending',
        variables: row.variables,
    };
}

export function ModQueuePane({
    gameSlug,
    gameId,
    gameDisplay,
    categories,
    boardCategories,
    variables,
    canSiteBan,
}: Props) {
    const baseHref = `/games-v2/${encodeURIComponent(gameSlug)}/manage/moderation`;
    const boardHref = `/games-v2/${encodeURIComponent(gameSlug)}`;

    const [status, setStatus] = useState<ModQueueStatus>('pending');
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [page, setPage] = useState(1);
    // Spot-check filter: forces the fetch to `verified` and narrows the
    // loaded page to recent auto-verify passes. Kept separate from `status`
    // so the status tab the moderator had picked is still there when they
    // turn the toggle back off.
    const [autoVerifyOnly, setAutoVerifyOnly] = useState(false);

    const [rows, setRows] = useState<ModQueueItem[] | null>(null);
    const [totalItems, setTotalItems] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [openRunId, setOpenRunId] = useState<number | null>(null);
    const [isLoading, startLoad] = useTransition();
    // Which slice the rows on screen actually came from. Tracked separately
    // from `status` (the picked tab) so the table and its totals can never be
    // labelled as something they are not while a load is in flight.
    const [loadedStatus, setLoadedStatus] = useState<ModQueueStatus>('pending');
    // Every load takes a ticket; only the newest one is allowed to write
    // state. Without this, clicking through the tabs races: a slow response
    // for the tab you just left lands last and paints its rows under the new
    // tab's heading.
    const requestId = useRef(0);

    // Read once per render pass, not per row: every age in the table is
    // measured against the same instant, and it only lives in the client.
    const now = useMemo(() => Date.now(), [rows]);

    const load = (overrides?: {
        status?: ModQueueStatus;
        categoryId?: number | null;
        page?: number;
        autoVerifyOnly?: boolean;
    }) => {
        const nextStatus = overrides?.status ?? status;
        const nextCategory =
            overrides?.categoryId !== undefined
                ? overrides.categoryId
                : categoryId;
        const nextPage = overrides?.page ?? page;
        const nextAutoVerifyOnly = overrides?.autoVerifyOnly ?? autoVerifyOnly;
        setError(null);
        const ticket = ++requestId.current;
        startLoad(async () => {
            // The spot-check filter only makes sense over verified runs, so
            // it overrides whatever status tab is selected for the fetch —
            // the tab itself is left alone and wins again once the toggle
            // comes back off.
            const fetchStatus = nextAutoVerifyOnly ? 'verified' : nextStatus;
            const res = await loadModQueueAction(gameSlug, {
                status: fetchStatus,
                categoryId: nextCategory ?? undefined,
                page: nextPage,
                pageSize: PAGE_SIZE,
            });
            if (ticket !== requestId.current) return;
            if ('error' in res) {
                setError(res.error);
                setRows(null);
                setTotalItems(0);
                return;
            }
            // Filtered client-side, over the page the backend already
            // returned — paging still walks the full verified set, it just
            // may show fewer (or zero) matching rows on any given page.
            const items = nextAutoVerifyOnly
                ? res.page.items.filter((r) =>
                      isRecentAutoVerify(r, Date.now()),
                  )
                : res.page.items;
            setRows(items);
            setTotalItems(res.page.totalItems);
            setLoadedStatus(fetchStatus);
        });
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // The overview line: what is actually in this queue, not just how many
    // rows fit on the page.
    const summary = useMemo(() => {
        if (!rows) return null;
        const withVod = rows.filter((r) => r.vodUrl).length;
        const guests = rows.filter((r) => r.userId == null).length;
        const ages = rows
            .map((r) => waitingDays(r.createdAt, now))
            .filter((d): d is number => d != null);
        return {
            count: rows.length,
            withVod,
            noVod: rows.length - withVod,
            guests,
            oldest: ages.length ? Math.max(...ages) : null,
        };
    }, [rows, now]);

    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const openRow = (row: ModQueueItem) => {
        if (!rowBoard(row, boardCategories)) {
            setError(
                "This run's board isn't in this console's list. Open it from the run page.",
            );
            return;
        }
        setOpenRunId(row.id);
    };

    // After the table reloads under the modal (the open run decided out of
    // this view), stay on the run if it is still listed, else take the next
    // run that survived, else the one before it, else close. Worked out
    // during render so the modal never renders without a run while one
    // survives.
    const runOrder = (rows ?? []).map((r) => r.id);
    const runOrderSignature = runOrder.join('|');
    const [seenRunOrder, setSeenRunOrder] = useState<{
        signature: string;
        runIds: number[];
    }>({ signature: '', runIds: [] });
    if (rows != null && seenRunOrder.signature !== runOrderSignature) {
        setSeenRunOrder({ signature: runOrderSignature, runIds: runOrder });
        if (openRunId !== null && !runOrder.includes(openRunId)) {
            const previous = seenRunOrder.runIds;
            const survivors = new Set(runOrder);
            const at = previous.indexOf(openRunId);
            let landing: number | null = null;
            if (at !== -1) {
                landing =
                    previous.slice(at + 1).find((id) => survivors.has(id)) ??
                    previous
                        .slice(0, at)
                        .reverse()
                        .find((id) => survivors.has(id)) ??
                    null;
            }
            setOpenRunId(landing);
        }
    }

    const openIndex =
        openRunId === null || rows == null
            ? -1
            : rows.findIndex((r) => r.id === openRunId);
    const openItem = openIndex >= 0 && rows ? rows[openIndex] : null;
    const openBoard = openItem ? rowBoard(openItem, boardCategories) : null;
    const stepTo = (index: number) => {
        const row = rows?.[index];
        if (row && rowBoard(row, boardCategories)) setOpenRunId(row.id);
    };

    // While the toggle is on, the table shows verified rows regardless of
    // `status` — the tab strip must agree, or it contradicts what's on
    // screen. `status` itself stays untouched so it's restored when the
    // toggle goes off.
    const highlightedStatus = autoVerifyOnly ? 'verified' : status;

    return (
        <div className={consoleStyles.surface}>
            <div className={consoleStyles.paneHeader}>
                <div>
                    <div className={consoleStyles.paneEyebrow}>Queue</div>
                    <h2 className={consoleStyles.paneTitle}>Mod queue</h2>
                </div>
                <div className={consoleStyles.paneActions}>
                    <BackLink href={boardHref} label="Back to leaderboard" />
                </div>
            </div>
            <p className={consoleStyles.paneLede}>
                Every {gameDisplay} run still waiting on a verdict, oldest
                first. Approve what stands, decline what doesn’t, and deal with
                the runner behind it without leaving the table.
            </p>

            <div className={styles.controls}>
                <div className={styles.tabs} role="tablist">
                    {STATUS_TABS.map((tab) => (
                        <button
                            key={tab.value}
                            type="button"
                            role="tab"
                            aria-selected={highlightedStatus === tab.value}
                            disabled={autoVerifyOnly}
                            title={
                                autoVerifyOnly
                                    ? 'Spot-check only looks at approved runs — turn it off to pick a different tab.'
                                    : undefined
                            }
                            className={
                                highlightedStatus === tab.value
                                    ? `${styles.tab} ${styles.tabActive}`
                                    : styles.tab
                            }
                            onClick={() => {
                                setStatus(tab.value);
                                setPage(1);
                                load({ status: tab.value, page: 1 });
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className={styles.boardPicker}>
                    <label htmlFor="queue-board" className={styles.filterLabel}>
                        Board
                    </label>
                    <select
                        id="queue-board"
                        className={`form-select form-select-sm ${styles.input}`}
                        value={categoryId ?? 'all'}
                        onChange={(e) => {
                            const raw = e.target.value;
                            const next =
                                raw === 'all' ? null : Number.parseInt(raw, 10);
                            setCategoryId(next);
                            setPage(1);
                            load({ categoryId: next, page: 1 });
                        }}
                    >
                        <option value="all">All boards</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.display}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.spotCheck}>
                    <div className="form-check form-switch">
                        <input
                            id="queue-auto-verify-only"
                            type="checkbox"
                            role="switch"
                            className="form-check-input"
                            checked={autoVerifyOnly}
                            onChange={(e) => {
                                const next = e.target.checked;
                                setAutoVerifyOnly(next);
                                setPage(1);
                                load({ autoVerifyOnly: next, page: 1 });
                            }}
                        />
                        <label
                            htmlFor="queue-auto-verify-only"
                            className="form-check-label small"
                        >
                            Auto-verified, last 7 days
                        </label>
                    </div>
                    {autoVerifyOnly && (
                        <p className={styles.spotCheckNote}>
                            Spot-checking approved runs from this page only —
                            page through to check others.
                        </p>
                    )}
                </div>
            </div>

            {summary && (
                <div className={styles.summary}>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>
                            {autoVerifyOnly ? summary.count : totalItems}
                        </span>
                        <span className={styles.statLabel}>
                            {autoVerifyOnly
                                ? 'auto-verified here'
                                : loadedStatus === 'pending'
                                  ? 'waiting'
                                  : 'runs'}
                        </span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>
                            {summary.withVod}
                        </span>
                        <span className={styles.statLabel}>with a VOD</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>
                            {summary.noVod}
                        </span>
                        <span className={styles.statLabel}>without</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>
                            {summary.guests}
                        </span>
                        <span className={styles.statLabel}>from guests</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>
                            {waitingLabel(summary.oldest)}
                        </span>
                        <span className={styles.statLabel}>
                            oldest on this page
                        </span>
                    </div>
                </div>
            )}

            {error && (
                <div className={styles.errorAlert} role="alert">
                    {error}
                </div>
            )}

            {isLoading && <p className={styles.loading}>Loading the queue…</p>}

            {rows != null && rows.length === 0 && (
                <div className={styles.empty}>
                    <CheckCircle
                        size={24}
                        className={styles.emptyIcon}
                        aria-hidden="true"
                    />
                    <p className={styles.emptyTitle}>Nothing is waiting</p>
                    <p className="mb-0">
                        {autoVerifyOnly
                            ? 'No auto-verified runs on this page in the last 7 days.'
                            : loadedStatus === 'pending'
                              ? 'Every run on a visible board has a verdict.'
                              : 'No runs match this view.'}
                    </p>
                </div>
            )}

            {rows != null && rows.length > 0 && (
                <div
                    className={
                        (autoVerifyOnly ? 'verified' : status) === loadedStatus
                            ? 'table-responsive'
                            : `table-responsive ${styles.stale}`
                    }
                >
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Waiting</th>
                                <th>Runner</th>
                                <th>Board</th>
                                <th className="text-end">RT</th>
                                <th className="text-end">GT</th>
                                <th>Submission</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => {
                                const days = waitingDays(row.createdAt, now);
                                const tone = ageTone(days);
                                return (
                                    <tr
                                        key={row.id}
                                        className={styles[`row_${tone}`]}
                                    >
                                        <td>
                                            <span
                                                className={
                                                    styles[`age_${tone}`]
                                                }
                                            >
                                                {waitingLabel(days)}
                                            </span>
                                        </td>
                                        <td>
                                            {row.userId == null ? (
                                                <span>
                                                    {row.runnerName}{' '}
                                                    <span
                                                        className={
                                                            styles.guestTag
                                                        }
                                                    >
                                                        guest
                                                    </span>
                                                </span>
                                            ) : (
                                                <UserLink
                                                    username={row.runnerName}
                                                    to="leaderboards"
                                                />
                                            )}
                                        </td>
                                        <td>
                                            <span className={styles.board}>
                                                {row.categoryDisplay}
                                            </span>
                                            {row.subcategoryKey && (
                                                <span className={styles.sub}>
                                                    {row.subcategoryKey}
                                                </span>
                                            )}
                                        </td>
                                        <td className={styles.time}>
                                            {row.time != null ? (
                                                <DurationToFormatted
                                                    duration={row.time}
                                                />
                                            ) : (
                                                <Dash
                                                    size={14}
                                                    className={styles.dash}
                                                    aria-label="no real time"
                                                />
                                            )}
                                        </td>
                                        <td className={styles.time}>
                                            {row.gameTime != null ? (
                                                <DurationToFormatted
                                                    duration={row.gameTime}
                                                />
                                            ) : (
                                                <Dash
                                                    size={14}
                                                    className={styles.dash}
                                                    aria-label="no game time"
                                                />
                                            )}
                                        </td>
                                        <td>
                                            <div className={styles.meta}>
                                                <AutoVerifiedBadge
                                                    verifiedVia={
                                                        row.verifiedVia ?? null
                                                    }
                                                />
                                                {row.vodUrl ? (
                                                    <a
                                                        className={
                                                            styles.vodPill
                                                        }
                                                        href={row.vodUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        VOD
                                                    </a>
                                                ) : (
                                                    <span
                                                        className={
                                                            styles.noVodPill
                                                        }
                                                    >
                                                        No VOD
                                                    </span>
                                                )}
                                                {row.platform && (
                                                    <span
                                                        className={styles.pill}
                                                    >
                                                        {row.platform}
                                                    </span>
                                                )}
                                                {row.emulator && (
                                                    <span
                                                        className={styles.pill}
                                                    >
                                                        emulator
                                                    </span>
                                                )}
                                                {row.excluded && (
                                                    <span
                                                        className={
                                                            styles.warnPill
                                                        }
                                                        title={
                                                            row.exclusionReason ??
                                                            undefined
                                                        }
                                                    >
                                                        removed
                                                    </span>
                                                )}
                                                {!row.leaderboardEligible && (
                                                    <span
                                                        className={
                                                            styles.warnPill
                                                        }
                                                        title={
                                                            row.ineligibleReason ??
                                                            undefined
                                                        }
                                                    >
                                                        ineligible
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="text-end">
                                            <div className={styles.rowActions}>
                                                <button
                                                    type="button"
                                                    className={styles.rowAction}
                                                    onClick={() => openRow(row)}
                                                >
                                                    Moderate
                                                </button>
                                                {row.userId != null && (
                                                    <Link
                                                        href={`${baseHref}/runner/${row.userId}?from=queue`}
                                                        className={
                                                            styles.rowAction
                                                        }
                                                    >
                                                        Runner
                                                    </Link>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {totalPages > 1 && (
                <div className={styles.pager}>
                    <button
                        type="button"
                        className={styles.quietAction}
                        disabled={page <= 1 || isLoading}
                        onClick={() => {
                            const next = page - 1;
                            setPage(next);
                            load({ page: next });
                        }}
                    >
                        Previous
                    </button>
                    <span className={styles.pagerLabel}>
                        Page {page} of {totalPages}
                    </span>
                    <button
                        type="button"
                        className={styles.quietAction}
                        disabled={page >= totalPages || isLoading}
                        onClick={() => {
                            const next = page + 1;
                            setPage(next);
                            load({ page: next });
                        }}
                    >
                        Next
                    </button>
                </div>
            )}

            {openItem && openBoard && (
                <ModeratePanel
                    subject={{
                        kind: 'run',
                        entry: rowEntry(openItem, openBoard),
                        board: openBoard,
                    }}
                    context={{
                        gameSlug,
                        gameId,
                        gameDisplay,
                        categories: boardCategories,
                        variables,
                        canSiteBan,
                    }}
                    mount="modal"
                    position={{
                        index: openIndex + 1,
                        total: rows?.length ?? 0,
                    }}
                    onClose={() => setOpenRunId(null)}
                    onMutated={() => load()}
                    onPrev={
                        openIndex > 0 ? () => stepTo(openIndex - 1) : undefined
                    }
                    onNext={
                        rows && openIndex < rows.length - 1
                            ? () => stepTo(openIndex + 1)
                            : undefined
                    }
                />
            )}
        </div>
    );
}
