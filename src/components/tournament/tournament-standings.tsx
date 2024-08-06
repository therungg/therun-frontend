import { Tournament } from "./tournament-info";
import React from "react";
import { getLeaderboard } from "../game/game-leaderboards";
import { Col, Row } from "react-bootstrap";
import { DurationToFormatted, LocalizedTime } from "../util/datetime";
import useSWR from "swr";
import { fetcher } from "~src/utils/fetcher";

export const TournamentStandings = () => {
    const { data: tournament1Data }: { data: Tournament } = useSWR(
        "/api/tournaments/PACE Fall 2024 Qualifiers 1",
        fetcher,
    );
    const { data: tournament2Data }: { data: Tournament } = useSWR(
        "/api/tournaments/PACE Fall 2024 Qualifiers 2",
        fetcher,
    );
    const { data: tournament3Data }: { data: Tournament } = useSWR(
        "/api/tournaments/PACE Fall 2024 Qualifiers 3",
        fetcher,
    );

    if (!tournament1Data || !tournament2Data || !tournament3Data) {
        return <div>Loading data...</div>;
    }

    const points = {};

    const allTournaments = [tournament1Data, tournament2Data, tournament3Data];

    allTournaments.forEach((data) => {
        let i = 0;

        if (
            !data.leaderboards ||
            !data.leaderboards.pbLeaderboard ||
            !data.pointDistribution
        )
            return;

        data.leaderboards.pbLeaderboard.forEach((standing) => {
            const pointDistribution = data.pointDistribution as number[];

            if (i > (pointDistribution as number[]).length) return;

            const user = standing.username;
            const point = pointDistribution[i];

            if (
                data.ineligibleUsersForPoints &&
                data.ineligibleUsersForPoints.includes(user)
            ) {
                return;
            }

            if (!points[user]) {
                points[user] = {
                    stat: 0,
                    username: user,
                    url: standing.url,
                };
            }

            points[user].stat += point;

            i++;
        });
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
                {allTournaments.map((data, tournamentIndex) => {
                    const leaderboard =
                        data.leaderboards && data.leaderboards.pbLeaderboard
                            ? data.leaderboards.pbLeaderboard.filter(
                                  (standing) =>
                                      !(
                                          data.ineligibleUsersForPoints &&
                                          data.ineligibleUsersForPoints.includes(
                                              standing.username,
                                          )
                                      ),
                              )
                            : null;
                    const pointDistribution =
                        data.pointDistribution as number[];
                    return (
                        <Col key={data.name}>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h2>Heat {tournamentIndex + 1}</h2>
                                </div>
                                <div>
                                    Starts{" "}
                                    <LocalizedTime
                                        date={new Date(data.startDate)}
                                        asDate={true}
                                    />
                                </div>
                            </div>

                            {getLeaderboard(
                                "Points Heat " + (tournamentIndex + 1),
                                leaderboard &&
                                    leaderboard.length >
                                        pointDistribution.length
                                    ? leaderboard
                                    : pointDistribution.map((_, index) => {
                                          if (
                                              leaderboard !== null &&
                                              leaderboard[index]
                                          ) {
                                              return leaderboard[index];
                                          }
                                          return {
                                              username: "",
                                              stat: 0,
                                              placing: index + 1,
                                          };
                                      }),
                                "",
                                (stat, key) => {
                                    return (
                                        <div>
                                            {(
                                                data.pointDistribution as number[]
                                            )[key] || 0}{" "}
                                            {stat > 0 && (
                                                <span>
                                                    (
                                                    <DurationToFormatted
                                                        duration={stat.toString()}
                                                    />
                                                    )
                                                </span>
                                            )}
                                        </div>
                                    );
                                },
                            )}
                        </Col>
                    );
                })}
            </Row>
        </div>
    );
};
