import { Tournament } from "./tournament-info";
import React from "react";
import { getLeaderboard } from "../game/game-leaderboards";
import { Col, Row } from "react-bootstrap";
import { DurationToFormatted } from "../util/datetime";
import useSWR from "swr";
import { fetcher } from "~src/utils/fetcher";

export const TournamentStandings = ({
    tournament,
}: {
    tournament: Tournament;
}) => {
    const { data: tournament1Data }: { data: Tournament } = useSWR(
        "/api/tournaments/PACE 2024 Qualifiers 1",
        fetcher,
    );
    const { data: tournament2Data }: { data: Tournament } = useSWR(
        "/api/tournaments/PACE 2024 Qualifiers 2",
        fetcher,
    );

    if (!tournament1Data || !tournament2Data) {
        return <div>Loading data...</div>;
    }

    const points = {};

    tournament.pointDistribution?.forEach((point, index) => {
        [tournament1Data, tournament2Data].forEach((data) => {
            if (data.leaderboards?.pbLeaderboard[index]) {
                const standing = data.leaderboards?.pbLeaderboard[index];

                const user = standing.username;

                if (!points[user]) {
                    points[user] = {
                        stat: 0,
                        username: user,
                        url: standing.url,
                    };
                }

                points[user].stat += point;
            }
        });

        if (
            tournament.leaderboards &&
            tournament.leaderboards?.pbLeaderboard &&
            tournament.leaderboards?.pbLeaderboard[index]
        ) {
            const standing = tournament.leaderboards?.pbLeaderboard[index];

            const user = standing.username;

            if (!points[user]) {
                points[user] = {
                    stat: 0,
                    username: user,
                    url: standing.url,
                };
            }

            points[user].stat += point;
        }
    });

    const pointsLeaderboard = Array.from(Object.values(points));

    pointsLeaderboard.sort((a, b) => {
        if (a.stat > b.stat) return -1;

        return 1;
    });

    return (
        <div>
            <Row>
                <Col>
                    <h2>Total Live Standings</h2>

                    {getLeaderboard(
                        "Total points",
                        pointsLeaderboard.map((board, i) => {
                            return {
                                ...board,
                                placing: i + 1,
                            };
                        }),
                        "",
                        (stat) => {
                            return stat;
                        },
                    )}
                </Col>
                {/*<Col>*/}
                {/*    <h2>Standings Heat 1</h2>*/}

                {/*    {getLeaderboard(*/}
                {/*        "Points Heat 1",*/}
                {/*        tournament1Data.leaderboards?.pbLeaderboard,*/}
                {/*        "",*/}
                {/*        (stat, key) => {*/}
                {/*            return (*/}
                {/*                <div>*/}
                {/*                    {tournament.pointDistribution[key] || 0} (*/}
                {/*                    <DurationToFormatted*/}
                {/*                        duration={stat.toString()}*/}
                {/*                    />*/}
                {/*                    )*/}
                {/*                </div>*/}
                {/*            );*/}
                {/*        },*/}
                {/*    )}*/}
                {/*</Col>*/}
                {/*<Col>*/}
                {/*    <h2>Standings Heat 2</h2>*/}

                {/*    {getLeaderboard(*/}
                {/*        "Points Heat 2",*/}
                {/*        tournament2Data.leaderboards?.pbLeaderboard,*/}
                {/*        "",*/}
                {/*        (stat, key) => {*/}
                {/*            return (*/}
                {/*                <div>*/}
                {/*                    {tournament.pointDistribution[key] || 0} (*/}
                {/*                    <DurationToFormatted*/}
                {/*                        duration={stat.toString()}*/}
                {/*                    />*/}
                {/*                    )*/}
                {/*                </div>*/}
                {/*            );*/}
                {/*        },*/}
                {/*    )}*/}
                {/*</Col>*/}
                <Col>
                    <h2>Standings Heat 1</h2>

                    {getLeaderboard(
                        "Points Heat 1",
                        tournament1Data.leaderboards?.pbLeaderboard,
                        "",
                        (stat, key) => {
                            return (
                                <div>
                                    {tournament1Data.pointDistribution[key] ||
                                        0}{" "}
                                    (
                                    <DurationToFormatted
                                        duration={stat.toString()}
                                        padded
                                    />
                                    )
                                </div>
                            );
                        },
                    )}
                </Col>
                <Col>
                    <h2>Standings Heat 2</h2>

                    {getLeaderboard(
                        "Points Heat 2",
                        tournament2Data.leaderboards?.pbLeaderboard,
                        "",
                        (stat, key) => {
                            return (
                                <div>
                                    {tournament2Data.pointDistribution[key] ||
                                        0}{" "}
                                    (
                                    <DurationToFormatted
                                        duration={stat.toString()}
                                        padded
                                    />
                                    )
                                </div>
                            );
                        },
                    )}
                </Col>
                <Col>
                    <h2>Standings Heat 3</h2>

                    {getLeaderboard(
                        "Points Heat 3",
                        tournament.leaderboards?.pbLeaderboard,
                        "",
                        (stat, key) => {
                            return (
                                <div>
                                    {tournament.pointDistribution[key] || 0} (
                                    <DurationToFormatted
                                        duration={stat.toString()}
                                        padded
                                    />
                                    )
                                </div>
                            );
                        },
                    )}
                </Col>
            </Row>
        </div>
    );
};
