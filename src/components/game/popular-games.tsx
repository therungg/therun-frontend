import React from 'react';
import { Row, Table } from 'react-bootstrap';
import { GameImage } from '~src/components/image/gameimage';
import { GameLink, UserLink } from '../links/links';
import { DurationToFormatted } from '../util/datetime';
import { getTabulatedGameStatsPopular } from './get-tabulated-game-stats';

export const PopularGames = async () => {
    const gamestats = await getTabulatedGameStatsPopular();
    return (
        <div>
            <Table striped bordered hover responsive>
                <tbody>
                    {gamestats.map((game) => (
                        <tr key={game.game}>
                            <td className="m-0 p-0">
                                <Row className="g-0 flex-nowrap">
                                    <div
                                        key={game.game}
                                        style={{ flex: '0 0 48px' }}
                                    >
                                        {game.image &&
                                            game.image !== 'noimage' && (
                                                <a
                                                    href={`/games/${game.display}`}
                                                >
                                                    <GameImage
                                                        alt={game.display}
                                                        src={game.image}
                                                        quality="small"
                                                        height={64}
                                                        width={48}
                                                    />
                                                </a>
                                            )}
                                    </div>
                                    <div
                                        className="p-2"
                                        style={{
                                            flex: '0 0 calc(100% - 96px)',
                                        }}
                                    >
                                        <div className="fs-larger">
                                            <GameLink game={game.display}>
                                                {game.display}
                                            </GameLink>
                                        </div>
                                        <div className="fs-smaller">
                                            {game.categories[0].display} in{' '}
                                            {game.categories[0].gameTime ? (
                                                <DurationToFormatted
                                                    duration={
                                                        game.categories[0]
                                                            .gameTimePb as string
                                                    }
                                                    gameTime
                                                />
                                            ) : (
                                                <DurationToFormatted
                                                    duration={
                                                        game.categories[0]
                                                            .bestTime
                                                    }
                                                />
                                            )}{' '}
                                            by{' '}
                                            <UserLink
                                                username={
                                                    game.categories[0].gameTime
                                                        ? game.categories[0]
                                                              .bestGameTimeUser
                                                        : game.categories[0]
                                                              .bestTimeUser
                                                }
                                            />
                                        </div>
                                    </div>
                                </Row>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
};
