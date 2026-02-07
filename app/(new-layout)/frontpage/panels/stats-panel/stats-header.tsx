'use client';

import { UserSummary, UserSummaryType } from '~src/types/summary.types';
import styles from './stats-header.module.scss';

type PeriodOption = {
    label: string;
    value: string;
    type: UserSummaryType;
};

const formatDate = (date: Date): string => {
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}/${day}/${year}`;
};

const getWeekNumber = (d: Date): number => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(
        ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
    );
    return weekNo;
};

const generateMonthPeriods = (startMonth: string): PeriodOption[] => {
    const [startYear, startMonthIndex] = startMonth.split('-').map(Number);
    let currentDate = new Date(startYear, startMonthIndex - 1, 1);
    const today = new Date();
    const options: PeriodOption[] = [];

    while (currentDate <= today) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const value = `${year}-${String(month + 1).padStart(2, '0')}`;

        const monthNameYear = new Date(year, month, 1).toLocaleString(
            'default',
            { month: 'long', year: 'numeric' },
        );

        options.push({
            label: monthNameYear,
            value: value,
            type: 'month',
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    return options;
};

const generateWeekPeriods = (startWeek: string): PeriodOption[] => {
    let currentDate = new Date(startWeek);
    currentDate.setHours(0, 0, 0, 0);
    const today = new Date();
    const currentWeekEnd = new Date(today);
    currentWeekEnd.setDate(currentWeekEnd.getDate());

    const options: PeriodOption[] = [];

    while (currentDate <= currentWeekEnd) {
        const endValue = currentDate.toISOString().split('T')[0];

        const endDate = new Date(currentDate);
        const startDate = new Date(currentDate);
        endDate.setDate(endDate.getDate() + 6);

        const weekNumber = getWeekNumber(endDate);

        options.push({
            label: `Week ${weekNumber}: ${formatDate(startDate)} - ${formatDate(endDate)}`,
            value: endValue,
            type: 'week',
        });

        currentDate.setDate(currentDate.getDate() + 7);
    }

    return options;
};

interface StatsHeaderProps {
    stats: UserSummary;
    firstWeek?: string;
    firstMonth?: string;
    onRangeChange: (range: 'week' | 'month', newOffset?: number) => void;
}

export const StatsHeader = ({
    stats,
    firstWeek,
    firstMonth,
    onRangeChange,
}: StatsHeaderProps) => {
    let effectiveEndDate: Date;

    if (stats.type === 'month' && stats.value.length === 7) {
        const [year, monthStr] = stats.value.split('-').map(Number);
        const monthIndex = monthStr - 1;

        effectiveEndDate = new Date(year, monthIndex + 1, 0);
    } else {
        effectiveEndDate = new Date(stats.value);
    }

    const endDate = effectiveEndDate;
    const startDate = new Date(endDate);

    if (stats.type === 'week') {
        endDate.setDate(endDate.getDate() + 6);
    } else {
        startDate.setMonth(startDate.getMonth());
        startDate.setDate(1);
    }

    const periodOptions = () => {
        const options: PeriodOption[] = [];

        if (stats.type === 'month' && firstMonth) {
            options.push(...generateMonthPeriods(firstMonth));
        }

        if (stats.type === 'week' && firstWeek) {
            options.push(...generateWeekPeriods(firstWeek));
        }

        return options.reverse();
    };

    const handlePeriodChange = (
        event: React.ChangeEvent<HTMLSelectElement>,
    ) => {
        onRangeChange(stats.type, parseInt(event.target.value) - 1);
    };

    let selectedOptionLabel: string;

    if (stats.type === 'month') {
        const monthNameYear = endDate.toLocaleString('default', {
            month: 'long',
            year: 'numeric',
        });
        selectedOptionLabel = `${monthNameYear}`;
    } else {
        const weekNumber = getWeekNumber(endDate);
        selectedOptionLabel = `Week ${weekNumber}: ${formatDate(startDate)} - ${formatDate(endDate)}`;
    }

    return (
        <div>
            <div className="mb-1">
                <span className="fs-5 fw-bold text-primary">
                    {stats.type === 'week' ? 'Weekly' : 'Monthly'} Speedrun
                    Summary for {stats.user}
                </span>
            </div>

            <div
                className={`d-flex justify-content-center align-items-center fst-italic cursor-pointer py-2 border border-2 rounded position-relative ${styles.periodSelector}`}
            >
                {selectedOptionLabel}

                <select
                    onChange={handlePeriodChange}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer',
                    }}
                >
                    {periodOptions().map((option, i) => (
                        <option
                            key={`${option.type}-${option.value}`}
                            value={i + 1}
                            disabled={option.value.endsWith('-divider')}
                        >
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};
