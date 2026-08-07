'use client';

import { ResponsiveLine } from '@nivo/line';
import { useMemo, useState } from 'react';
import type { GameActivityPoint } from '~src/lib/game-activity';
import styles from './stats.module.scss';

// Same series hue the frontpage's live-count chart uses — the site's one
// chart color. Identity is carried by the metric toggle, not a legend
// (single series; the section title names it).
const SERIES_COLOR = '#608C59';

const METRICS = [
    {
        key: 'playtime',
        label: 'Hours played',
        value: (p: GameActivityPoint) => p.playtime / 3_600_000,
        format: (v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(v < 10 ? 1 : 0),
        unit: 'h',
    },
    {
        key: 'attempts',
        label: 'Attempts',
        value: (p: GameActivityPoint) => p.attempts,
        format: (v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(Math.round(v)),
        unit: '',
    },
    {
        key: 'pbs',
        label: 'PBs',
        value: (p: GameActivityPoint) => p.pbs,
        format: (v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(Math.round(v)),
        unit: '',
    },
] as const;

const PERIODS = [
    { key: 'd30', label: '30 days', days: 30, bucket: 'day' },
    { key: 'd90', label: '90 days', days: 90, bucket: 'day' },
    { key: 'y1', label: '1 year', days: 365, bucket: 'week' },
] as const;

type MetricKey = (typeof METRICS)[number]['key'];
type PeriodKey = (typeof PERIODS)[number]['key'];

interface Props {
    d30: GameActivityPoint[];
    d90: GameActivityPoint[];
    y1: GameActivityPoint[];
}

function formatTick(date: string): string {
    const d = new Date(`${date}T00:00:00Z`);
    return d.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    });
}

/**
 * A quiet day is a real zero, not a gap — the endpoint omits empty buckets,
 * so the chart re-inserts them or a dead week would silently connect two
 * active neighbours.
 */
function zeroFill(
    points: GameActivityPoint[],
    days: number,
    bucket: 'day' | 'week',
): GameActivityPoint[] {
    const by = new Map(points.map((p) => [p.date, p]));
    const stepMs = 86_400_000 * (bucket === 'week' ? 7 : 1);
    const out: GameActivityPoint[] = [];
    const end = new Date(new Date().toISOString().slice(0, 10));
    let cursor = new Date(end.getTime() - days * 86_400_000);
    if (bucket === 'week' && points.length > 0) {
        // Buckets are the backend's ISO-week Mondays; walk from the first
        // one it returned so our grid and its grid agree.
        cursor = new Date(`${points[0].date}T00:00:00Z`);
    }
    for (; cursor <= end; cursor = new Date(cursor.getTime() + stepMs)) {
        const key = cursor.toISOString().slice(0, 10);
        out.push(
            by.get(key) ?? {
                date: key,
                playtime: 0,
                attempts: 0,
                finishedAttempts: 0,
                pbs: 0,
                uniquePlayers: 0,
            },
        );
    }
    return out;
}

export function ActivityChart({ d30, d90, y1 }: Props) {
    const [metricKey, setMetricKey] = useState<MetricKey>('playtime');
    const [periodKey, setPeriodKey] = useState<PeriodKey>('d90');

    const metric = METRICS.find((m) => m.key === metricKey) ?? METRICS[0];
    const period = PERIODS.find((p) => p.key === periodKey) ?? PERIODS[1];
    const raw = periodKey === 'd30' ? d30 : periodKey === 'd90' ? d90 : y1;

    const points = useMemo(
        () => zeroFill(raw, period.days, period.bucket),
        [raw, period],
    );
    const series = useMemo(
        () => [
            {
                id: metric.label,
                data: points.map((p) => ({ x: p.date, y: metric.value(p) })),
            },
        ],
        [points, metric],
    );

    const hasAny = raw.length > 0;
    // ~5 x labels regardless of bucket count.
    const tickEvery = Math.max(1, Math.ceil(points.length / 5));
    const tickValues = points
        .filter((_, i) => i % tickEvery === 0)
        .map((p) => p.date);

    return (
        <div>
            <div className={styles.chartControls}>
                <div
                    className={styles.pillGroup}
                    role="group"
                    aria-label="Metric"
                >
                    {METRICS.map((m) => (
                        <button
                            key={m.key}
                            type="button"
                            className={
                                m.key === metricKey
                                    ? styles.pillActive
                                    : styles.pill
                            }
                            aria-pressed={m.key === metricKey}
                            onClick={() => setMetricKey(m.key)}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
                <div
                    className={styles.pillGroup}
                    role="group"
                    aria-label="Period"
                >
                    {PERIODS.map((p) => (
                        <button
                            key={p.key}
                            type="button"
                            className={
                                p.key === periodKey
                                    ? styles.pillActive
                                    : styles.pill
                            }
                            aria-pressed={p.key === periodKey}
                            onClick={() => setPeriodKey(p.key)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>
            {!hasAny ? (
                <p className={styles.sectionEmpty}>
                    No recorded activity in this period.
                </p>
            ) : (
                <div className={styles.chartFrame}>
                    <ResponsiveLine
                        data={series}
                        margin={{ top: 8, right: 12, bottom: 28, left: 44 }}
                        xScale={{ type: 'point' }}
                        yScale={{ type: 'linear', min: 0, max: 'auto' }}
                        curve="monotoneX"
                        enableArea
                        areaOpacity={0.12}
                        lineWidth={2}
                        colors={[SERIES_COLOR]}
                        enablePoints={false}
                        enableGridX={false}
                        enableGridY
                        gridYValues={4}
                        enableCrosshair
                        useMesh
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
                                    line: { stroke: 'transparent' },
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
                                    stroke: SERIES_COLOR,
                                    strokeWidth: 1,
                                    strokeOpacity: 0.5,
                                },
                            },
                        }}
                        axisBottom={{
                            tickSize: 0,
                            tickPadding: 8,
                            tickValues,
                            format: (v) => formatTick(String(v)),
                        }}
                        axisLeft={{
                            tickSize: 0,
                            tickPadding: 8,
                            tickValues: 4,
                            format: (v) => metric.format(Number(v)),
                        }}
                        axisTop={null}
                        axisRight={null}
                        tooltip={({ point }) => (
                            <div className={styles.chartTooltip}>
                                <strong>
                                    {metric.format(Number(point.data.y))}
                                    {metric.unit}
                                </strong>{' '}
                                <span className={styles.chartTooltipMeta}>
                                    {metric.label.toLowerCase()}
                                    {period.bucket === 'week'
                                        ? ', week of '
                                        : ' on '}
                                    {formatTick(String(point.data.x))}
                                </span>
                            </div>
                        )}
                    />
                </div>
            )}
        </div>
    );
}
