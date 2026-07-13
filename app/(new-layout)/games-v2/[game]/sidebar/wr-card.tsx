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
        <section className="border rounded p-3 mb-3">
            <div className="d-flex justify-content-between align-items-baseline">
                <small className="text-muted">World Record</small>
                <button
                    type="button"
                    className="btn btn-link btn-sm p-0"
                    onClick={() => setOpen(true)}
                >
                    History
                </button>
            </div>
            <div className="fs-4 fw-bold">
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
                <small className="text-muted">
                    Set {new Date(top.runDate).toLocaleDateString()}
                </small>
            )}
            {top.vodUrl && (
                <div className="mt-2">
                    <a href={top.vodUrl} target="_blank" rel="noreferrer">
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
