'use client';

import { ResponsiveLine } from '@nivo/line';
import { useMemo } from 'react';

interface LiveCountDataPoint {
    count: number;
    timestamp: number;
}

function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export const LiveCountChart = ({ data }: { data: LiveCountDataPoint[] }) => {
    const chartData = useMemo(() => {
        if (data.length === 0) return [];

        return [
            {
                id: 'Live Runners',
                data: data.map((point) => ({
                    x: point.timestamp,
                    y: point.count,
                })),
            },
        ];
    }, [data]);

    const currentCount = data.length > 0 ? data[data.length - 1].count : 0;

    if (data.length === 0) {
        return (
            <div
                className="d-flex align-items-center justify-content-center text-muted"
                style={{ height: '200px' }}
            >
                No activity data available
            </div>
        );
    }

    const counts = data.map((d) => d.count);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    const padding = Math.max(Math.ceil((maxCount - minCount) * 0.15), 2);

    const tickCount = 5;
    const timestamps = data.map((d) => d.timestamp);
    const minTime = timestamps[0];
    const maxTime = timestamps[timestamps.length - 1];
    const timeRange = maxTime - minTime;
    const tickInterval = timeRange / (tickCount - 1);
    const tickValues = Array.from(
        { length: tickCount },
        (_, i) => minTime + i * tickInterval,
    );

    return (
        <div>
            <div className="d-flex align-items-baseline gap-2 mb-2">
                <span
                    className="fw-bold"
                    style={{ fontSize: '2rem', lineHeight: 1 }}
                >
                    {currentCount}
                </span>
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                    runners live right now
                </span>
            </div>
            <div style={{ height: '180px' }}>
                <ResponsiveLine
                    data={chartData}
                    margin={{ top: 8, right: 12, bottom: 28, left: 36 }}
                    xScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                    yScale={{
                        type: 'linear',
                        min: Math.max(0, minCount - padding),
                        max: maxCount + padding,
                    }}
                    curve="natural"
                    enableArea={true}
                    areaOpacity={0.15}
                    lineWidth={2.5}
                    colors={['#608C59']}
                    enablePoints={false}
                    enableGridX={false}
                    enableGridY={true}
                    gridYValues={4}
                    enableCrosshair={true}
                    useMesh={true}
                    theme={{
                        text: {
                            fontSize: 11,
                            fill: 'var(--bs-body-color)',
                        },
                        axis: {
                            ticks: {
                                text: {
                                    fill: 'var(--bs-secondary-color)',
                                    fontSize: 10,
                                },
                                line: {
                                    stroke: 'transparent',
                                },
                            },
                        },
                        grid: {
                            line: {
                                stroke: 'var(--bs-secondary-color)',
                                strokeWidth: 1,
                                opacity: 0.15,
                            },
                        },
                        crosshair: {
                            line: {
                                stroke: '#608C59',
                                strokeWidth: 1,
                                strokeOpacity: 0.5,
                            },
                        },
                    }}
                    axisBottom={{
                        tickSize: 0,
                        tickPadding: 8,
                        tickValues: tickValues,
                        format: (value) => formatTime(value as number),
                    }}
                    axisLeft={{
                        tickSize: 0,
                        tickPadding: 8,
                        tickValues: 4,
                    }}
                    axisTop={null}
                    axisRight={null}
                    tooltip={({ point }) => (
                        <div
                            className="bg-body-secondary rounded px-3 py-2 shadow-sm border"
                            style={{ fontSize: '0.85rem' }}
                        >
                            <strong>{point.data.y as number}</strong> runners at{' '}
                            <span className="text-muted">
                                {formatTime(point.data.x as number)}
                            </span>
                        </div>
                    )}
                    defs={[
                        {
                            id: 'areaGradient',
                            type: 'linearGradient',
                            colors: [
                                { offset: 0, color: '#608C59', opacity: 0.3 },
                                {
                                    offset: 100,
                                    color: '#608C59',
                                    opacity: 0.02,
                                },
                            ],
                        },
                    ]}
                    fill={[{ match: '*', id: 'areaGradient' }]}
                />
            </div>
        </div>
    );
};
