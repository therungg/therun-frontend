import { CumulativeGameStat } from "~app/games/[game]/game.types";
import { Table } from "react-bootstrap";
import { DurationToFormatted } from "../util/datetime";

export const GameStats = ({
    stats,
    players = null,
    showTitle = true,
}: {
    stats: CumulativeGameStat;
    players?: number | null;
    showTitle?: boolean;
}) => {
    return (
        <div>
            {showTitle && <h2>General stats</h2>}
            <Table responsive borderless className="d-none d-md-table">
                <thead>
                    <tr>
                        {players && <th># Players</th>}
                        <th>Total Playtime</th>
                        <th>Total Attempts</th>
                        <th>Finished Attempts</th>
                        <th>Completion %</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        {players && <td>{players}</td>}
                        <td>
                            <DurationToFormatted
                                duration={
                                    stats.totalRunTime
                                        ? stats.totalRunTime.toString()
                                        : ""
                                }
                                padded
                            />
                        </td>
                        <td>{stats.attemptCount.toLocaleString()}</td>
                        <td>{stats.finishedAttemptCount.toLocaleString()}</td>
                        <td>{(stats.completePercentage * 100).toFixed(2)}</td>
                    </tr>
                </tbody>
            </Table>
            <Table responsive className="d-md-none">
                <tbody>
                    {players && (
                        <tr>
                            <td>
                                <b># Players</b>
                            </td>
                            <td>{players}</td>
                        </tr>
                    )}

                    <tr>
                        <td>
                            <b>Total Playtime</b>
                        </td>
                        <td>
                            <DurationToFormatted
                                duration={
                                    stats.totalRunTime
                                        ? stats.totalRunTime.toString()
                                        : ""
                                }
                                padded
                            />
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <b>Total Attempts</b>
                        </td>
                        <td>{stats.attemptCount.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td>
                            <b>Finished Attempts</b>
                        </td>
                        <td>{stats.finishedAttemptCount.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td>
                            <b>Completion %</b>
                        </td>
                        <td>{(stats.completePercentage * 100).toFixed(2)}</td>
                    </tr>
                </tbody>
            </Table>
        </div>
    );
};
