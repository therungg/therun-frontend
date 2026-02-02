// components/stats-content.tsx
'use client';

import { useEffect, useState, useTransition } from 'react';
import { Col, Row } from 'react-bootstrap';
import { ControlButtons } from './control-buttons';
import { fetchStatsAction } from './get-stats.action';
import { ProgressChart } from './progress-chart';
import { RecentFinishedAttempts } from './recent-finished-attempts';
import { StatsHeader } from './stats-header';

interface Props {
    initialStats: any;
    username: string;
    firstWeek?: string;
    firstMonth?: string;
}

export function StatsContent({
    initialStats,
    username,
    firstWeek,
    firstMonth,
}: Props) {
    const [stats, setStats] = useState(initialStats);
    const [range, setRange] = useState<'week' | 'month'>(initialStats.type);
    const [offset, setOffset] = useState<number>(0);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        setStats(initialStats);
        setRange(initialStats.type);
        setOffset(0);
    }, [initialStats, username]);

    const handleRangeChange = (
        newRange: 'week' | 'month',
        newOffset: number = 0,
    ) => {
        if (range === newRange && newOffset == offset) return;
        setRange(newRange);
        setOffset(newOffset);

        console.log(newRange, newOffset);

        startTransition(async () => {
            const newStats = await fetchStatsAction(
                username,
                newRange,
                newOffset,
            );
            if (newStats) setStats(newStats);
        });
    };

    return (
        <>
            <Row className="row-gap-3">
                <Col
                    xxl={6}
                    xl={12}
                    className="d-flex justify-content-center align-items-center order-xxl-1 order-2"
                >
                    <div
                        style={{
                            opacity: isPending ? 0.5 : 1,
                            transition: 'opacity 0.2s',
                        }}
                    >
                        <ProgressChart stats={stats} />
                    </div>
                </Col>

                <Col
                    xxl={6}
                    xl={12}
                    className="order-xxl-2 order-1 d-flex flex-column"
                >
                    <div className="flex-grow-1 d-flex justify-content-center align-items-center">
                        <div
                            style={{
                                opacity: isPending ? 0.5 : 1,
                                transition: 'opacity 0.2s',
                            }}
                        >
                            <StatsHeader
                                stats={stats}
                                firstWeek={firstWeek}
                                firstMonth={firstMonth}
                                onRangeChange={handleRangeChange}
                            />
                        </div>
                    </div>

                    <div className="d-flex justify-content-center align-items-center py-2">
                        <ControlButtons
                            currentRange={range}
                            onRangeChange={handleRangeChange}
                            disabled={isPending}
                        />
                    </div>
                </Col>
            </Row>

            {stats.totalFinishedRuns > 0 && (
                <div className="mt-3" style={{ opacity: isPending ? 0.5 : 1 }}>
                    <RecentFinishedAttempts stats={stats} />
                </div>
            )}
        </>
    );
}
