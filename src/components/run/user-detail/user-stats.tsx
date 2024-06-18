import { Table } from "react-bootstrap";
import { Run } from "../../../common/types";
import {
    DurationToFormatted,
    IsoToFormatted,
    DigitGrouping,
} from "../../util/datetime";

export const UserStats = ({ runs }: { runs: Run[] }) => {
    const totalPlayTime = runs
        .filter((run) => !!run.totalRunTime && run.totalRunTime != "NaN")
        .map((run) => parseInt(run.totalRunTime))
        .reduce((a, b) => a + b, 0)
        .toString();
    const totalAttempts = runs
        .map((run) => run.attemptCount)
        .reduce((a, b) => a + b);
    const totalFinishedAttempts = runs
        .map((run) => run.finishedAttemptCount)
        .reduce((a, b) => a + b);
    const games = new Set(runs.map((run) => run.game)).size;

    const lastSessions = runs
        .filter((run) => run.sessions.length > 0)
        .map((run) => run.sessions[run.sessions.length - 1].endedAt)
        .sort();
    const lastSessionTime = lastSessions[lastSessions.length - 1];

    return (
        <>
            <h2>Stats</h2>
            <Table striped bordered hover>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th style={{ textAlign: "right" }}>Value</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Total Games</td>
                        <td style={{ textAlign: "right" }}>
                            {DigitGrouping(games)}
                        </td>
                    </tr>
                    <tr>
                        <td>Total Categories</td>
                        <td style={{ textAlign: "right" }}>{runs.length}</td>
                    </tr>
                    <tr>
                        <td>Total time played</td>
                        <td style={{ textAlign: "right" }}>
                            <DurationToFormatted
                                duration={totalPlayTime}
                                padded={true}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td>Total attempts</td>
                        <td style={{ textAlign: "right" }}>
                            {DigitGrouping(totalAttempts)}
                        </td>
                    </tr>
                    <tr>
                        <td>Total completed attempts</td>
                        <td style={{ textAlign: "right" }}>
                            {totalFinishedAttempts}
                        </td>
                    </tr>
                    <tr>
                        <td>Total completion %</td>
                        <td style={{ textAlign: "right" }}>
                            {(
                                (parseInt(totalFinishedAttempts) /
                                    totalAttempts) *
                                100
                            ).toFixed(2)}
                            %
                        </td>
                    </tr>
                    <tr>
                        <td>Last active</td>
                        <td style={{ textAlign: "right" }}>
                            <IsoToFormatted iso={lastSessionTime} />
                        </td>
                    </tr>
                </tbody>
            </Table>
        </>
    );
};
