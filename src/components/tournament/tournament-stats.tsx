import React from 'react';
import { Col, Row, Table } from 'react-bootstrap';
import { GameStats } from '../game/game-stats';
import { UserLink } from '../links/links';
import { DurationToFormatted } from '../util/datetime';
import WrHistory from './wr-history';

export interface WrHistoryStat {
    timeHeldWr: number;
    improvedWr: number;
    user: string;
}

export const TournamentStats = ({ data, tournament, gameTime = true }) => {
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
                                        },
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
                        maxEnd={new Date(tournament.endDate)}
                    />
                </Col>
            </Row>
        </div>
    );
};

export default TournamentStats;
