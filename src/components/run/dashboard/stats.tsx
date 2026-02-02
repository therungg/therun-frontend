import { Table } from 'react-bootstrap';
import { Run } from '../../../common/types';
import { DurationToFormatted } from '../../util/datetime';

export const Stats = ({
    run,
    gameTime = false,
}: {
    run: Run;
    gameTime: boolean;
}) => {
    return (
        <div>
            <h2>Stats</h2>
            <Table striped bordered hover>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th style={{ textAlign: 'right' }}>Value</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Personal Best</td>
                        <td style={{ textAlign: 'right' }}>
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
                    </tr>
                    <tr>
                        <td>Attempts</td>
                        <td style={{ textAlign: 'right' }}>
                            {run.attemptCount}
                        </td>
                    </tr>
                    <tr>
                        <td>Finished</td>
                        <td style={{ textAlign: 'right' }}>
                            {run.finishedAttemptCount}
                        </td>
                    </tr>
                    <tr>
                        <td>Completion %</td>
                        <td style={{ textAlign: 'right' }}>
                            {(
                                (parseInt(run.finishedAttemptCount) /
                                    run.attemptCount) *
                                100
                            ).toFixed(2)}
                            %
                        </td>
                    </tr>
                    <tr>
                        <td>SoB</td>
                        <td style={{ textAlign: 'right' }}>
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
                    </tr>
                    <tr>
                        <td>Time to save</td>
                        <td style={{ textAlign: 'right' }}>
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
                    </tr>
                    <tr>
                        <td>Total Run Time</td>
                        <td style={{ textAlign: 'right' }}>
                            <DurationToFormatted duration={run.totalRunTime} />
                        </td>
                    </tr>
                </tbody>
            </Table>
        </div>
    );
};
