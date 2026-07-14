'use client';

import type { UserRanking } from 'types/leaderboards.types';
import { VerificationBadge } from '~app/(new-layout)/games-v2/[game]/run-view/run-badges';
import Link from '~src/components/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import { parseSubcategoryKey } from '~src/lib/run-view/parse-subcategory-key';

interface Props {
    rankings: UserRanking[];
}

export function LeaderboardPbs({ rankings }: Props) {
    const rows = [...rankings].sort((a, b) => {
        const gameCompare = a.game.localeCompare(b.game);
        if (gameCompare !== 0) return gameCompare;
        return a.category.localeCompare(b.category);
    });

    return (
        <table className="table">
            <thead>
                <tr>
                    <th>Game</th>
                    <th>Category</th>
                    <th>Time</th>
                    <th>Rank</th>
                    <th>Verified</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((row) => {
                    const primary =
                        row.primaryTiming === 'gt'
                            ? (row.gameTime ?? row.time)
                            : row.time;

                    return (
                        <tr
                            key={`${row.gameId}-${row.categoryId}-${row.subcategoryKey}`}
                        >
                            <td>
                                <Link href={`/games-v2/${row.gameSlug}`}>
                                    {row.game}
                                </Link>
                            </td>
                            <td>
                                {row.category}
                                {parseSubcategoryKey(row.subcategoryKey).map(
                                    (p) => (
                                        <span
                                            key={p.name}
                                            className="badge text-bg-secondary ms-1"
                                        >
                                            {p.value}
                                        </span>
                                    ),
                                )}
                            </td>
                            <td>
                                <Link
                                    href={`/games-v2/${row.gameSlug}/run/${row.runId}`}
                                >
                                    <DurationToFormatted duration={primary} />
                                </Link>
                            </td>
                            <td>
                                {row.rank != null
                                    ? `#${row.rank} of ${row.totalRunners}`
                                    : '—'}
                            </td>
                            <td>
                                <VerificationBadge
                                    status={row.verificationStatus}
                                />
                            </td>
                            <td>
                                {new Date(row.runDate).toLocaleDateString()}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
