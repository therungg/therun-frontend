"use client";
import React from "react";
import { Card } from "react-bootstrap";
import styles from "~src/components/css/Games.module.scss";
import { DurationToFormatted } from "~src/components/util/datetime";
import { getGameUrl } from "./utilities";
import { Game } from "~app/games/games.types";

interface AllGamesCardHeaderProps {
    game: Game;
}

export const AllGamesCardHeader: React.FunctionComponent<
    AllGamesCardHeaderProps
> = ({ game }) => {
    const gameUrl = getGameUrl(game);
    return (
        <Card.Header className={styles.cardHeader}>
            <div style={{ overflow: "hidden" }}>
                <a href={`/games/${gameUrl}`} style={{ fontSize: "large" }}>
                    {game.display}
                </a>
                <div style={{ float: "right" }}>
                    <i
                        style={{
                            alignSelf: "center",
                        }}
                    >
                        <DurationToFormatted duration={game.sort.toString()} />
                    </i>
                </div>
            </div>
        </Card.Header>
    );
};
