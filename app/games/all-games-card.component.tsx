"use client";
import React from "react";
import { Card, Col } from "react-bootstrap";
import styles from "~src/components/css/Games.module.scss";
import { AllGamesCardBody } from "./all-games-card-body.component";
import { AllGamesCardHeader } from "./all-games-card-header.component";
import { AllGamesImage } from "./all-games-image.component";
import { Game } from "./all-games";

interface AllGamesCardProps {
    game: Game;
}

export const AllGamesCard: React.FunctionComponent<AllGamesCardProps> = ({
    game,
}) => {
    return (
        <Col xl={6} lg={12} key={game.game}>
            <AllGamesImage game={game} />
            <Card className={`card-columns ${styles.card}`}>
                <AllGamesCardHeader game={game} />
                <AllGamesCardBody game={game} />
            </Card>
        </Col>
    );
};
