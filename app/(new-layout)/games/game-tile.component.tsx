'use client';
import Image from 'next/image';
import React from 'react';
import { useFallbackImage } from '~app/(new-layout)/frontpage/components/use-fallback-image';
import { Category, Game, GameSort } from '~app/(new-layout)/games/games.types';
import { GameImage } from '~src/components/image/gameimage';
import { DurationToFormatted } from '~src/components/util/datetime';
import { rendersAsRoster, rosterNames } from '~src/lib/run-view/roster';
import { getGameUrl } from './utilities';

interface GameTileProps {
    game: Game;
    sort: GameSort;
}

/**
 * Who holds the record the tile is showing. A team record names the whole
 * team — the record is theirs together, and naming whoever filed it is the
 * wrong answer to "who holds this". Solo records name the one runner, as
 * before: a solo record carries no roster at all.
 *
 * The two clocks are two different records, often two different teams, so
 * each reads its own roster.
 */
const recordHolders = (category: Category): string | null | undefined => {
    const filer = category.gameTime
        ? category.bestGameTimeUser
        : category.bestTimeUser;
    const roster = category.gameTime
        ? category.bestGameTimeParticipants
        : category.bestTimeParticipants;
    if (!rendersAsRoster(roster, { runnerName: filer ?? '' })) return filer;
    return rosterNames(roster) ?? filer;
};

const statFor = (game: Game, sort: GameSort) => {
    switch (sort) {
        case 'runners':
            return { value: game.uniqueRunners ?? 0, unit: 'runners' };
        case 'pbs':
            return { value: game.totalPbs ?? 0, unit: 'PBs' };
        case 'playtime':
            return { value: null, unit: 'played' };
        default:
            // No window on the unit: every tile carried the same ", 30d" and
            // it reads as noise repeated 24 times down the grid. The heading
            // states the window once (see all-games-paginated.tsx).
            return { value: game.runs30d ?? 0, unit: 'runs' };
    }
};

export const GameTile: React.FunctionComponent<GameTileProps> = ({
    game,
    sort,
}) => {
    const fallbackImage = useFallbackImage();
    const gameUrl = getGameUrl(game);
    const hasImage = !!game.image && game.image !== 'noimage';
    const stat = statFor(game, sort);

    return (
        <a href={`/games/${gameUrl}`} className="game-tile">
            <div className="game-tile-art">
                {hasImage && (
                    <GameImage
                        alt={game.display}
                        src={game.image as string}
                        quality="medium"
                        width={148}
                        height={197}
                    />
                )}
                {!hasImage && (
                    <Image
                        unoptimized
                        alt={game.display}
                        src={fallbackImage}
                        width={148}
                        height={197}
                    />
                )}
                {game.index !== undefined && (
                    <span className="game-tile-rank">#{game.index}</span>
                )}
                <div className="game-tile-peek">
                    {game.categories.slice(0, 3).map((category) => (
                        <div
                            className="game-tile-peek-row"
                            key={category.category}
                        >
                            <div className="game-tile-peek-cat">
                                <span className="nm">{category.display}</span>
                                <span className="tm">
                                    <DurationToFormatted
                                        duration={
                                            category.gameTime
                                                ? (category.gameTimePb as string)
                                                : category.bestTime
                                        }
                                    />
                                </span>
                            </div>
                            <div className="game-tile-peek-who">
                                {recordHolders(category)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="game-tile-meta">
                <div className="game-tile-name">{game.display}</div>
                <div className="game-tile-stat">
                    <span className="n">
                        {stat.value === null ? (
                            <DurationToFormatted
                                duration={game.sort.toString()}
                            />
                        ) : (
                            stat.value.toLocaleString()
                        )}
                    </span>{' '}
                    {stat.unit}
                </div>
            </div>
        </a>
    );
};
