import Image from 'next/image';
import { Panel } from '~app/(new-layout)/components/panel.component';
import { GameLink } from '~src/components/links/links';
import { getGameImageMap, getMostActiveGames } from '~src/lib/highlights';

export async function MostActiveGames() {
    const [games, gameImages] = await Promise.all([
        getMostActiveGames('week'),
        getGameImageMap(),
    ]);

    // Filter to multi-runner games and take top 15
    const filtered = games
        .filter((g) => parseInt(g.uniqueRunners) > 1)
        .slice(0, 15);

    return (
        <Panel
            subtitle="What people are running"
            title="Trending This Week"
            link={{ url: '/games', text: 'View All Games' }}
            className="p-3"
        >
            <div className="d-flex flex-column gap-2">
                {filtered.map((game, i) => {
                    const imageUrl =
                        gameImages[game.game] ||
                        '/logo_dark_theme_no_text_transparent.png';
                    const runners = parseInt(game.uniqueRunners);
                    const runs = parseInt(game.runCount);

                    return (
                        <div
                            key={game.game}
                            className="d-flex align-items-center gap-3 border rounded-3 px-2 py-2"
                        >
                            {/* Rank */}
                            <span
                                className="fw-bold text-muted font-monospace"
                                style={{
                                    width: '1.5rem',
                                    textAlign: 'right',
                                    fontSize: '0.85rem',
                                }}
                            >
                                {i + 1}
                            </span>

                            {/* Game image */}
                            <div
                                style={{
                                    width: 36,
                                    height: 48,
                                    position: 'relative',
                                    minWidth: 36,
                                    borderRadius: 6,
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                }}
                            >
                                <Image
                                    src={imageUrl}
                                    fill
                                    style={{ objectFit: 'cover' }}
                                    alt={game.game}
                                />
                            </div>

                            {/* Game info */}
                            <div
                                className="flex-grow-1"
                                style={{ minWidth: 0 }}
                            >
                                <div className="fw-bold text-truncate">
                                    <GameLink game={game.game}>
                                        {game.game}
                                    </GameLink>
                                </div>
                                <div
                                    className="text-muted"
                                    style={{ fontSize: '0.8rem' }}
                                >
                                    {runners.toLocaleString()} runner
                                    {runners !== 1 ? 's' : ''} &middot;{' '}
                                    {runs.toLocaleString()} runs
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Panel>
    );
}
