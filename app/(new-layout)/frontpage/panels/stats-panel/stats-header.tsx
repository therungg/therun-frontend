'use client';

import { DateTimeFormatOptions } from 'next-intl';
import { LocalizedTime } from '~src/components/util/datetime';
import { UserSummary } from '~src/types/summary.types';

export const StatsHeader = ({ stats }: { stats: UserSummary }) => {
    const startDate = new Date(stats.value);
    const endDate = new Date(stats.value);

    if (stats.type === 'week') {
        startDate.setDate(startDate.getDate() - 7);
    } else {
        startDate.setMonth(startDate.getMonth() - 1);
    }

    const dateOptions: DateTimeFormatOptions = {
        year: undefined,
        month: '2-digit',
        day: '2-digit',
        hour: undefined,
        minute: undefined,
    };

    return (
        <div className="d-flex justify-content-center align-items-center h-100">
            <div>
                <div>
                    <span className="fs-5 fw-bold text-primary">
                        Speedrun Summary for {stats.user}
                    </span>
                </div>
                <div className="d-flex justify-content-center align-items-center fst-italic">
                    <LocalizedTime options={dateOptions} date={startDate} /> -{' '}
                    <LocalizedTime options={dateOptions} date={endDate} />
                </div>
            </div>
        </div>
    );
};
