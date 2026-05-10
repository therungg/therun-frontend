'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
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
    rt: LeaderboardResponse;
    gt: LeaderboardResponse;
    category: ResolvedCategory;
    gameSlug: string;
    subcategoryHash: string;
}

export function WrCard({ rt, gt, category, gameSlug, subcategoryHash }: Props) {
    const [open, setOpen] = useState(false);
    const primary = category.primaryTiming === 'gt' ? gt : rt;
    const top = primary.entries[0];
    if (!top || top.time === null) return null;

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
                <DurationToFormatted duration={top.time} />
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
                    subcategoryHash={subcategoryHash}
                />
            )}
        </section>
    );
}
