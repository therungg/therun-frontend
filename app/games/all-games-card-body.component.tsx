"use client";
import React from "react";
import { Card, Col, Row } from "react-bootstrap";
import { UserLink } from "~src/components/links/links";
import { DurationToFormatted } from "~src/components/util/datetime";
import styles from "~src/components/css/Games.module.scss";
import { Game } from "./all-games";

interface AllGamesBodyProps {
    game: Game;
}

export const AllGamesCardBody: React.FunctionComponent<AllGamesBodyProps> = ({
    game,
}) => {
    return (
        <Card.Body className={styles.cardBody}>
            {game.categories.slice(0, 3).map((category) => {
                return (
                    <Row key={category.category}>
                        <Col
                            md={6}
                            sm={5}
                            style={{
                                overflow: "hidden",
                            }}
                        >
                            <b>{category.display}</b>
                        </Col>
                        <Col md={6} sm={7} className={styles.timeUser}>
                            <div
                                style={{
                                    width: "3rem",
                                }}
                            >
                                <DurationToFormatted
                                    duration={
                                        category.gameTime
                                            ? (category.gameTimePb as string)
                                            : category.bestTime
                                    }
                                />{" "}
                                {category.gameTime && "(IGT)"}
                            </div>
                            <div className={styles.userLink}>
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
