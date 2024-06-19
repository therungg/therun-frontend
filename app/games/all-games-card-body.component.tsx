"use client";
import React from "react";
import { Card, Col, Row } from "react-bootstrap";
import { UserLink } from "~src/components/links/links";
import { DurationToFormatted } from "~src/components/util/datetime";
import { Game } from "~app/games/games.types";

interface AllGamesBodyProps {
    game: Game;
}

export const AllGamesCardBody: React.FunctionComponent<AllGamesBodyProps> = ({
    game,
}) => {
    return (
        <Card.Body>
            {game.categories.slice(0, 3).map((category) => {
                return (
                    <Row key={category.category}>
                        <Col md={6} sm={5} className="overflow-hidden">
                            <b>{category.display}</b>
                        </Col>
                        <Col md={6} sm={7} className="d-flex">
                            <div className="w-3r">
                                <DurationToFormatted
                                    duration={
                                        category.gameTime
                                            ? (category.gameTimePb as string)
                                            : category.bestTime
                                    }
                                    padded
                                />{" "}
                                {category.gameTime && "(IGT)"}
                            </div>
                            <div className="d-flex justify-content-end align-items-center w-100">
                                <UserLink
                                    username={
                                        category.gameTime
                                            ? (category.bestGameTimeUser as string)
                                            : category.bestTimeUser
                                    }
                                />
                            </div>
                        </Col>
                        <br />
                    </Row>
                );
            })}
            {game.categories.length < 3 &&
                game.categories.map((_n, i) => <br key={i} />)}
        </Card.Body>
    );
};
