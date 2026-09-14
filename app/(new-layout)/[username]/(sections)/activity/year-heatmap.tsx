import styles from './activity.module.scss';

const DAY = 86_400_000;
const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

const hours = (ms: number) => {
    const h = ms / 3_600_000;
    return h >= 10 ? `${Math.round(h)} h` : `${h.toFixed(1)} h`;
};

/** A year of days, a week per column, darker where they ran more. */
export function YearHeatmap({
    days,
}: {
    days: { date: string; attempts: number; playtimeMs: number }[];
}) {
    const byDate = new Map(days.map((d) => [d.date.slice(0, 10), d]));
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    // Whole weeks: start on the Sunday 52 weeks back.
    const start = new Date(today.getTime() - 364 * DAY);
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());
    const weeks: {
        date: string;
        attempts: number;
        playtimeMs: number;
        future: boolean;
    }[][] = [];
    for (let t = start.getTime(); t <= today.getTime() + 6 * DAY; t += DAY) {
        const d = new Date(t);
        const date = d.toISOString().slice(0, 10);
        const found = byDate.get(date);
        if (d.getUTCDay() === 0) weeks.push([]);
        weeks[weeks.length - 1].push({
            date,
            attempts: found?.attempts ?? 0,
            playtimeMs: found?.playtimeMs ?? 0,
            future: t > today.getTime(),
        });
    }
    // Levels by quantile of active days, so one marathon day doesn't wash
    // everything else out.
    const active = days
        .map((d) => d.attempts)
        .filter((n) => n > 0)
        .sort((a, b) => a - b);
    const q = (p: number) => active[Math.floor((active.length - 1) * p)] ?? 0;
    const cuts = [q(0.25), q(0.5), q(0.75)];
    const level = (n: number) =>
        n === 0 ? 0 : 1 + cuts.filter((c) => n > c).length;

    const monthLabels = weeks.map((w, i) => {
        const first = new Date(`${w[0].date}T00:00:00Z`);
        const prev =
            i > 0 ? new Date(`${weeks[i - 1][0].date}T00:00:00Z`) : null;
        return !prev || prev.getUTCMonth() !== first.getUTCMonth()
            ? MONTHS[first.getUTCMonth()]
            : '';
    });

    return (
        <div className={styles.heatmapCard}>
            <div className={styles.heatmapScroll}>
                <div
                    className={styles.heatmap}
                    style={{ ['--weeks' as string]: weeks.length }}
                    role="img"
                    aria-label="Attempts per day over the last year"
                >
                    <span className={styles.heatmapCorner} />
                    {monthLabels.map((m, i) => (
                        <span key={i} className={styles.monthLabel}>
                            {m}
                        </span>
                    ))}
                    {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
                        <div key={dow} className={styles.heatmapRow}>
                            <span className={styles.dayLabel}>
                                {dow === 1
                                    ? 'Mon'
                                    : dow === 3
                                      ? 'Wed'
                                      : dow === 5
                                        ? 'Fri'
                                        : ''}
                            </span>
                            {weeks.map((w) => {
                                const c = w[dow];
                                if (!c)
                                    return <span key={`${w[0].date}-${dow}`} />;
                                return (
                                    <span
                                        key={c.date}
                                        className={styles.cell}
                                        data-level={
                                            c.future
                                                ? undefined
                                                : level(c.attempts)
                                        }
                                        data-future={c.future || undefined}
                                        title={
                                            c.future
                                                ? undefined
                                                : `${c.date}: ${c.attempts.toLocaleString('en-US')} attempts${c.playtimeMs > 0 ? `, ${hours(c.playtimeMs)}` : ''}`
                                        }
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
            <div className={styles.legend} aria-hidden>
                Less
                {[0, 1, 2, 3, 4].map((l) => (
                    <span key={l} className={styles.cell} data-level={l} />
                ))}
                More
            </div>
        </div>
    );
}
