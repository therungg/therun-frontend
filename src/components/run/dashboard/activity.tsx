import { Table } from 'react-bootstrap';
import { RunHistory, SplitsHistory } from '../../../common/types';
import { DurationToFormatted, FromNow } from '../../util/datetime';

const amount = 10;

export const Activity = ({
    history,
    splits,
}: {
    history: RunHistory[];
    splits: SplitsHistory[];
}) => {
    // Maybe this should implement pagination, right now it can only show 10 recent runs
    // The runs are on the runs tab, sure, but why not also show them better here
    const attempts = history
        .filter((h) => h.splits.length > 0)
        .slice()
        .reverse()
        .slice(0, amount);

    return (
        <div>
            <h2>Recent Runs</h2>
            <Table striped bordered hover>
                <thead>
                    <tr>
                        <th>Time Ago</th>
                        <th>Reset On</th>
                        <th>Duration</th>
                    </tr>
                </thead>
                <tbody>
                    {attempts.map((attempt: RunHistory, key: number) => {
                        return (
                            <tr key={key}>
                                <td>
                                    <FromNow time={attempt.endedAt} />
                                </td>
                                <td>
                                    {attempt.splits.length < splits.length
                                        ? splits[attempt.splits.length].name
                                        : 'Finished run!'}
                                </td>
                                <td>
                                    <DurationToFormatted
                                        duration={
                                            attempt.time
                                                ? attempt.time
                                                : attempt.duration
                                        }
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        </div>
    );
};
