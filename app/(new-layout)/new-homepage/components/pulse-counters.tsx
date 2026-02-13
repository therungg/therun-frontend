import { cacheLife } from 'next/cache';
import { getGlobalStats, getTodayStats } from '~src/lib/highlights';

async function getLiveRunnerCount(): Promise<number> {
    'use cache';
    cacheLife('seconds');

    const res = await fetch(
        `${process.env.NEXT_PUBLIC_DATA_URL}/live?minify=true`,
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return Array.isArray(data.result) ? data.result.length : 0;
}

function formatNumber(n: number): string {
    return n.toLocaleString('en-US');
}

function formatHours(ms: number): string {
    const hours = Math.floor(ms / 1000 / 3600);
    if (hours >= 1_000_000) {
        return `${(hours / 1_000_000).toFixed(1)}M`;
    }
    if (hours >= 1_000) {
        return `${(hours / 1_000).toFixed(0)}K`;
    }
    return formatNumber(hours);
}

export async function PulseCounters() {
    const [todayStats, globalStats, liveCount] = await Promise.all([
        getTodayStats(),
        getGlobalStats(),
        getLiveRunnerCount(),
    ]);

    const stats = [
        {
            label: 'Runners Live',
            value: formatNumber(liveCount),
            color: '#e53e3e',
        },
        {
            label: 'PBs Today',
            value: formatNumber(todayStats.pbCount),
            color: 'var(--bs-success)',
        },
        {
            label: 'Runs Today',
            value: formatNumber(todayStats.runCount),
            color: 'var(--bs-primary)',
        },
        {
            label: 'Total Runners',
            value: formatNumber(globalStats.totalRunners),
            color: 'var(--bs-info)',
        },
        {
            label: 'Hours Tracked',
            value: formatHours(globalStats.totalRunTime),
            color: 'var(--bs-warning)',
        },
    ];

    return (
        <div className="d-flex flex-wrap justify-content-center gap-3 gap-md-4 mt-3 mb-2">
            {stats.map((stat) => (
                <div
                    key={stat.label}
                    className="text-center"
                    style={{ minWidth: '100px' }}
                >
                    <div
                        className="fw-bold fs-4 font-monospace"
                        style={{ color: stat.color }}
                    >
                        {stat.value}
                    </div>
                    <div
                        className="text-muted small text-uppercase"
                        style={{
                            fontSize: '0.7rem',
                            letterSpacing: '0.05em',
                        }}
                    >
                        {stat.label}
                    </div>
                </div>
            ))}
        </div>
    );
}
