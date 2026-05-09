import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    QuickStats,
    ResolvedGame,
} from '../../../../../types/leaderboards.types';

interface Props {
    game: ResolvedGame;
    stats: QuickStats;
}

export function GameHeader({ game, stats }: Props) {
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
        </header>
    );
}
