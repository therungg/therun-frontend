'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Twitch } from 'react-bootstrap-icons';
import useSWR from 'swr';
import type { LiveRun } from '~app/(new-layout)/live/live.types';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { getFormattedString } from '~src/components/util/datetime';
import { buildBoardHref } from '~src/lib/board-url';
import { fetcher } from '~src/utils/fetcher';
import type { ResolvedCategory } from '../../../../../types/leaderboards.types';
import { RunnerAvatar } from '../leaderboard/runner-avatar';
import {
    isBetweenRuns,
    matchLiveCategory,
    scopeLiveRuns,
    sortLiveRuns,
} from './rail-scope';
import { useRailScope } from './rail-scope-context';
import styles from './sidebar.module.scss';

const LiveDrawer = dynamic(
    () => import('../drawers/live-drawer').then((m) => m.LiveDrawer),
    { ssr: false },
);

const MAX_SHOWN = 5;
/** `/api/live` is CDN-cached 5s / swr 30s, so this is cheap to keep warm. */
const REFRESH_MS = 20_000;
/** Timer tick. Seconds are enough for a rail; the live page owns the tenths. */
const TICK_MS = 1000;
/** Same allowance the live page makes for the payload's transit time. */
const NETWORK_OFFSET_MS = 400;

interface Props {
    gameDisplay: string;
    gameSlug: string;
    categories: ResolvedCategory[];
    board?: ResolvedCategory | null;
}

export function LivePanel({ gameDisplay, gameSlug, categories, board }: Props) {
    const scope = useRailScope();
    const [open, setOpen] = useState(false);
    const { data } = useSWR<LiveRun[]>(
        `/api/live?game=${encodeURIComponent(gameDisplay)}`,
        fetcher,
        { refreshInterval: REFRESH_MS },
    );
    const loading = data === undefined;
    const all = sortLiveRuns(data ?? []);
    const runners = scopeLiveRuns(all, scope, board, categories);
    const shown = runners.slice(0, MAX_SHOWN);

    // One clock for every row. Only ticks while someone is mid-attempt.
    const ticking = shown.some((r) => !isBetweenRuns(r));
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!ticking) return;
        setNow(Date.now());
        const id = setInterval(() => setNow(Date.now()), TICK_MS);
        return () => clearInterval(id);
    }, [ticking]);

    return (
        <section className={styles.panel} aria-labelledby="rail-live">
            <div className={styles.panelHead}>
                <h2
                    id="rail-live"
                    className={`${styles.eyebrow} ${styles.eyebrowLive}`}
                >
                    <span className={styles.liveDot} aria-hidden />
                    Live now
                </h2>
                {!loading && all.length > 0 && (
                    <button
                        type="button"
                        className={styles.quietLink}
                        onClick={() => setOpen(true)}
                    >
                        View all ({all.length})
                    </button>
                )}
            </div>
            {loading ? (
                <div aria-hidden>
                    <div className={styles.skeletonRow} />
                    <div className={styles.skeletonRow} />
                    <div className={styles.skeletonRow} />
                </div>
            ) : runners.length === 0 ? (
                <p className={styles.empty}>
                    {scope === 'board' && all.length > 0
                        ? `No one live on this board. ${all.length} live on other boards.`
                        : 'No one live.'}
                </p>
            ) : (
                <ul className={styles.list}>
                    {shown.map((r) => (
                        <LiveRow
                            key={r.login}
                            run={r}
                            now={now}
                            board={matchLiveCategory(r.category, categories)}
                            gameSlug={gameSlug}
                        />
                    ))}
                </ul>
            )}
            {open && (
                <LiveDrawer
                    show={open}
                    onHide={() => setOpen(false)}
                    gameDisplay={gameDisplay}
                />
            )}
        </section>
    );
}

function LiveRow({
    run,
    now,
    board,
    gameSlug,
}: {
    run: LiveRun;
    now: number;
    board: ResolvedCategory | undefined;
    gameSlug: string;
}) {
    const idle = isBetweenRuns(run);
    return (
        <li
            className={`${styles.personRow} ${idle ? styles.personRowIdle : ''}`}
        >
            <div className={styles.rowTop}>
                <span className={styles.rowUser}>
                    <RunnerAvatar
                        name={run.user}
                        picture={run.picture}
                        size="xs"
                    />
                    <UserLink
                        username={run.user}
                        url={`/live/${encodeURIComponent(run.login)}`}
                    />
                    {run.currentlyStreaming && (
                        <Twitch
                            size={11}
                            className={styles.streamIcon}
                            aria-label="Streaming on Twitch"
                            title="Streaming on Twitch"
                        />
                    )}
                </span>
                {run.category && (
                    <span className={styles.rowMeta}>
                        {board ? (
                            <Link
                                href={buildBoardHref(gameSlug, {
                                    categorySlug: board.name,
                                })}
                                className={styles.rowMetaLink}
                            >
                                {board.display}
                            </Link>
                        ) : (
                            run.category
                        )}
                    </span>
                )}
            </div>
            {idle ? <IdleLine run={run} /> : <PaceLine run={run} now={now} />}
        </li>
    );
}

/** Timer's stopped: say so, and what they're chasing. */
function IdleLine({ run }: { run: LiveRun }) {
    return (
        <div className={styles.rowSub}>
            Between runs
            {run.pb > 0 && (
                <>
                    {' · PB '}
                    <span className={styles.mono}>
                        {getFormattedString(
                            String(run.pb),
                            false,
                            false,
                            false,
                        )}
                    </span>
                </>
            )}
        </div>
    );
}

/**
 * Where the attempt is: elapsed time, split reached (with a hairline
 * progress track), and pace against the runner's comparison. Elapsed is
 * reconstructed from the last payload the way the live page does it, so the
 * clock moves between polls.
 */
function PaceLine({ run, now }: { run: LiveRun; now: number }) {
    const inserted = run.insertedAt
        ? new Date(run.insertedAt).getTime()
        : Number.NaN;
    const elapsed =
        run.currentTime != null && !Number.isNaN(inserted)
            ? run.currentTime + Math.max(0, now - inserted) + NETWORK_OFFSET_MS
            : null;
    const delta = run.delta;
    const showDelta = typeof delta === 'number' && delta !== 0;
    const splitCount = run.splits?.length ?? 0;
    const progress =
        splitCount > 0
            ? Math.min(Math.max(run.currentSplitIndex / splitCount, 0), 1)
            : null;

    return (
        <div className={styles.rowSub}>
            {progress !== null && (
                <div
                    className={styles.progressTrack}
                    role="progressbar"
                    aria-valuenow={Math.round(progress * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Split ${run.currentSplitIndex + 1} of ${splitCount}`}
                    title={`Split ${run.currentSplitIndex + 1} of ${splitCount}`}
                >
                    <div
                        className={styles.progressFill}
                        style={{ width: `${progress * 100}%` }}
                    />
                </div>
            )}
            <span className={styles.paceLine}>
                {elapsed !== null && (
                    <span className={styles.mono}>
                        {getFormattedString(
                            String(elapsed),
                            false,
                            false,
                            false,
                        )}
                    </span>
                )}
                <span className={styles.splitName}>{run.currentSplitName}</span>
                {showDelta && (
                    <span
                        className={`${styles.mono} ${
                            delta <= 0 ? styles.paceAhead : styles.paceBehind
                        }`}
                        title={`vs ${run.currentComparison || 'Personal Best'}`}
                    >
                        {delta <= 0 ? '−' : '+'}
                        {getFormattedString(
                            String(Math.abs(delta)),
                            Math.abs(delta) < 60000,
                            false,
                            true,
                            true,
                        )}
                    </span>
                )}
            </span>
        </div>
    );
}
