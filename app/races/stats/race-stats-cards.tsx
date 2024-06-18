"use client";

import { GlobalStats } from "~app/races/races.types";
import { Card, Col, Row } from "react-bootstrap";
import {
    DigitGrouping,
    DurationToFormatted,
} from "~src/components/util/datetime";
import React, { ReactElement } from "react";

export const RaceStatsCards = ({
    globalRaceStats,
}: {
    globalRaceStats: GlobalStats;
}) => {
    return (
        <Row>
            <Col lg={12} xl={6}>
                <StatsCard
                    keys={["Total Races", "Total Time", "Average Time"]}
                    values={[
                        // eslint-disable-next-line react/jsx-key
                        <span>
                            {DigitGrouping(globalRaceStats.totalRaces)}
                        </span>,
                        // eslint-disable-next-line react/jsx-key
                        <span>
                            <DurationToFormatted
                                duration={globalRaceStats.totalRaceTime}
                                padded={true}
                            />
                        </span>,
                        // eslint-disable-next-line react/jsx-key
                        <span>
                            <DurationToFormatted
                                duration={globalRaceStats.averageRaceTime}
                                padded={true}
                            />
                        </span>,
                    ]}
                />
            </Col>
            <Col>
                <StatsCard
                    keys={["Races Joined", "Races Finished", "Finish %"]}
                    values={[
                        // eslint-disable-next-line react/jsx-key
                        <span>
                            {DigitGrouping(globalRaceStats.totalParticipations)}
                        </span>,
                        // eslint-disable-next-line react/jsx-key
                        <span>
                            {DigitGrouping(
                                globalRaceStats.totalFinishedParticipations,
                            )}
                        </span>,
                        // eslint-disable-next-line react/jsx-key
                        <span>
                            {(globalRaceStats.finishPercentage * 100).toFixed(
                                2,
                            )}
                        </span>,
                    ]}
                />
            </Col>
        </Row>
    );
};

const StatsCard = ({
    keys,
    values,
}: {
    keys: string[];
    values: ReactElement[];
}) => {
    return (
        <Card
            className={"bg-body-secondary mb-3 game-border px-4 py-3 rounded-3"}
            style={{ minHeight: "8rem" }}
        >
            <Row>
                {keys.map((key, i) => {
                    const value = values[i];
                    return (
                        <Col key={key} className={"flex-center"}>
                            <div>
                                <div className={"flex-center h5"}>{key}</div>
                                <hr />
                                <div className={"flex-center h3"}>{value}</div>
                            </div>
                        </Col>
                    );
                })}
            </Row>
        </Card>
    );
};
