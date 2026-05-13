'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import useSWR from 'swr';
import type { LiveRun } from '~app/(new-layout)/live/live.types';
import { fetcher } from '~src/utils/fetcher';

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
        <section className="border rounded p-3 mb-3">
            <div className="d-flex justify-content-between align-items-baseline mb-2">
                <small className="text-muted">Live now</small>
                {!loading && runners.length > 0 && (
                    <button
                        type="button"
                        className="btn btn-link btn-sm p-0"
                        onClick={() => setOpen(true)}
                    >
                        View all ({runners.length})
                    </button>
                )}
            </div>
            {loading ? (
                <p className="text-muted mb-0">Loading…</p>
            ) : runners.length === 0 ? (
                <p className="text-muted mb-0">
                    No one is live for this game right now.
                </p>
            ) : (
                <ul className="list-unstyled mb-0">
                    {runners.slice(0, 5).map((r) => (
                        <li
                            key={r.login}
                            className="d-flex justify-content-between align-items-baseline"
                        >
                            <a
                                href={r.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-decoration-none"
                            >
                                {r.user}
                            </a>
                            {r.category && (
                                <small className="text-muted">
                                    {r.category}
                                </small>
                            )}
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
