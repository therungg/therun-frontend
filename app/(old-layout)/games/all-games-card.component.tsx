"use client";
import React from "react";
import { Card, Col } from "react-bootstrap";
import { AllGamesCardBody } from "./all-games-card-body.component";
import { AllGamesCardHeader } from "./all-games-card-header.component";
import { AllGamesImage } from "./all-games-image.component";
import { Game } from "~app/(old-layout)/games/games.types";

interface AllGamesCardProps {
    game: Game;
}

export const AllGamesCard: React.FunctionComponent<AllGamesCardProps> = ({
    game,
}) => {
    return (
        <Col xl={6} lg={12} key={game.game}>
            <AllGamesImage game={game} />
            <Card className="game-card card-columns text-nowrap">
                <AllGamesCardHeader game={game} />
                <AllGamesCardBody game={game} />
            </Card>
        </Col>
    );
};
