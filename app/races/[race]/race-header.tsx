import { Race, RaceParticipantWithLiveData } from "~app/races/races.types";
import React from "react";
import { PersonIcon } from "~src/icons/person-icon";
import { Card, Col, Row } from "react-bootstrap";
import { RaceParticipantStatusOverview } from "~app/races/components/race-participant-status-overview";
import { RacePlacings } from "~app/races/components/race-placings";
import { LocalizedTime } from "~src/components/util/datetime";
import { safeEncodeURI } from "~src/utils/uri";

export const RaceHeader = ({ race }: { race: Race }) => {
    return (
        <div
            className={"bg-body-secondary mh-100 game-border card border-0"}
            style={{ borderColor: race.status === "aborted" ? "red" : "" }}
        >
            <Card className={`game-border h-100`}>
                <Row style={{ minHeight: "10rem" }}>
                    <Col xs={4} sm={2}>
                        <Card.Img
                            className={
                                "rounded-0 rounded-start me-0 pe-0 h-100 d-inline-block"
                            }
                            style={{
                                minWidth: "5rem",
                                maxHeight: "18rem",
                                maxWidth: "10rem",
                            }}
                            src={
                                race.gameImage && race.gameImage !== "noimage"
                                    ? race.gameImage
                                    : `/logo_dark_theme_no_text_transparent.png`
                            }
                            height={100}
                            width={20}
                        />
                    </Col>
                    <Col
                        xs={8}
                        sm={10}
                        className={"p-2 ps-1 pe-4 d-flex flex-column"}
                    >
                        <div className={"d-flex justify-content-between gap-3"}>
                            <Card.Title
                                className="m-0 p-0 h5 text-truncate"
                                style={{
                                    color: "var(--bs-link-color)",
                                }}
                            >
                                <a
                                    href={`/races/stats/${safeEncodeURI(
                                        race.displayGame,
                                    )}`}
                                >
                                    {race.displayGame}
                                </a>
                            </Card.Title>
                            <span className={"text-nowrap"}>
                                <span className={"me-1"}>
                                    {race.participantCount}
                                </span>
                                <PersonIcon />
                            </span>
                        </div>

                        <div
                            className={
                                "d-flex justify-content-between gap-3 mb-0 pb-2 w-100 border-bottom"
                            }
                        >
                            <div
                                className={
                                    "pb-0 mb-0 w-100 fst-italic text-truncate"
                                }
                            >
                                {race.displayCategory}
                            </div>
                            {race.status === "aborted" && (
                                <div
                                    className={"text-nowrap"}
                                    style={{ color: "red" }}
                                >
                                    Race was aborted
                                </div>
                            )}
                            {race.status !== "aborted" && !race.ranked && (
                                <div className={"text-nowrap fst-italic"}>
                                    Unranked
                                </div>
                            )}
                        </div>

                        {race.customName && (
                            <div className={"pt-1 pb-2"}>
                                <Card.Text className={"text-truncate"}>
                                    {race.customName}
                                </Card.Text>
                            </div>
                        )}
                        <div className={"pt-1"}>
                            <Card.Text className={"text-truncate"}>
                                {race.description}
                            </Card.Text>
                        </div>
                        <div
                            className={
                                "h-100 d-flex align-items-end justify-content-between"
                            }
                        >
                            <div>
                                <RaceParticipantStatusOverview
                                    participants={
                                        race.participants as RaceParticipantWithLiveData[]
                                    }
                                />
                            </div>

                            <div
                                className={
                                    "d-flex align-items-end text-truncate"
                                }
                            >
                                {race.status === "pending" &&
                                    race.willStartAt &&
                                    race.startMethod === "datetime" && (
                                        <span suppressHydrationWarning={true}>
                                            Start time:{" "}
                                            <LocalizedTime
                                                date={
                                                    new Date(race.willStartAt)
                                                }
                                            />
                                        </span>
                                    )}
                                <RacePlacings race={race} />
                            </div>
                        </div>
                    </Col>
                </Row>
            </Card>
        </div>
    );
};
