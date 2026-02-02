import { useState } from 'react';
import { Col, Row, Table } from 'react-bootstrap';
import { WrHistoryInterface } from '../tournament/wr-history';
import WrStats from '../tournament/wr-stats';
import {
    DifferenceFromOne,
    DurationToFormatted,
    IsoToFormatted,
} from '../util/datetime';

export const WrHistoryTableMode = ({ historyData }) => {
    const [sortColumn, setSortColumn] = useState('date');
    const [sortAsc, setSortAsc] = useState(true);

    const changeSort = (column: string) => {
        if (sortColumn === column) {
            setSortAsc(!sortAsc);
        } else {
            setSortColumn(column);
            setSortAsc(true);
        }
    };

    const getSortableClassName = (column: string): string => {
        let classNames = 'sortable';

        if (sortColumn === column) {
            classNames += ' active';
            classNames += sortAsc ? ' asc' : ' desc';
        }

        return classNames;
    };

    const stats = historyData.wrStats;
    historyData = historyData.worldRecords;

    historyData = historyData.map((history, n) => {
        let stoodFor = null;
        let improved = null;

        if (n > 0) {
            const previous = historyData[n - 1];

            improved = parseInt(history.time) - parseInt(previous.time);
        }

        if (n < historyData.length - 1) {
            const previous = historyData[n + 1];
            stoodFor =
                Math.floor(new Date(history.endedAt).getTime()) -
                Math.floor(new Date(previous.endedAt).getTime());
        }

        history.stoodFor = stoodFor;
        history.improved = improved;

        return history;
    });

    const realHistoryData = historyData.slice().reverse();

    realHistoryData.sort((a: WrHistoryInterface, b: WrHistoryInterface) => {
        let res = 1;

        if (sortColumn === 'user') res = a.user < b.user ? -1 : 1;

        if (sortColumn === 'date') res = a.endedAt > b.endedAt ? -1 : 1;

        if (sortColumn === 'improved') res = a.improved < b.improved ? -1 : 1;

        if (sortColumn === 'stood') res = a.stoodFor < b.stoodFor ? -1 : 1;

        if (!sortAsc) res *= -1;

        return res;
    });

    return (
        <div>
            <Row>
                <Col xl={8} lg={12}>
                    <h3>Records</h3>
                    <Table responsive bordered striped hover>
                        <thead>
                            <tr>
                                <th
                                    className={getSortableClassName('user')}
                                    onClick={() => {
                                        changeSort('user');
                                    }}
                                >
                                    User
                                </th>
                                <th
                                    className={getSortableClassName('date')}
                                    onClick={() => {
                                        changeSort('date');
                                    }}
                                >
                                    Date
                                </th>
                                <th
                                    className={getSortableClassName('date')}
                                    onClick={() => {
                                        changeSort('date');
                                    }}
                                >
                                    Record
                                </th>
                                <th
                                    className={getSortableClassName('improved')}
                                    onClick={() => {
                                        changeSort('improved');
                                    }}
                                >
                                    Improved
                                </th>
                                <th
                                    className={getSortableClassName('stood')}
                                    onClick={() => {
                                        changeSort('stood');
                                    }}
                                >
                                    Stood for
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {realHistoryData.map((history) => {
                                return (
                                    <tr key={history.time}>
                                        <td>{history.user}</td>
                                        <td>
                                            <IsoToFormatted
                                                iso={history.endedAt}
                                            />
                                        </td>
                                        <td>
                                            <DurationToFormatted
                                                duration={history.time}
                                            />
                                        </td>
                                        <td>
                                            {history.improved ? (
                                                <DifferenceFromOne
                                                    withMillis={true}
                                                    diff={history.improved}
                                                />
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                        <td>
                                            {history.stoodFor ? (
                                                <DurationToFormatted
                                                    withDays={true}
                                                    duration={history.stoodFor}
                                                />
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                </Col>
                <Col xl={4} lg={12}>
                    <h3>Stats</h3>
                    <WrStats stats={stats} />
                </Col>
            </Row>
        </div>
    );
};

export default WrHistoryTableMode;
