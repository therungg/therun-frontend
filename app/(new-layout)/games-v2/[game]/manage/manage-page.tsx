'use client';

import Link from 'next/link';
import type { ManagePageData } from './types';

interface Props {
    data: ManagePageData;
}

export function ManagePage({ data }: Props) {
    return (
        <div>
            <header className="d-flex align-items-center gap-3 mb-3">
                {data.game.image && (
                    <img
                        src={data.game.image}
                        alt={data.game.display}
                        width={48}
                        height={64}
                        className="rounded"
                        style={{ aspectRatio: '3 / 4' }}
                        loading="eager"
                    />
                )}
                <div>
                    <small className="text-muted d-block">Management</small>
                    <h1 className="mb-0">{data.game.display}</h1>
                </div>
                <div className="ms-auto">
                    <Link
                        href={`/games-v2/${data.game.name}`}
                        className="btn btn-sm btn-outline-secondary"
                    >
                        ← Back to leaderboards
                    </Link>
                </div>
            </header>

            <section>
                <h2 className="h5 mb-3">Minimum Times</h2>
                <p className="text-muted">Section coming online…</p>
            </section>
        </div>
    );
}
