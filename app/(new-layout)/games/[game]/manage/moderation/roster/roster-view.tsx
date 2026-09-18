'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
    CaretDownFill,
    CaretUpFill,
    Dash,
    Search,
} from 'react-bootstrap-icons';
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
    LeaderboardRosterRow,
    RosterFilter,
} from '../../../../../../../types/moderation.types';
import {
    normalizeVerificationStatus,
    VerificationBadge,
} from '../../../run-view/run-badges';
import { BackLink } from '../../../shared/back-link';
import { ModeratePanel } from '../moderate/moderate-panel';
import { isKnownStatus, type SheetBoard } from '../moderate/subject';
import { loadRosterAction } from './actions/load-roster.action';
import {
    nextRosterSort,
    type RosterSortKey,
    type RosterSortState,
    sortRosterRows,
} from './roster-sort';
import styles from './roster-view.module.scss';

type VerificationFilter = 'any' | 'unverified' | 'verified' | 'rejected';
type VodFilter = 'any' | 'true' | 'false';
type BoardFilter = 'any' | 'on' | 'off';

interface Props {
    gameSlug: string;
    gameId: number;
    gameDisplay: string;
    categories: ResolvedCategory[];
    variables: VariableRow[];
    canSiteBan: boolean;
    /** canSeeBoards — the moderate panel links board names only when true. */
    boardsVisible: boolean;
    initialCategoryId: number | null;
}

/** Status falls back to pending; the subject says when that is a guess. */
function rowEntry(
    row: LeaderboardRosterRow,
    board: SheetBoard,
): LeaderboardEntry {
    const status = row.verificationStatus;
    return {
        runId: row.runId,
        rank: row.boardRank ?? 0,
        runnerName: row.runnerName,
        userId: row.userId,
        isGuest: row.userId == null,
        time:
            board.primaryTiming === 'gt' && row.gameTime != null
                ? row.gameTime
                : row.time,
        realTime: row.time,
        gameTime: row.gameTime,
        runDate: row.endedAt,
        vodUrl: row.vodUrl,
        verificationStatus: isKnownStatus(status) ? status : 'pending',
        variables: null,
    };
}

/** Whether a roster row currently appears on either board (RT or GT). */
function isOnBoard(row: LeaderboardRosterRow): boolean {
    return row.isLeaderboardEntry || row.isLeaderboardEntryGt;
}

/** A clickable, `aria-sort`-carrying column header for the roster table.
 * Sorting is client-side over already-loaded rows (see roster-sort.ts) —
 * clicking cycles ascending → descending → back to the default (unsorted,
 * load) order. */
function SortableTh({
    label,
    sortKey,
    align = 'start',
    sort,
    onSort,
}: {
    label: string;
    sortKey: RosterSortKey;
    align?: 'start' | 'end' | 'center';
    sort: RosterSortState | null;
    onSort: (key: RosterSortKey) => void;
}) {
    const active = sort?.key === sortKey;
    const alignClass =
        align === 'end'
            ? 'text-end'
            : align === 'center'
              ? 'text-center'
              : undefined;
    return (
        <th className={alignClass} aria-sort={active ? sort.direction : 'none'}>
            <button
                type="button"
                className={styles.sortBtn}
                onClick={() => onSort(sortKey)}
            >
                {label}
                {active &&
                    (sort.direction === 'ascending' ? (
                        <CaretUpFill size={10} aria-hidden="true" />
                    ) : (
                        <CaretDownFill size={10} aria-hidden="true" />
                    ))}
            </button>
        </th>
    );
}

export function RosterView({
    gameSlug,
    gameId,
    gameDisplay,
    categories,
    variables,
    canSiteBan,
    boardsVisible,
    initialCategoryId,
}: Props) {
    const router = useRouter();
    const baseHref = `/games/${encodeURIComponent(gameSlug)}/manage/moderation`;
    const consoleHref = `/games/${encodeURIComponent(gameSlug)}/manage`;

    const [categoryId, setCategoryId] = useState<number | null>(
        initialCategoryId,
    );
    const [subcategoryKey, setSubcategoryKey] = useState('');
    const [verificationStatus, setVerificationStatus] =
        useState<VerificationFilter>('any');
    const [hasVod, setHasVod] = useState<VodFilter>('any');
    const [onBoard, setOnBoard] = useState<BoardFilter>('any');
    const [runnerName, setRunnerName] = useState('');

    const [rows, setRows] = useState<LeaderboardRosterRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    // The category the rows on screen came from.
    const [loadedCategoryId, setLoadedCategoryId] = useState<number | null>(
        null,
    );
    const [openRunId, setOpenRunId] = useState<number | null>(null);
    const [isLoading, startLoad] = useTransition();
    // Client-side only — sorts already-loaded rows, no round trip. `null` is
    // the default/unsorted state (backend load order, unchanged).
    const [sort, setSort] = useState<RosterSortState | null>(null);

    // "On board" is a client-side filter — the backend roster endpoint has no
    // such query param. Account-age and faster-than-WR% filters are NOT added
    // because LeaderboardRosterRow carries neither field (backend ask, spec §13).
    const visibleRows = useMemo(() => {
        if (!rows) return rows;
        if (onBoard === 'any') return rows;
        return rows.filter((r) =>
            onBoard === 'on' ? isOnBoard(r) : !isOnBoard(r),
        );
    }, [rows, onBoard]);

    const sortedRows = useMemo(
        () => (visibleRows ? sortRosterRows(visibleRows, sort) : visibleRows),
        [visibleRows, sort],
    );

    const toggleSort = (key: RosterSortKey) => {
        setSort((prev) => nextRosterSort(prev, key));
    };

    // Overrides let a <select>'s onChange fire the load in the same tick it
    // sets state — reading the just-picked value directly rather than the
    // (not-yet-updated) state closure.
    const handleLoad = (overrides?: {
        categoryId?: number;
        verificationStatus?: VerificationFilter;
        hasVod?: VodFilter;
    }) => {
        const cat = overrides?.categoryId ?? categoryId;
        if (cat == null) return;
        const verification =
            overrides?.verificationStatus ?? verificationStatus;
        const vod = overrides?.hasVod ?? hasVod;
        setError(null);
        const filter: RosterFilter = {
            subcategoryKey: subcategoryKey.trim() || undefined,
            verificationStatus:
                verification === 'any' ? undefined : verification,
            hasVod: vod === 'any' ? undefined : vod === 'true',
            runnerName: runnerName.trim() || undefined,
        };
        startLoad(async () => {
            const res = await loadRosterAction(gameSlug, cat, filter);
            if ('error' in res) {
                setError(res.error);
                setRows(null);
                setOpenRunId(null);
                return;
            }
            setRows(res.rows);
            setLoadedCategoryId(cat);
        });
    };

    // Load once on mount for the initial category.
    useEffect(() => {
        if (categoryId != null) handleLoad();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Category and the two <select> filters (verification, VOD) call
    // handleLoad() directly from their onChange handlers — a picked option
    // is a deliberate, discrete choice, not something that benefits from a
    // debounce. Only the free-text inputs (runner name, subcategory key)
    // stay debounced here, so typing doesn't fire a request per keystroke.
    // Skips the mount-time run (the effect above already loaded once).
    const didMountTextDebounce = useRef(false);
    useEffect(() => {
        if (!didMountTextDebounce.current) {
            didMountTextDebounce.current = true;
            return;
        }
        if (categoryId == null) return;
        const timer = setTimeout(() => {
            handleLoad();
        }, 350);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subcategoryKey, runnerName]);

    const loadedCategory =
        categories.find((c) => c.id === loadedCategoryId) ?? null;
    const boardFor = (row: LeaderboardRosterRow): SheetBoard | null =>
        loadedCategory
            ? {
                  categoryId: loadedCategory.id,
                  categorySlug: loadedCategory.name,
                  categoryDisplay: loadedCategory.display,
                  subcategoryKey: row.subcategoryKey,
                  primaryTiming:
                      loadedCategory.primaryTiming === 'gt' ? 'gt' : 'rt',
              }
            : null;

    // After the table reloads under the modal (the open run filtered out),
    // stay on the run if it is still listed, else take the next run that
    // survived, else the one before it, else close. Worked out during render
    // so the modal never renders without a run while one survives.
    const runOrder = (sortedRows ?? []).map((r) => r.runId);
    const runOrderSignature = runOrder.join('|');
    const [seenRunOrder, setSeenRunOrder] = useState<{
        signature: string;
        runIds: number[];
    }>({ signature: '', runIds: [] });
    if (sortedRows != null && seenRunOrder.signature !== runOrderSignature) {
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
        openRunId === null || sortedRows == null
            ? -1
            : sortedRows.findIndex((r) => r.runId === openRunId);
    const openRow = openIndex >= 0 && sortedRows ? sortedRows[openIndex] : null;
    const openBoard = openRow ? boardFor(openRow) : null;

    return (
        <div>
            <div className={consoleStyles.paneHeader}>
                <div>
                    <div className={consoleStyles.paneEyebrow}>Queue</div>
                    <h1 className={consoleStyles.paneTitle}>Browse runs</h1>
                </div>
                <div className={consoleStyles.paneActions}>
                    <BackLink href={consoleHref} label="Back to console" />
                </div>
            </div>
            <p className={consoleStyles.paneLede}>
                Every run on a {gameDisplay} board: filter, sort, and moderate.
            </p>

            <div className={styles.filters}>
                <div className="row g-2 align-items-end">
                    <div className="col-md-3">
                        <label
                            htmlFor="roster-category"
                            className={styles.filterLabel}
                        >
                            Category
                        </label>
                        <select
                            id="roster-category"
                            className={`form-select form-select-sm ${styles.input}`}
                            value={categoryId ?? ''}
                            onChange={(e) => {
                                const id = Number.parseInt(e.target.value, 10);
                                setCategoryId(Number.isFinite(id) ? id : null);
                                if (Number.isFinite(id)) {
                                    router.replace(
                                        `${baseHref}/roster?categoryId=${id}`,
                                    );
                                    handleLoad({ categoryId: id });
                                }
                            }}
                        >
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.display}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-2">
                        <label
                            htmlFor="roster-subkey"
                            className={styles.filterLabel}
                        >
                            Subcategory key
                        </label>
                        <input
                            id="roster-subkey"
                            type="text"
                            className={`form-control form-control-sm ${styles.input}`}
                            value={subcategoryKey}
                            onChange={(e) => setSubcategoryKey(e.target.value)}
                            placeholder="(any)"
                        />
                    </div>
                    <div className="col-md-2">
                        <label
                            htmlFor="roster-verification"
                            className={styles.filterLabel}
                        >
                            Verification
                        </label>
                        <select
                            id="roster-verification"
                            className={`form-select form-select-sm ${styles.input}`}
                            value={verificationStatus}
                            onChange={(e) => {
                                const next = e.target
                                    .value as VerificationFilter;
                                setVerificationStatus(next);
                                handleLoad({ verificationStatus: next });
                            }}
                        >
                            <option value="any">Any</option>
                            <option value="unverified">Unverified</option>
                            <option value="verified">Verified</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                    <div className="col-md-1">
                        <label
                            htmlFor="roster-vod"
                            className={styles.filterLabel}
                        >
                            VOD
                        </label>
                        <select
                            id="roster-vod"
                            className={`form-select form-select-sm ${styles.input}`}
                            value={hasVod}
                            onChange={(e) => {
                                const next = e.target.value as VodFilter;
                                setHasVod(next);
                                handleLoad({ hasVod: next });
                            }}
                        >
                            <option value="any">Any</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>
                    <div className="col-md-2">
                        <label
                            htmlFor="roster-board"
                            className={styles.filterLabel}
                        >
                            On board
                        </label>
                        <select
                            id="roster-board"
                            className={`form-select form-select-sm ${styles.input}`}
                            value={onBoard}
                            onChange={(e) =>
                                setOnBoard(e.target.value as BoardFilter)
                            }
                        >
                            <option value="any">Any</option>
                            <option value="on">On board</option>
                            <option value="off">Off board</option>
                        </select>
                    </div>
                    <div className="col-md-2">
                        <label
                            htmlFor="roster-runner"
                            className={styles.filterLabel}
                        >
                            Runner name
                        </label>
                        <input
                            id="roster-runner"
                            type="text"
                            className={`form-control form-control-sm ${styles.input}`}
                            value={runnerName}
                            onChange={(e) => setRunnerName(e.target.value)}
                            placeholder="(any)"
                        />
                    </div>
                </div>
                <div className={styles.filterActions}>
                    <button
                        type="button"
                        className={styles.primaryAction}
                        onClick={() => handleLoad()}
                        disabled={isLoading || categoryId == null}
                    >
                        {isLoading ? 'Loading…' : 'Refresh'}
                    </button>
                </div>
            </div>

            {error && (
                <div className={styles.errorAlert} role="alert">
                    {error}
                </div>
            )}

            {visibleRows != null && (
                <div className={styles.resultPanel}>
                    <div className={styles.resultHead}>
                        <span className={consoleStyles.paneCount}>
                            {visibleRows.length} run
                            {visibleRows.length === 1 ? '' : 's'}
                        </span>
                    </div>
                    {visibleRows.length === 0 ? (
                        <div className={styles.empty}>
                            <Search
                                size={24}
                                className={styles.emptyIcon}
                                aria-hidden="true"
                            />
                            <p className={styles.emptyTitle}>No runs match</p>
                            <p className="mb-0">
                                Widen a filter, or pick another category.
                            </p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <SortableTh
                                            label="Runner"
                                            sortKey="runner"
                                            sort={sort}
                                            onSort={toggleSort}
                                        />
                                        <th>Subcategory</th>
                                        <SortableTh
                                            label="RT"
                                            sortKey="rt"
                                            align="end"
                                            sort={sort}
                                            onSort={toggleSort}
                                        />
                                        <SortableTh
                                            label="GT"
                                            sortKey="gt"
                                            align="end"
                                            sort={sort}
                                            onSort={toggleSort}
                                        />
                                        <SortableTh
                                            label="Verified"
                                            sortKey="status"
                                            align="center"
                                            sort={sort}
                                            onSort={toggleSort}
                                        />
                                        <th className="text-center">VOD</th>
                                        <th className="text-center">Board</th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedRows?.map((row) => {
                                        const isGuest = row.userId == null;
                                        return (
                                            <tr key={row.runId}>
                                                <td>
                                                    {isGuest ? (
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
                                                            username={
                                                                row.runnerName
                                                            }
                                                            to="leaderboards"
                                                        />
                                                    )}
                                                </td>
                                                <td className={styles.sub}>
                                                    {row.subcategoryKey || (
                                                        <Dash
                                                            size={14}
                                                            className={
                                                                styles.dash
                                                            }
                                                            aria-label="none"
                                                        />
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
                                                            className={
                                                                styles.dash
                                                            }
                                                            aria-label="no real time"
                                                        />
                                                    )}
                                                </td>
                                                <td className={styles.time}>
                                                    {row.gameTime != null ? (
                                                        <DurationToFormatted
                                                            duration={
                                                                row.gameTime
                                                            }
                                                        />
                                                    ) : (
                                                        <Dash
                                                            size={14}
                                                            className={
                                                                styles.dash
                                                            }
                                                            aria-label="no game time"
                                                        />
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    <VerificationBadge
                                                        status={normalizeVerificationStatus(
                                                            row.verificationStatus,
                                                        )}
                                                    />
                                                </td>
                                                <td className="text-center">
                                                    {row.vodUrl ? (
                                                        <a
                                                            href={row.vodUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            Link
                                                        </a>
                                                    ) : (
                                                        <Dash
                                                            size={14}
                                                            className={
                                                                styles.dash
                                                            }
                                                            aria-label="no VOD"
                                                        />
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    {isOnBoard(row) && (
                                                        <span
                                                            className={
                                                                styles.onBoard
                                                            }
                                                            title={`On board${
                                                                row.isLeaderboardEntry
                                                                    ? ' RT'
                                                                    : ''
                                                            }${
                                                                row.isLeaderboardEntryGt
                                                                    ? ' GT'
                                                                    : ''
                                                            }`}
                                                        >
                                                            On board
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="text-end">
                                                    <div
                                                        className={
                                                            styles.rowActions
                                                        }
                                                    >
                                                        <button
                                                            type="button"
                                                            className={
                                                                styles.rowAction
                                                            }
                                                            onClick={() =>
                                                                setOpenRunId(
                                                                    row.runId,
                                                                )
                                                            }
                                                        >
                                                            Moderate
                                                        </button>
                                                        {!isGuest &&
                                                            row.userId !=
                                                                null && (
                                                                <Link
                                                                    href={`${baseHref}/runner/${row.userId}?from=roster${
                                                                        categoryId !=
                                                                        null
                                                                            ? `&categoryId=${categoryId}`
                                                                            : ''
                                                                    }`}
                                                                    className={
                                                                        styles.rowAction
                                                                    }
                                                                >
                                                                    View runner
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
                </div>
            )}

            {openRow && openBoard && (
                <ModeratePanel
                    subject={{
                        kind: 'run',
                        entry: rowEntry(openRow, openBoard),
                        board: openBoard,
                        statusKnown: isKnownStatus(openRow.verificationStatus),
                    }}
                    context={{
                        gameSlug,
                        gameId,
                        gameDisplay,
                        categories,
                        variables,
                        canSiteBan,
                        boardsVisible,
                    }}
                    mount="modal"
                    position={{
                        index: openIndex + 1,
                        total: sortedRows?.length ?? 0,
                    }}
                    onClose={() => setOpenRunId(null)}
                    onMutated={() => handleLoad()}
                    onPrev={
                        openIndex > 0 && sortedRows
                            ? () =>
                                  setOpenRunId(sortedRows[openIndex - 1].runId)
                            : undefined
                    }
                    onNext={
                        sortedRows && openIndex < sortedRows.length - 1
                            ? () =>
                                  setOpenRunId(sortedRows[openIndex + 1].runId)
                            : undefined
                    }
                />
            )}
        </div>
    );
}
