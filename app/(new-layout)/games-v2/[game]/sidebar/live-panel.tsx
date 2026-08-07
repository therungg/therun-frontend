'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import useSWR from 'swr';
import type { LiveRun } from '~app/(new-layout)/live/live.types';
import { getFormattedString } from '~src/components/util/datetime';
import { fetcher } from '~src/utils/fetcher';
import { RunnerAvatar } from '../leaderboard/runner-avatar';
import styles from './sidebar.module.scss';

const LiveDrawer = dynamic(
    () => import('../drawers/live-drawer').then((m) => m.LiveDrawer),
    { ssr: false },
);

interface Props {
    gameDisplay: string;
}

export function LivePanel({ gameDisplay }: Props) {
    const [open, setOpen] = useState(false);
    const { data } = useSWR<LiveRun[]>(
        `/api/live?game=${encodeURIComponent(gameDisplay)}`,
        fetcher,
    );
    const runners = data ?? [];
    const loading = data === undefined;

    return (
        <section className={styles.panel}>
            <div className={styles.panelHead}>
                <span className={`${styles.eyebrow} ${styles.eyebrowLive}`}>
                    <span className={styles.liveDot} aria-hidden />
                    Live now
                </span>
                {!loading && runners.length > 0 && (
                    <button
                        type="button"
                        className={styles.quietLink}
                        onClick={() => setOpen(true)}
                    >
                        View all ({runners.length})
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
                <p className="text-muted mb-0">
                    No one is live for this game right now.
                </p>
            ) : (
                <ul className="list-unstyled mb-0">
                    {runners.slice(0, 5).map((r) => (
                        <li key={r.login} className={styles.pbRow}>
                            <div className={styles.pbTop}>
                                <span className={styles.rowUser}>
                                    <RunnerAvatar
                                        name={r.user}
                                        picture={r.picture}
                                        size="xs"
                                    />
                                    <a
                                        href={r.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-decoration-none"
                                    >
                                        {r.user}
                                    </a>
                                </span>
                                {r.category && (
                                    <span className={styles.rowMeta}>
                                        {r.category}
                                    </span>
                                )}
                            </div>
                            <PaceLine run={r} />
                        </li>
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

/**
 * Where the run is and how it's pacing — the payload already carries the
 * current split and the delta vs the runner's comparison; the old panel
 * showed none of it. Nothing renders between attempts (reset / not started).
 */
function PaceLine({ run }: { run: LiveRun }) {
    if (run.hasReset || run.currentSplitIndex < 0 || !run.currentSplitName) {
        return null;
    }
    const delta = run.delta;
    const showDelta = typeof delta === 'number' && delta !== 0;
    // How deep into the run the attempt is, by split — currentSplitIndex is
    // the split in progress, so completed = index. Minified payloads always
    // carry the splits array; guard anyway so a malformed run just loses
    // its bar, not the row.
    const splitCount = run.splits?.length ?? 0;
    const progress =
        splitCount > 0
            ? Math.min(Math.max(run.currentSplitIndex / splitCount, 0), 1)
            : null;
    return (
        <div className={styles.pbMeta}>
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
            {run.currentSplitName}
            {showDelta && (
                <>
                    {' · '}
                    <span
                        className={
                            delta <= 0 ? styles.paceAhead : styles.paceBehind
                        }
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
                </>
            )}
        </div>
    );
}
