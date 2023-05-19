import { Col, Row, Table } from "react-bootstrap";
import { getLeaderboard } from "../game/game-leaderboards";
import { DurationToFormatted } from "../util/datetime";
import React, { useState } from "react";
import { GameStats } from "../game/game-stats";
import WrHistory from "./wr-history";
import { UserLink } from "../links/links";

export interface WrHistoryStat {
    timeHeldWr: number;
    improvedWr: number;
    user: string;
}

export const TournamentStats = ({ data, tournament, gameTime = true }) => {
    const [leaderboard, setLeaderboard] = useState(gameTime ? "pbIGT" : "pb");

    if (!data) return <div>Loading data...</div>;

    const leaderboards = gameTime
        ? tournament.leaderboards.gameTime
        : tournament.leaderboards;

    if (!leaderboards || !leaderboards.pbLeaderboard) {
        return <div>No data yet...</div>;
    }

    data.stats.totalPlayers = leaderboards.pbLeaderboard.length;

    return (
        <div>
            <Row>
                <Col xl={3} lg={6} md={12}>
                    <h3>Top 10 leaderboards</h3>
                    <div style={{ marginBottom: "1rem" }}>
                        <select
                            className={"form-select"}
                            onChange={(e) => {
                                setLeaderboard(e.target.value);
                            }}
                        >
                            {gameTime && (
                                <option
                                    key={"pbIGT"}
                                    title={"Tournament PB"}
                                    value={"pbIGT"}
                                >
                                    Tournament PB (IGT)
                                </option>
                            )}
                            <option
                                key={"pb"}
                                title={"Tournament PB"}
                                value={"pb"}
                            >
                                Tournament PB
                            </option>
                            <option
                                key={"attempts"}
                                title={"Total Attempts"}
                                value={"attempts"}
                            >
                                Total Attempts
                            </option>

                            <option
                                key={"finishedAttempts"}
                                title={"Total Finished Attempts"}
                                value={"finishedAttempts"}
                            >
                                Total Finished Attempts
                            </option>

                            <option
                                key={"playtime"}
                                title={"Total Playtime"}
                                value={"playtime"}
                            >
                                Total Playtime
                            </option>
                        </select>
                    </div>
                    {gameTime && leaderboards && (
                        <span>
                            {leaderboard == "pbIGT" && (
                                <div>
                                    {getLeaderboard(
                                        "Tournament PB (IGT)",
                                        leaderboards.pbLeaderboard.slice(0, 10),
                                        "",
                                        (stat) => {
                                            return (
                                                <DurationToFormatted
                                                    duration={stat.toString()}
                                                />
                                            );
                                        }
                                    )}
                                </div>
                            )}
                            {leaderboard == "pb" && (
                                <div>
                                    {getLeaderboard(
                                        "Personal Best",
                                        leaderboards.pbLeaderboard.slice(0, 10),
                                        "",
                                        (stat) => {
                                            return (
                                                <DurationToFormatted
                                                    duration={stat.toString()}
                                                />
                                            );
                                        }
                                    )}
                                </div>
                            )}
                            {leaderboard == "sob" && (
                                <div>
                                    {getLeaderboard(
                                        "Sum of Bests",
                                        leaderboards.sumOfBestsLeaderboard.slice(
                                            0,
                                            10
                                        ),
                                        "",
                                        (stat) => {
                                            return (
                                                <DurationToFormatted
                                                    duration={stat.toString()}
                                                />
                                            );
                                        }
                                    )}
                                </div>
                            )}
                            {leaderboard == "attempts" && (
                                <div>
                                    {getLeaderboard(
                                        "Total Attempts",
                                        leaderboards.attemptCountLeaderboard.slice(
                                            0,
                                            10
                                        ),
                                        "",
                                        (stat) => {
                                            return stat;
                                        }
                                    )}
                                </div>
                            )}
                            {leaderboard == "finishedAttempts" && (
                                <div>
                                    {getLeaderboard(
                                        "Finished Attempts",
                                        leaderboards.finishedAttemptCountLeaderboard.slice(
                                            0,
                                            10
                                        ),
                                        "",
                                        (stat) => {
                                            return stat;
                                        }
                                    )}
                                </div>
                            )}
                            {leaderboard == "playtime" && (
                                <div>
                                    {getLeaderboard(
                                        "Total Playtime",
                                        leaderboards.totalRunTimeLeaderboard.slice(
                                            0,
                                            10
                                        ),
                                        "",
                                        (stat) => {
                                            return (
                                                <DurationToFormatted
                                                    duration={stat.toString()}
                                                />
                                            );
                                        }
                                    )}
                                </div>
                            )}
                        </span>
                    )}
                    <div>
                        <h3>WR Stats</h3>

                        <div>
                            <Table responsive bordered striped hover>
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Held WR for</th>
                                        <th>Improved WR by</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.wrHistoryStats.map(
                                        (stat: WrHistoryStat) => {
                                            return (
                                                <tr
                                                    key={`${stat.user}-${stat.timeHeldWr}-${stat.improvedWr}`}
                                                >
                                                    <td>
                                                        <UserLink
                                                            username={stat.user}
                                                        />
                                                    </td>
                                                    <td>
                                                        <DurationToFormatted
                                                            duration={
                                                                stat.timeHeldWr
                                                            }
                                                        />
                                                    </td>
                                                    <td>
                                                        <DurationToFormatted
                                                            duration={
                                                                stat.improvedWr
                                                            }
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </div>
                </Col>
                <Col xl={9} lg={6} md={12}>
                    <h3>Tournament Stats</h3>
                    <GameStats
                        players={leaderboards.pbLeaderboard.length}
                        stats={data.stats}
                        showTitle={false}
                    />
                    <h3>WR History</h3>
                    <WrHistory
                        historyData={{
                            worldRecords: data.wrHistory,
                            wrStats: data.wrHistoryStats,
                        }}
                    />
                </Col>
            </Row>
        </div>
    );
};

export default TournamentStats;
