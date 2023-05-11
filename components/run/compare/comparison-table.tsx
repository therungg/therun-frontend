import {
    Difference,
    DurationToFormatted,
    getNumberDifference,
    getPercentageDifference,
} from "../../util/datetime";
import { Table } from "react-bootstrap";
import { Run } from "../../../common/types";
import { UserLink } from "../../links/links";

export const ComparisonTable = ({
    userOne,
    userTwo,
    runOne,
    runTwo,
    gameTime,
}: {
    userOne: string;
    userTwo: string;
    runOne: Run;
    runTwo: Run;
    gameTime: boolean;
}) => {
    return (
        <Table striped bordered hover>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>{userOne}</th>
                    <th>
                        <UserLink username={userTwo} />
                    </th>
                    <th>+-</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Personal Best</td>
                    {[runOne, runTwo].map((run) => (
                        <td key={`${run.user}pb`}>
                            <DurationToFormatted
                                duration={
                                    gameTime
                                        ? (run.gameTimeData
                                              ?.personalBest as string)
                                        : run.personalBest
                                }
                                gameTime={gameTime}
                            />
                        </td>
                    ))}
                    <td>
                        <Difference
                            one={runOne.personalBest}
                            two={runTwo.personalBest}
                        />
                    </td>
                </tr>
                <tr>
                    <td>Attempts</td>
                    {[runOne, runTwo].map((run) => (
                        <td key={`${run.user}attemptcount`}>
                            {run.attemptCount}
                        </td>
                    ))}
                    <td
                        style={{
                            color:
                                runOne.attemptCount - runTwo.attemptCount < 0
                                    ? "red"
                                    : "green",
                        }}
                    >
                        {getNumberDifference(
                            runOne.attemptCount,
                            runTwo.attemptCount
                        )}
                    </td>
                </tr>
                <tr>
                    <td>Finished</td>
                    {[runOne, runTwo].map((run) => (
                        <td key={`${run.user}finishedattemptcount`}>
                            {run.finishedAttemptCount}
                        </td>
                    ))}
                    <td
                        style={{
                            color:
                                parseInt(runOne.finishedAttemptCount) -
                                    parseInt(runTwo.finishedAttemptCount) <
                                0
                                    ? "red"
                                    : "green",
                        }}
                    >
                        {getNumberDifference(
                            parseInt(runOne.finishedAttemptCount),
                            parseInt(runTwo.finishedAttemptCount)
                        )}
                    </td>
                </tr>
                <tr>
                    <td>Completion %</td>
                    {[runOne, runTwo].map((run) => (
                        <td key={`${run.user}completion`}>
                            {(
                                (parseInt(run.finishedAttemptCount) /
                                    run.attemptCount) *
                                100
                            ).toFixed(2)}
                            %
                        </td>
                    ))}
                    <td
                        style={{
                            color:
                                parseInt(runOne.finishedAttemptCount) /
                                    runOne.attemptCount -
                                    parseInt(runTwo.finishedAttemptCount) /
                                        runTwo.attemptCount <
                                0
                                    ? "red"
                                    : "green",
                        }}
                    >
                        {getPercentageDifference(
                            parseInt(runOne.finishedAttemptCount) /
                                runOne.attemptCount,
                            parseInt(runTwo.finishedAttemptCount) /
                                runTwo.attemptCount
                        )}
                    </td>
                </tr>
                <tr>
                    <td>SoB</td>
                    {[runOne, runTwo].map((run) => (
                        <td key={`${run.user}sob`}>
                            <DurationToFormatted
                                duration={
                                    gameTime
                                        ? (run.gameTimeData
                                              ?.sumOfBests as string)
                                        : run.sumOfBests
                                }
                                gameTime={gameTime}
                            />
                        </td>
                    ))}
                    <td>
                        <Difference
                            one={runOne.sumOfBests}
                            two={runTwo.sumOfBests}
                        />
                    </td>
                </tr>
                <tr>
                    <td>Time to save</td>
                    {[runOne, runTwo].map((run) => (
                        <td key={`${run.user}savetime`}>
                            <DurationToFormatted
                                duration={
                                    gameTime
                                        ? (run.gameTimeData
                                              ?.timeToSave as string)
                                        : run.timeToSave
                                }
                                gameTime={gameTime}
                            />
                        </td>
                    ))}
                    <td>
                        <Difference
                            one={runTwo.timeToSave}
                            two={runOne.timeToSave}
                        />
                    </td>
                </tr>
                <tr>
                    <td>Total Run Time</td>
                    {[runOne, runTwo].map((run) => (
                        <td key={`${run.user}totalruntime`}>
                            <DurationToFormatted duration={run.totalRunTime} />
                        </td>
                    ))}
                    <td
                        style={{
                            color:
                                parseInt(runOne.totalRunTime) -
                                    parseInt(runTwo.totalRunTime) <
                                0
                                    ? "red"
                                    : "green",
                        }}
                    >
                        {parseInt(runOne.totalRunTime) -
                            parseInt(runTwo.totalRunTime) <
                        0
                            ? "-"
                            : "+"}
                        <DurationToFormatted
                            duration={(
                                parseInt(runOne.totalRunTime) -
                                parseInt(runTwo.totalRunTime)
                            ).toString()}
                        />
                    </td>
                </tr>
            </tbody>
        </Table>
    );
};
