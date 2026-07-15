'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    LeaderboardResponse,
    ResolvedCategory,
} from '../../../../../types/leaderboards.types';
import styles from './sidebar.module.scss';

const WrHistoryDrawer = dynamic(
    () => import('../drawers/wr-history-drawer').then((m) => m.WrHistoryDrawer),
    { ssr: false },
);

interface Props {
    leaderboard: LeaderboardResponse;
    category: ResolvedCategory;
    gameSlug: string;
    subcategoryKey: string;
}

export function WrCard({
    leaderboard,
    category,
    gameSlug,
    subcategoryKey,
}: Props) {
    const [open, setOpen] = useState(false);
    const top = leaderboard.entries[0];
    if (!top || top.time === null) return null;

    const detailHref =
        top.source === 'manual' && top.manualTimeId != null
            ? `/games-v2/${gameSlug}/manual/${top.manualTimeId}`
            : top.runId != null
              ? `/games-v2/${gameSlug}/run/${top.runId}`
              : null;

    return (
        <section className={styles.panel}>
            <div className={styles.panelHead}>
                <span className={styles.eyebrow}>World Record</span>
                <button
                    type="button"
                    className={styles.quietLink}
                    onClick={() => setOpen(true)}
                >
                    History
                </button>
            </div>
            <div className={styles.wrTime}>
                {detailHref ? (
                    <Link href={detailHref} className="text-decoration-none">
                        <DurationToFormatted duration={top.time} />
                    </Link>
                ) : (
                    <DurationToFormatted duration={top.time} />
                )}
            </div>
            <div>
                <UserLink username={top.runnerName} url={undefined} />
            </div>
            {top.runDate && (
                <div className={styles.rowMeta}>
                    Set {new Date(top.runDate).toLocaleDateString()}
                </div>
            )}
            {top.vodUrl && (
                <div className="mt-2">
                    <a
                        href={top.vodUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="small"
                    >
                        Watch VOD
                    </a>
                </div>
            )}
            {open && (
                <WrHistoryDrawer
                    show={open}
                    onHide={() => setOpen(false)}
                    gameSlug={gameSlug}
                    categorySlug={category.name}
                    categoryDisplay={category.display}
                    subcategoryKey={subcategoryKey}
                />
            )}
        </section>
    );
}
