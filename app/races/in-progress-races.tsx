"use client";

import { Race, RaceParticipantWithLiveData } from "~app/races/races.types";
import { Card, Col, Row } from "react-bootstrap";
import styles from "../../src/components/css/LiveRun.module.scss";
import { RaceTimer } from "~app/races/[race]/race-timer";
import { RaceParticipantPercentage } from "~app/races/components/race-participant-percentage";

export const InProgressRaces = ({ races }: { races: Race[] }) => {
    if (races.length === 0) {
        return (
            <div className={"flex-center h3"}>
                No races in progress currently
            </div>
        );
    }
    return (
        <Row>
            {races.map((race) => {
                const participants =
                    race.participants as RaceParticipantWithLiveData[];
                const firstPlace = participants[0];
                return (
                    <Col key={race.raceId} className={"mb-3"} xl={6} xs={12}>
                        <a
                            href={`/races/${race.raceId}`}
                            className={"text-decoration-none"}
                        >
                            <Card
                                className={`${styles.liveRunContainer} game-border h-100`}
                            >
                                <Row className={"h-100"}>
                                    <Col xs={4}>
                                        <Card.Img
                                            className={
                                                "rounded-0 rounded-start me-0 pe-0 h-100 d-inline-block"
                                            }
                                            src={race.gameImage}
                                        />
                                    </Col>
                                    <Col
                                        xs={8}
                                        className={
                                            "p-2 ps-1 pe-4 gap-2 d-flex flex-column"
                                        }
                                    >
                                        <div
                                            className={
                                                "d-flex justify-content-between gap-3"
                                            }
                                        >
                                            <Card.Title
                                                className="mb-0"
                                                style={{
                                                    color: "var(--bs-link-color)",
                                                }}
                                            >
                                                {race.displayGame}
                                            </Card.Title>
                                            <span className={"text-nowrap"}>
                                                <span className={"me-1"}>
                                                    {race.participantCount}
                                                </span>
                                                <PersonIcon />
                                            </span>
                                        </div>
                                        <Card.Text
                                            className={
                                                "flex-grow-1 pb-3 mb-1 border-bottom"
                                            }
                                        >
                                            {race.displayCategory}
                                        </Card.Text>
                                        <div
                                            className={
                                                "d-flex flex-column justify-content-end align-items-end text-end"
                                            }
                                        >
                                            #1: {firstPlace.user} (
                                            <RaceParticipantPercentage
                                                participant={firstPlace}
                                            />
                                            )
                                            <span
                                                style={{
                                                    fontSize:
                                                        "clamp(18px, 3vw, 24px)",
                                                }}
                                                className={
                                                    "text-end opacity-50 lh-1 mt-1"
                                                }
                                            >
                                                <RaceTimer race={race} />
                                            </span>
                                        </div>
                                    </Col>
                                </Row>
                            </Card>
                        </a>
                    </Col>
                );
            })}
        </Row>
    );
};

export const PersonIcon = () => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="var(--bs-link-color)"
            className="bi bi-person"
            viewBox="0 2 16 16"
        >
            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z" />
        </svg>
    );
};
