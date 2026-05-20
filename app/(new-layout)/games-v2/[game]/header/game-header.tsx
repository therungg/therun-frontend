import Link from 'next/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    QuickStats,
    ResolvedGame,
} from '../../../../../types/leaderboards.types';

interface Props {
    game: ResolvedGame;
    stats: QuickStats;
    canManage?: boolean;
}

export function GameHeader({ game, stats, canManage }: Props) {
    return (
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
                <h1 className="mb-0">{game.display}</h1>
                <small className="text-muted">
                    {stats.uniqueRunners.toLocaleString()} runners ·{' '}
                    <DurationToFormatted duration={stats.totalRunTime} /> total
                </small>
            </div>
            {canManage && (
                <div className="ms-auto d-flex gap-2">
                    <Link
                        href={`/games-v2/${game.name}/manage`}
                        className="btn btn-sm btn-outline-secondary"
                    >
                        Manage
                    </Link>
                </div>
            )}
        </header>
    );
}
