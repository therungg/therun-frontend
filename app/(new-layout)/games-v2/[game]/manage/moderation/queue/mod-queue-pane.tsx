'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { CheckCircle, Dash } from 'react-bootstrap-icons';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    ModQueueItem,
    ModQueueStatus,
} from '../../../../../../../types/moderation.types';
import { HideIdentityDialog } from '../../../leaderboard/hide-identity-dialog';
import { AutoVerifiedBadge } from '../../../run-view/run-badges';
import { BackLink } from '../../../shared/back-link';
import type { ModVerb, RunActionTarget } from '../shared/action-model';
import { RunActionDialog } from '../shared/run-action-dialog';
import { loadModQueueAction } from './actions/load-mod-queue.action';
import styles from './mod-queue-pane.module.scss';
import { QueueVodReviewDialog } from './vod-review-dialog';

interface Props {
    gameSlug: string;
    gameDisplay: string;
    categories: Array<{ id: number; display: string }>;
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

export function ModQueuePane({ gameSlug, gameDisplay, categories }: Props) {
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
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [dialog, setDialog] = useState<
        | { kind: 'action'; verb: ModVerb; target: RunActionTarget }
        | { kind: 'hide'; row: ModQueueItem }
        | { kind: 'vod'; row: ModQueueItem; vodUrl: string }
        | null
    >(null);
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
        setSelected(new Set());
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
    const selectedRunIds = useMemo(() => Array.from(selected), [selected]);

    // Bulk banning only makes sense when the whole selection is one account on
    // one board — a ban rule is scoped to exactly that.
    const banSubject = useMemo(() => {
        if (!rows || selected.size === 0) return null;
        const picked = rows.filter((r) => selected.has(r.id));
        const first = picked[0];
        if (!first || first.userId == null) return null;
        const same = picked.every(
            (r) =>
                r.userId === first.userId && r.categoryId === first.categoryId,
        );
        if (!same) return null;
        return {
            userId: first.userId,
            runnerName: first.runnerName,
            categoryId: first.categoryId,
            categoryDisplay: first.categoryDisplay,
        };
    }, [rows, selected]);

    const allSelected =
        rows != null &&
        rows.length > 0 &&
        rows.every((r) => selected.has(r.id));
    const partiallySelected =
        !allSelected && rows != null && rows.some((r) => selected.has(r.id));

    const selectAllRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (selectAllRef.current) {
            selectAllRef.current.indeterminate = partiallySelected;
        }
    }, [partiallySelected]);

    const toggleAll = () => {
        if (!rows) return;
        setSelected((prev) => {
            const next = new Set(prev);
            for (const r of rows) {
                if (allSelected) next.delete(r.id);
                else next.add(r.id);
            }
            return next;
        });
    };

    const toggleRow = (runId: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(runId)) next.delete(runId);
            else next.add(runId);
            return next;
        });
    };

    const openRowAction = (verb: ModVerb, row: ModQueueItem) => {
        setDialog({
            kind: 'action',
            verb,
            target: {
                kind: 'runs',
                runIds: [row.id],
                label: `${row.runnerName} · ${row.categoryDisplay}`,
                runTimeMs: row.time ?? row.gameTime,
                runDate: row.createdAt,
                runner:
                    row.userId != null
                        ? {
                              id: row.userId,
                              name: row.runnerName,
                              categoryId: row.categoryId,
                              categoryDisplay: row.categoryDisplay,
                              subcategoryKey: row.subcategoryKey,
                              primaryTiming: row.time != null ? 'rt' : 'gt',
                          }
                        : undefined,
            },
        });
    };

    const openBulkAction = (verb: ModVerb) => {
        if (selectedRunIds.length === 0) return;
        setDialog({
            kind: 'action',
            verb,
            target: {
                kind: 'runs',
                runIds: selectedRunIds,
                label: `${selectedRunIds.length} run${selectedRunIds.length === 1 ? '' : 's'}`,
            },
        });
    };

    const openBan = () => {
        if (!banSubject) return;
        setDialog({
            kind: 'action',
            verb: 'ban',
            target: {
                kind: 'runner',
                runnerId: banSubject.userId,
                runnerName: banSubject.runnerName,
                categoryId: banSubject.categoryId,
                categoryDisplay: banSubject.categoryDisplay,
                gameDisplay,
            },
        });
    };

    const afterMutation = () => {
        setDialog(null);
        load();
    };

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
                            aria-selected={status === tab.value}
                            disabled={autoVerifyOnly}
                            title={
                                autoVerifyOnly
                                    ? 'Spot-check only looks at approved runs — turn it off to pick a different tab.'
                                    : undefined
                            }
                            className={
                                status === tab.value
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
                                <th style={{ width: '1%' }}>
                                    <input
                                        ref={selectAllRef}
                                        type="checkbox"
                                        className="form-check-input"
                                        aria-label="Select every run on this page"
                                        checked={allSelected}
                                        onChange={toggleAll}
                                    />
                                </th>
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
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                aria-label={`Select ${row.runnerName}’s run`}
                                                checked={selected.has(row.id)}
                                                onChange={() =>
                                                    toggleRow(row.id)
                                                }
                                            />
                                        </td>
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
                                                    <button
                                                        type="button"
                                                        className={
                                                            styles.vodPill
                                                        }
                                                        onClick={() =>
                                                            setDialog({
                                                                kind: 'vod',
                                                                row,
                                                                vodUrl: row.vodUrl as string,
                                                            })
                                                        }
                                                    >
                                                        Review VOD
                                                    </button>
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
                                                    className={
                                                        styles.approveAction
                                                    }
                                                    onClick={() =>
                                                        openRowAction(
                                                            'approve',
                                                            row,
                                                        )
                                                    }
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    type="button"
                                                    className={
                                                        styles.removeAction
                                                    }
                                                    onClick={() =>
                                                        openRowAction(
                                                            'reject',
                                                            row,
                                                        )
                                                    }
                                                >
                                                    Decline…
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.rowAction}
                                                    onClick={() =>
                                                        openRowAction(
                                                            'remove',
                                                            row,
                                                        )
                                                    }
                                                >
                                                    Remove…
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.rowAction}
                                                    onClick={() =>
                                                        setDialog({
                                                            kind: 'hide',
                                                            row,
                                                        })
                                                    }
                                                >
                                                    Hide identity…
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

            {selected.size > 0 && (
                <div className={styles.bulkBar}>
                    <span className={styles.bulkCount}>
                        {selected.size} selected
                    </span>
                    {banSubject && (
                        <button
                            type="button"
                            className={styles.removeAction}
                            onClick={openBan}
                        >
                            Ban {banSubject.runnerName}…
                        </button>
                    )}
                    <div className={styles.bulkGroup}>
                        <button
                            type="button"
                            className={styles.quietAction}
                            onClick={() => setSelected(new Set())}
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            className={styles.approveAction}
                            onClick={() => openBulkAction('approve')}
                        >
                            Approve
                        </button>
                        <button
                            type="button"
                            className={styles.removeAction}
                            onClick={() => openBulkAction('reject')}
                        >
                            Decline…
                        </button>
                        <button
                            type="button"
                            className={styles.rowAction}
                            onClick={() => openBulkAction('remove')}
                        >
                            Remove…
                        </button>
                    </div>
                </div>
            )}

            {dialog?.kind === 'action' && (
                <RunActionDialog
                    gameSlug={gameSlug}
                    verb={dialog.verb}
                    target={dialog.target}
                    defaultBanScope={
                        dialog.verb === 'ban' ? 'category' : undefined
                    }
                    onDone={afterMutation}
                    onClose={() => setDialog(null)}
                />
            )}
            {dialog?.kind === 'vod' && (
                <QueueVodReviewDialog
                    gameSlug={gameSlug}
                    row={dialog.row}
                    vodUrl={dialog.vodUrl}
                    // A saved retime changes the row's time, so the table
                    // behind reloads — the dialog stays open on the run the
                    // mod is still watching.
                    onSaved={load}
                    onClose={() => setDialog(null)}
                />
            )}
            {dialog?.kind === 'hide' && (
                <HideIdentityDialog
                    open
                    gameSlug={gameSlug}
                    gameDisplay={gameDisplay}
                    runnerName={dialog.row.runnerName}
                    runId={dialog.row.id}
                    userId={dialog.row.userId}
                    categoryId={dialog.row.categoryId}
                    categoryDisplay={dialog.row.categoryDisplay}
                    subcategoryKey={dialog.row.subcategoryKey}
                    onDone={afterMutation}
                    onClose={() => setDialog(null)}
                />
            )}
        </div>
    );
}
