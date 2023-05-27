import { Game } from "../../pages/games";
import { Image, Table } from "react-bootstrap";
import styles from "../css/GamesTable.module.scss";
import { GameLink, UserLink } from "../links/links";
import { DurationToFormatted } from "../util/datetime";
import React from "react";

interface PopularGamesProps {
    gamestats: Game[];
}

export const PopularGames: React.FC<PopularGamesProps> = ({ gamestats }) => {
    return (
        <div>
            <Table striped bordered hover responsive>
                <tbody>
                    {gamestats.map((game) => (
                        <tr key={game.game}>
                            <td style={{ margin: 0, padding: 0 }}>
                                <div
                                    key={game.game}
                                    className={styles.popularGameImage}
                                >
                                    {game.image && game.image !== "noimage" && (
                                        <a href={`/game/${game.display}`}>
                                            <Image
                                                alt={"Game Image"}
                                                src={game.image}
                                                height={61}
                                            />
                                        </a>
                                    )}
                                </div>
                                <div className={styles.popularGameContainer}>
                                    <div className={styles.game}>
                                        <GameLink game={game.display}>
                                            {game.display}
                                        </GameLink>
                                    </div>
                                    <div className={styles.popularGame}>
                                        {game.categories[0].display} in{" "}
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
                                                    game.categories[0].bestTime
                                                }
                                            />
                                        )}{" "}
                                        by{" "}
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
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
};
