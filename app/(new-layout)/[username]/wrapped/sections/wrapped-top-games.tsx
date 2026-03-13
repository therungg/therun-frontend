import React, { memo, useMemo } from 'react';
import { Row } from 'react-bootstrap';
import { GameImage } from '~src/components/image/gameimage';
import { TruncatedTextTooltip } from '~src/components/tooltip';
import { DurationToFormatted } from '~src/components/util/datetime';
import { TrophyIcon } from '~src/icons/trophy-icon';
import { WrappedCounter } from '../wrapped-counter';
import { WrappedWithData } from '../wrapped-types';
import { SectionBody } from './section-body';
import { SectionTitle } from './section-title';
import { SectionWrapper } from './section-wrapper';

interface WrappedTopGamesProps {
    wrapped: WrappedWithData;
}

export const WrappedTopGames = memo<WrappedTopGamesProps>(({ wrapped }) => {
    const topGames = useMemo(() => {
        return wrapped.playtimeData.playtimePerYearMap[wrapped.year].perGame;
    }, [wrapped.playtimeData.playtimePerYearMap, wrapped.year]);

    const gameMap = useMemo(() => {
        return new Map(wrapped.gamesData.map((game) => [game.display, game]));
    }, [wrapped.gamesData]);

    const gameEntries = useMemo(() => {
        return Object.entries(topGames)
            .map(([key, value]) => {
                return { game: key, total: value.total };
            })
            .sort((a, b) => b.total - a.total);
    }, [topGames]);

    const top3Games = useMemo(
        () =>
            gameEntries.slice(0, 3).map((entry) => {
                let gameMapEntry = gameMap.get(entry.game);

                if (!gameMapEntry) {
                    gameMap.forEach((val) => {
                        if (
                            val.display.toLowerCase() ===
                            entry.game.toLowerCase()
                        ) {
                            gameMapEntry = val;
                        }
                    });
                }

                return {
                    ...gameMapEntry,
                    total: entry.total,
                };
            }),
        [gameEntries, gameMap],
    );
    const { title, subtitle, extraRemark } = useMemo(() => {
        if (gameEntries.length > 1) {
            return {
                title: (
                    <>
                        {' '}
                        This year, you did runs for{' '}
                        <WrappedCounter
                            id="game-entries-count"
                            end={wrapped.totalGames}
                        />{' '}
                        games.
                    </>
                ),
                subtitle: 'Here are your favourites.',
                extraRemark:
                    "(actually, they might be your least favourite. but you played them a lot, so hey, that's on you.)",
            };
        }

        return {
            title: <span>This year, you only ran one single game.</span>,
            subtitle: "I'm not going to judge you on that",
            extraRemark:
                '(but i designed this section to show multiple games, so you kind of ruined that for me)',
        };
    }, [gameEntries]);

    return (
        <SectionWrapper>
            <SectionTitle
                title={title}
                subtitle={subtitle}
                extraRemark={extraRemark}
            />
            <SectionBody>
                <Row className="w-100 row-cols-1 row-cols-md-2 row-cols-xl-3 mx-auto g-5 justify-content-center podium-xl mw-75r">
                    {top3Games.map(({ display, total = 0, image }, i) => {
                        return (
                            <div key={`${display}-${i}`}>
                                <div className="card h-100">
                                    <div className="card-header d-flex align-items-center justify-content-between">
                                        <span className="h2 mb-0 fw-bold">
                                            <span className="me-2">
                                                #{i + 1}
                                            </span>
                                            <TrophyIcon
                                                size={34}
                                                trophyColor={
                                                    i === 0
                                                        ? 'gold'
                                                        : i === 1
                                                          ? 'silver'
                                                          : 'bronze'
                                                }
                                            />
                                        </span>
                                        <div>
                                            Total playtime:{' '}
                                            <b>
                                                <DurationToFormatted
                                                    duration={total}
                                                />
                                            </b>
                                        </div>
                                    </div>
                                    <GameImage
                                        alt={display}
                                        src={image || ''}
                                        quality="sd"
                                        className="card-img-top h-100"
                                        autosize
                                    />
                                    <div className="card-footer fw-bold">
                                        <h3>
                                            <TruncatedTextTooltip
                                                text={display ?? ''}
                                            />
                                        </h3>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </Row>
            </SectionBody>
        </SectionWrapper>
    );
});
WrappedTopGames.displayName = 'WrappedTopGames';
