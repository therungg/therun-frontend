import { Tournament } from "./tournament-info";
import useSWR from "swr";
import { fetcher } from "../../pages";
import React from "react";
import { getLeaderboard } from "../game/game-leaderboards";
import { Col, Row } from "react-bootstrap";
import { DurationToFormatted } from "../util/datetime";

export const TournamentStandings = ({
    tournament,
}: {
    tournament: Tournament;
}) => {
    const { data }: { data: Tournament } = useSWR(
        "/api/tournaments/GSA PACE Qualifiers 1",
        fetcher
    );

    if (!data) {
        return <div>Loading data...</div>;
    }

    const points = {};

    tournament.pointDistribution?.forEach((point, index) => {
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
                        pointsLeaderboard,
                        "",
                        (stat) => {
                            return stat;
                        }
                    )}
                </Col>
                <Col>
                    <h2>Standings Heat 1</h2>

                    {getLeaderboard(
                        "Points Heat 1",
                        data.leaderboards?.pbLeaderboard,
                        "",
                        (stat, key) => {
                            return (
                                <div>
                                    {tournament.pointDistribution[key] || 0} (
                                    <DurationToFormatted
                                        duration={stat.toString()}
                                    />
                                    )
                                </div>
                            );
                        }
                    )}
                </Col>
                <Col>
                    <h2>Standings Heat 2</h2>

                    {getLeaderboard(
                        "Points Heat 2",
                        tournament.leaderboards?.pbLeaderboard,
                        "",
                        (stat, key) => {
                            return (
                                <div>
                                    {tournament.pointDistribution[key] || 0} (
                                    <DurationToFormatted
                                        duration={stat.toString()}
                                    />
                                    )
                                </div>
                            );
                        }
                    )}
                </Col>
            </Row>
        </div>
    );
};
