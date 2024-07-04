"use client";

import { Card, Col, Row } from "react-bootstrap";
import { RaceTimer } from "~app/races/[race]/race-timer";
import { RaceParticipantStatusOverview } from "~app/races/components/race-participant-status-overview";
import { RacePlacings } from "~app/races/components/race-placings";
import { Race, RaceParticipantWithLiveData } from "~app/races/races.types";
import { ClockIcon } from "~src/icons/clock-icon";
import { PersonIcon } from "~src/icons/person-icon";
import styles from "../../src/components/css/LiveRun.module.scss";

export const InProgressRaces = ({ races }: { races: Race[] }) => {
    if (races.length === 0) {
        return (
            <div className="flex-center h3">
                <div className="d-flex flex-column text-center">
                    <p>No races in progress currently.</p>
                    <p>
                        Go check out some <a href="/live">live runs</a> while
                        you wait!
                    </p>
                </div>
            </div>
        );
    }
    return (
        <Row>
            {races.map((race) => {
                return (
                    <Col key={race.raceId} xl={6} lg={12} xs={12}>
                        <a
                            href={`/races/${race.raceId}`}
                            className="text-decoration-none"
                        >
                            <Card
                                className={`${styles.liveRunContainer} game-border h-100`}
                            >
                                <Row className="flex-grow-1">
                                    <Col xs={4}>
                                        <Card.Img
                                            className="rounded-0 rounded-start me-0 pe-0 h-100 d-inline-block"
                                            src={
                                                race.gameImage &&
                                                race.gameImage !== "noimage"
                                                    ? race.gameImage
                                                    : `/logo_dark_theme_no_text_transparent.png`
                                            }
                                            height={100}
                                            width={20}
                                        />
                                    </Col>
                                    <Col
                                        xs={8}
                                        className="p-2 ps-1 pe-4 d-flex flex-column"
                                    >
                                        <div className="d-flex justify-content-between gap-3">
                                            <Card.Title
                                                className="m-0 p-0 h5 text-truncate"
                                                style={{
                                                    color: "var(--bs-link-color)",
                                                }}
                                            >
                                                {race.displayGame}
                                            </Card.Title>
                                            <span className="text-nowrap">
                                                <span className="me-1">
                                                    {race.participantCount}
                                                </span>
                                                <PersonIcon />
                                            </span>
                                        </div>

                                        <div className="d-flex justify-content-between gap-3 mb-0 pb-2 w-100 border-bottom">
                                            <div className="pb-0 mb-0 w-100 fst-italic text-truncate">
                                                {race.displayCategory}
                                            </div>
                                            <span className="d-flex justify-content-center align-items-end text-center">
                                                <span>
                                                    <RaceTimer race={race} />
                                                </span>
                                                <ClockIcon />
                                            </span>
                                        </div>

                                        <div className="pt-1">
                                            <Card.Text className="text-truncate">
                                                {race.customName}
                                            </Card.Text>
                                        </div>
                                        <div className="h-100 d-flex align-items-end justify-content-between">
                                            <div>
                                                <RaceParticipantStatusOverview
                                                    participants={
                                                        race.participants as RaceParticipantWithLiveData[]
                                                    }
                                                />
                                            </div>

                                            <div className="d-flex align-items-end text-truncate">
                                                <Card.Text>
                                                    <RacePlacings race={race} />
                                                </Card.Text>
                                            </div>
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
