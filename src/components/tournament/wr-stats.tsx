import React, { useState } from 'react';
import { Table } from 'react-bootstrap';
import { UserLink } from '../links/links';
import { DurationToFormatted } from '../util/datetime';
import { WrHistoryStat } from './tournament-stats';

export const WrStats = ({ stats }) => {
    const [sortColumn, setSortColumn] = useState('held');
    const [sortAsc, setSortAsc] = useState(true);

    if (!stats) {
        return <div></div>;
    }
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

    stats.sort((a: WrHistoryStat, b: WrHistoryStat) => {
        let res = 1;

        if (sortColumn === 'held') {
            res = a.timeHeldWr > b.timeHeldWr ? 1 : -1;
        }

        if (sortColumn === 'user') {
            res = a.user < b.user ? 1 : -1;
        }

        if (sortColumn === 'improved') {
            res = a.improvedWr > b.improvedWr ? 1 : -1;
        }

        if (!sortAsc) res *= -1;

        return res;
    });

    return (
        <div>
            <div>
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
                                className={getSortableClassName('held')}
                                onClick={() => {
                                    changeSort('held');
                                }}
                            >
                                Held Record For
                            </th>
                            <th
                                className={getSortableClassName('improved')}
                                onClick={() => {
                                    changeSort('improved');
                                }}
                            >
                                Improved Record
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats
                            .slice()
                            .reverse()
                            .map((stat: WrHistoryStat) => {
                                return (
                                    <tr key={stat.user}>
                                        <td>
                                            <UserLink username={stat.user} />
                                        </td>
                                        <td>
                                            <DurationToFormatted
                                                withDays={true}
                                                duration={stat.timeHeldWr}
                                            />
                                        </td>
                                        <td>
                                            <DurationToFormatted
                                                duration={stat.improvedWr}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                    </tbody>
                </Table>
            </div>
        </div>
    );
};

export default WrStats;
