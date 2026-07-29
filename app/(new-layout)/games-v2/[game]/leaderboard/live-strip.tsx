'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import useSWR from 'swr';
import type { LiveRun } from '~app/(new-layout)/live/live.types';
import { fetcher } from '~src/utils/fetcher';
import styles from './leaderboard.module.scss';
import { RunnerAvatar } from './runner-avatar';

const LiveDrawer = dynamic(
    () => import('../drawers/live-drawer').then((m) => m.LiveDrawer),
    { ssr: false },
);

interface Props {
    gameDisplay: string;
    categoryDisplay: string;
}

/**
 * One-row strip above the table when someone is running THIS board's
 * category right now — the live data speedrun.com structurally can't show.
 * Shares LivePanel's SWR key, so it costs zero extra requests; renders
 * nothing while loading, on error, or when no live run matches.
 */
export function LiveStrip({ gameDisplay, categoryDisplay }: Props) {
    const [open, setOpen] = useState(false);
    const { data } = useSWR<LiveRun[]>(
        `/api/live?game=${encodeURIComponent(gameDisplay)}`,
        fetcher,
    );
    const matches = (data ?? []).filter(
        (r) =>
            r.category &&
            r.category.trim().toLowerCase() ===
                categoryDisplay.trim().toLowerCase(),
    );
    if (matches.length === 0) return null;
    const first = matches[0];
    const others = matches.length - 1;

    return (
        <div className={styles.liveStrip}>
            <span className={styles.liveStripDot} aria-hidden />
            <RunnerAvatar name={first.user} picture={first.picture} size="xs" />
            <span className={styles.liveStripText}>
                <a
                    href={first.url}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.liveStripLink}
                >
                    {first.user}
                </a>{' '}
                is running {categoryDisplay} right now
            </span>
            {others > 0 && (
                <button
                    type="button"
                    className={styles.liveStripMore}
                    onClick={() => setOpen(true)}
                >
                    +{others} more live
                </button>
            )}
            {open && (
                <LiveDrawer
                    show={open}
                    onHide={() => setOpen(false)}
                    gameDisplay={gameDisplay}
                />
            )}
        </div>
    );
}
