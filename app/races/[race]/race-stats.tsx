import { Race } from "~app/races/races.types";
import { Col, Row } from "react-bootstrap";
import { TrophyIcon } from "~src/icons/trophy-icon";
import { DurationToFormatted } from "~src/components/util/datetime";
import React from "react";
import { UserLink } from "~src/components/links/links";

export const RaceStats = ({ race }: { race: Race }) => {
    if (
        race.mmrLeaderboards?.length === 0 &&
        race.timeLeaderboards?.length === 0
    ) {
        return;
    }
    return (
        <div className={"game-border bg-body-secondary p-3 rounded mb-2"}>
            <h4 className={"w-100 d-flex justify-content-center"}>Stats</h4>
            <hr />
            <Row>
                <Col sm={6} className={"mb-3 mb-md-1"}>
                    <div className={"fs-5 mb-1"}>Top Ratings</div>
                    {race.mmrLeaderboards.map((stat, i) => {
                        return (
                            <div key={`${stat.user}-mmr`}>
                                <span className={"text-truncate"}>
                                    <TrophyIcon
                                        trophyColor={
                                            i === 0
                                                ? "gold"
                                                : i === 1
                                                  ? "silver"
                                                  : "bronze"
                                        }
                                    />
                                    <b>{stat.mmr}</b> -{" "}
                                    <UserLink
                                        username={stat.user}
                                        url={`/${stat.user}/races`}
                                    />
                                </span>
                            </div>
                        );
                    })}
                </Col>
                <Col sm={6} className={"mb-3 mb-xl-1 px-2"}>
                    <div className={"fs-5 mb-1"}>Top Times This Month</div>
                    {race.timeLeaderboards.map((stat, i) => {
                        return (
                            <div key={`${stat.user}-time`}>
                                <span className={"text-truncate"}>
                                    <TrophyIcon
                                        trophyColor={
                                            i === 0
                                                ? "gold"
                                                : i === 1
                                                  ? "silver"
                                                  : "bronze"
                                        }
                                    />
                                    <b>
                                        <DurationToFormatted
                                            duration={stat.time}
                                            padded
                                        />
                                    </b>{" "}
                                    -{" "}
                                    <UserLink
                                        username={stat.user}
                                        url={`/${stat.user}/races`}
                                    />
                                </span>
                            </div>
                        );
                    })}
                </Col>
            </Row>
        </div>
    );
};
