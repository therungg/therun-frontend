"use client";
import React from "react";
import { Card, Col } from "react-bootstrap";
import { AllGamesCardBody } from "./all-games-card-body.component";
import { AllGamesCardHeader } from "./all-games-card-header.component";
import { AllGamesImage } from "./all-games-image.component";
import { Game } from "~app/games/games.types";

interface AllGamesCardProps {
    game: Game;
}

export const AllGamesCard: React.FunctionComponent<AllGamesCardProps> = ({
    game,
}) => {
    return (
        <Col xl={6} lg={12} key={game.game}>
            <AllGamesImage game={game} />
            <Card
                className="card-columns text-nowrap"
                style={{
                    border: "2px var(--bs-secondary-bg) solid",
                    borderRadius: "10px",
                }}
            >
                <AllGamesCardHeader game={game} />
                <AllGamesCardBody game={game} />
            </Card>
        </Col>
    );
};
