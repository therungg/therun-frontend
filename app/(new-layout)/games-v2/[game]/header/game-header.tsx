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
    canModerate?: boolean;
}

export function GameHeader({ game, stats, canManage, canModerate }: Props) {
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
            {(canManage || canModerate) && (
                // One entry into the unified admin console. It opens on the
                // viewer's default pane (the moderation queue for moderators,
                // game/category settings for config-only admins), so a single
                // button serves both — labelled for whichever they primarily do.
                <div className="ms-auto">
                    <Link
                        href={`/games-v2/${game.name}/manage`}
                        className="btn btn-sm btn-outline-secondary"
                    >
                        {canModerate ? 'Moderate' : 'Manage'}
                    </Link>
                </div>
            )}
        </header>
    );
}
