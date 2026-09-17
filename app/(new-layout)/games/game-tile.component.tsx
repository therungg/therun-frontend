'use client';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import React from 'react';
import { Game, GameSort } from '~app/(new-layout)/games/games.types';
import { GameImage } from '~src/components/image/gameimage';
import { DurationToFormatted } from '~src/components/util/datetime';
import { getGameUrl } from './utilities';

interface GameTileProps {
    game: Game;
    sort: GameSort;
}

const statFor = (game: Game, sort: GameSort) => {
    switch (sort) {
        case 'runners':
            return { value: game.uniqueRunners ?? 0, unit: 'runners' };
        case 'pbs':
            return { value: game.totalPbs ?? 0, unit: 'PBs' };
        case 'playtime':
            return { value: null, unit: 'played' };
        default:
            return { value: game.runs30d ?? 0, unit: 'runs, 30d' };
    }
};

export const GameTile: React.FunctionComponent<GameTileProps> = ({
    game,
    sort,
}) => {
    const { theme } = useTheme();
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
                        src={`/logo_${theme}_theme_no_text_transparent.png`}
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
                                {category.gameTime
                                    ? category.bestGameTimeUser
                                    : category.bestTimeUser}
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
