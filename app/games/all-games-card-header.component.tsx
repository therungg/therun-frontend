"use client";
import React from "react";
import { Card } from "react-bootstrap";
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
        <Card.Header className="border-0">
            <div className="overflow-hidden">
                <a href={`/games/${gameUrl}`} className="fs-large">
                    {game.display}
                </a>
                <div className="float-end">
                    <i className="align-self-center">
                        <DurationToFormatted duration={game.sort.toString()} />
                    </i>
                </div>
            </div>
        </Card.Header>
    );
};
