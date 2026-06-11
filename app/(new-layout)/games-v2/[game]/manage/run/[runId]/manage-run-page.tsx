'use client';

import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { RunCard } from './run-card';
import type { ManageRunData } from './types';

interface Props {
    data: ManageRunData;
    canExcludeUsers: boolean;
}

export function ManageRunPage({ data, canExcludeUsers }: Props) {
    const { game, run } = data;

    return (
        <div>
            <header className="d-flex align-items-center gap-3 mb-3">
                {game.image && (
                    <img
                        src={game.image}
                        alt={game.display}
                        width={48}
                        height={64}
                        className="rounded"
                        style={{ aspectRatio: '3 / 4' }}
                        loading="eager"
                    />
                )}
                <div>
                    <small className="text-muted d-block">Manage run</small>
                    <h1 className="mb-0">{game.display}</h1>
                </div>
                <div className="ms-auto">
                    <Link
                        href={`/games-v2/${game.name}`}
                        className="btn btn-sm btn-outline-secondary"
                    >
                        ← Back to leaderboards
                    </Link>
                </div>
            </header>

            <div className="mb-3">
                <div className="d-flex align-items-center gap-2">
                    {run.isGuest ? (
                        <>
                            <strong>{run.runnerName}</strong>
                            <span className="badge text-bg-secondary">
                                guest
                            </span>
                        </>
                    ) : (
                        <UserLink username={run.runnerName} url={undefined} />
                    )}
                </div>
                <small className="text-muted">
                    {run.categoryDisplay}
                    {run.subcategoryKey
                        ? ` · ${run.subcategoryKey.replace(/\|/g, ' · ')}`
                        : ''}
                </small>
            </div>

            <RunCard
                run={run}
                gameSlug={game.name}
                canExcludeUsers={canExcludeUsers}
            />
        </div>
    );
}
