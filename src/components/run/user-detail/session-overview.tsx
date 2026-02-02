import moment from 'moment/moment';
import { Table } from 'react-bootstrap';
import { RunSession } from '../../../common/types';
import styles from '../../css/User.module.scss';
import { DurationToFormatted, IsoToFormatted } from '../../util/datetime';

export const SessionOverview = ({ sessions }: { sessions: RunSession[] }) => {
    return (
        <Table responsive bordered hover striped>
            <thead>
                <tr>
                    <th>Run</th>
                    <th className={styles.sessionOptional}>Started at</th>
                    <th className={styles.sessionOptional}>Ended at</th>
                    <th>Duration</th>
                    <th>Started runs</th>
                    <th>Finished runs</th>
                    <th>Finished times</th>
                </tr>
            </thead>
            <tbody>
                {sessions.map((session) => {
                    return (
                        <tr
                            key={
                                session.game +
                                session.startedAt +
                                JSON.stringify(session.finishedRuns)
                            }
                        >
                            <td>{session.game}</td>
                            <td className={styles.sessionOptional}>
                                <IsoToFormatted iso={session.startedAt} />
                            </td>
                            <td className={styles.sessionOptional}>
                                <IsoToFormatted iso={session.endedAt} />
                            </td>
                            <td>
                                <DurationToFormatted
                                    duration={moment(session.endedAt)
                                        .diff(moment(session.startedAt))
                                        .toString()}
                                />
                            </td>
                            <td>
                                {session.runIds.last - session.runIds.first + 1}
                            </td>
                            <td>{session.finishedRuns.length}</td>
                            <td>
                                {session.finishedRuns.map((time: string) => {
                                    return (
                                        <div key={session.startedAt + time}>
                                            <DurationToFormatted
                                                key={time}
                                                duration={time}
                                                gameTime={!!session.gameTime}
                                            />
                                            <br />
                                        </div>
                                    );
                                })}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </Table>
    );
};
