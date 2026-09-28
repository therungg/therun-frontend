'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { loadPublicBoardRunsAction } from '~src/actions/public-board-runs.action';
import Link from '~src/components/link';
import type {
    LeaderboardsProfileEntry,
    PublicBoardRun,
} from '../../../../types/leaderboards-profile.types';
import { shortDate } from './entry-row';
import {
    entryHref,
    formatDelta,
    formatEntryTime,
    formatProfileDate,
} from './format';
import styles from './leaderboards-profile.module.scss';
import { OwnerRunsList } from './owner-layer/all-runs-toggle';
import ownerStyles from './owner-layer/owner-layer.module.scss';
import { useOwnerLayer } from './owner-layer/owner-layer-provider';
import { PbTag } from './pb-tag';
import { VodButton } from './vod-button';

const PUBLIC_STATE_LABEL: Record<PublicBoardRun['state'], string | null> = {
    on_board: null,
    beaten: null,
    pending: 'Pending',
    off_board: 'Off the board',
};

/** One finished run in History, on its entry's columns, as anyone sees it. */
function PublicRunRow({
    run,
    entry,
    gameRef,
    pb,
}: {
    run: PublicBoardRun;
    entry: LeaderboardsProfileEntry;
    gameRef: string;
    pb: boolean;
}) {
    const ms =
        entry.timing === 'gametime' && run.gameTimeMs !== null
            ? run.gameTimeMs
            : run.timeMs;
    const gap = ms - entry.timeMs;
    const time = formatEntryTime({ ...entry, timeMs: ms });
    const href = entryHref(gameRef, {
        kind: 'run',
        runId: run.id,
        manualTimeId: null,
    });
    const label = PUBLIC_STATE_LABEL[run.state];
    return (
        <div
            className={`${styles.runRow} ${ownerStyles.compact}`}
            data-linked={href ? true : undefined}
        >
            <span className={styles.runName}>
                <span className={styles.runMeta}>
                    {pb ? <PbTag /> : null}
                    {gap !== 0 ? (
                        <span>
                            {gap > 0 ? '+' : '−'}
                            {formatDelta(Math.abs(gap))}
                        </span>
                    ) : null}
                </span>
            </span>
            <span className={`${styles.runTime} ${ownerStyles.compactTime}`}>
                {href ? (
                    <Link
                        href={href}
                        className={`${styles.runLink} stretched-link`}
                    >
                        {time}
                    </Link>
                ) : (
                    <span>{time}</span>
                )}
            </span>
            <span
                className={styles.runDate}
                title={run.endedAt ? formatProfileDate(run.endedAt) : undefined}
            >
                {run.endedAt ? shortDate(run.endedAt) : '—'}
            </span>
            <span className={styles.runStatus}>
                {label ? (
                    <span className={styles.statusPending}>{label}</span>
                ) : null}
            </span>
            <span className={styles.runActions}>
                {run.vodUrl ? (
                    <VodButton
                        vodUrl={run.vodUrl}
                        title={`${entry.category} · ${time}`}
                    />
                ) : (
                    <span className={styles.runIconSpacer} />
                )}
            </span>
        </div>
    );
}

/** Every finished run on the entry's board, fifty at a time, newest first. */
function PublicRunsList({
    entry,
    gameRef,
    pbIds,
}: {
    entry: LeaderboardsProfileEntry;
    gameRef: string;
    pbIds: Set<number>;
}) {
    const { runnerName } = useOwnerLayer();
    const [runs, setRuns] = useState<PublicBoardRun[] | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [loading, startLoading] = useTransition();
    const latest = useRef(0);

    const load = (next: number) => {
        setError(null);
        const request = ++latest.current;
        startLoading(async () => {
            const res = await loadPublicBoardRunsAction(
                runnerName,
                entry.categoryId,
                entry.subcategoryKey,
                next,
            );
            if (request !== latest.current) return;
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setRuns((prev) =>
                next === 0 ? res.items : [...(prev ?? []), ...res.items],
            );
            setPage(res.page);
            setHasMore(res.hasMore);
        });
    };

    useEffect(() => {
        load(0);
    }, [runnerName, entry.categoryId, entry.subcategoryKey]);

    const shown = (runs ?? []).filter((r) => r.id !== entry.runId);
    return (
        <>
            {shown.map((run) => (
                <PublicRunRow
                    key={run.id}
                    run={run}
                    entry={entry}
                    gameRef={gameRef}
                    pb={pbIds.has(run.id)}
                />
            ))}
            {runs !== null && shown.length === 0 && !error ? (
                <div className={styles.nestedFoot}>No other finished runs.</div>
            ) : null}
            {runs === null && loading ? (
                <div className={styles.nestedFoot}>Loading…</div>
            ) : null}
            {error ? (
                <div className={styles.nestedFoot}>
                    <span>{error}</span>
                    <button
                        type="button"
                        className={styles.tab}
                        disabled={loading}
                        onClick={() => load(page)}
                    >
                        Try again
                    </button>
                </div>
            ) : null}
            {hasMore && runs !== null ? (
                <div className={styles.nestedFoot}>
                    <button
                        type="button"
                        className={styles.tab}
                        disabled={loading}
                        onClick={() => load(page + 1)}
                    >
                        {loading ? 'Loading…' : 'Show more'}
                    </button>
                </div>
            ) : null}
        </>
    );
}

export type HistoryView = 'pbs' | 'all';

/**
 * A board entry's History: one list of the runner's finished runs on that
 * board, with a switch between the PBs that led to the entry and every run.
 * Anyone sees it; the runner and their moderators also get each run's status
 * and controls.
 */
export function useHistory({
    entry,
    gameRef,
    pbCount,
    renderPbs,
}: {
    entry: LeaderboardsProfileEntry;
    gameRef: string | null;
    pbCount: number;
    /** The PBs view, which the caller already knows how to draw. */
    renderPbs: () => React.ReactNode;
}): { toggle: React.ReactNode; list: React.ReactNode } {
    const { canSee } = useOwnerLayer();
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<HistoryView>(pbCount > 0 ? 'pbs' : 'all');
    const listId = useId();
    const hasRuns = entry.kind === 'run' || pbCount > 0;
    if (!gameRef || !hasRuns) return { toggle: null, list: null };

    const pbIds = new Set(
        (entry.earlierPbs ?? [])
            .map((pb) => pb.runId)
            .filter((id): id is number => id !== null),
    );
    const owner = canSee(entry.gameId);

    return {
        toggle: (
            <button
                type="button"
                className={styles.earlierToggle}
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                onClick={() => setOpen((v) => !v)}
            >
                History
            </button>
        ),
        list: open ? (
            <div id={listId} className={styles.runsNested}>
                <div className={styles.historyBar}>
                    {(['pbs', 'all'] as const).map((v) => (
                        <button
                            key={v}
                            type="button"
                            className={
                                view === v
                                    ? `${styles.tab} ${styles.tabActive}`
                                    : styles.tab
                            }
                            aria-pressed={view === v}
                            onClick={() => setView(v)}
                        >
                            {v === 'pbs' ? 'PBs' : 'All runs'}
                        </button>
                    ))}
                </div>
                {view === 'pbs' ? (
                    renderPbs()
                ) : owner ? (
                    <OwnerRunsList
                        slice={{
                            categoryId: entry.categoryId,
                            subcategoryKey: entry.subcategoryKey,
                        }}
                        board={{ gameId: entry.gameId, gameRef, format: entry }}
                        entry={{
                            kind: entry.kind,
                            id:
                                entry.kind === 'run'
                                    ? entry.runId
                                    : entry.manualTimeId,
                            timeMs: entry.timeMs,
                        }}
                        pbIds={pbIds}
                    />
                ) : (
                    <PublicRunsList
                        entry={entry}
                        gameRef={gameRef}
                        pbIds={pbIds}
                    />
                )}
            </div>
        ) : null,
    };
}
