import styles from './leaderboards-profile.module.scss';

const DAY = 86_400_000;

export function ActivityHeatmap({
    activity,
}: {
    activity: { date: string; attempts: number }[];
}) {
    const byDate = new Map(
        activity.map((a) => [a.date.slice(0, 10), a.attempts]),
    );
    const max = Math.max(1, ...activity.map((a) => a.attempts));
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    // Start on the Sunday 52 weeks back so columns are whole weeks.
    const start = new Date(today.getTime() - 364 * DAY);
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());
    const cells: { date: string; attempts: number }[] = [];
    for (let t = start.getTime(); t <= today.getTime(); t += DAY) {
        const date = new Date(t).toISOString().slice(0, 10);
        cells.push({ date, attempts: byDate.get(date) ?? 0 });
    }
    const level = (n: number) =>
        n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4));
    const total = activity.reduce((s, a) => s + a.attempts, 0);

    return (
        <section
            className={styles.heatmap}
            aria-label="Attempts per day, last year"
        >
            <div className={styles.gameSummary}>
                {total.toLocaleString('en-US')} attempts in the last year
            </div>
            <div className={styles.heatmapGrid}>
                {cells.map((c) => (
                    <span
                        key={c.date}
                        className={styles.heatmapCell}
                        data-level={level(c.attempts)}
                        title={`${c.date}: ${c.attempts} attempts`}
                    />
                ))}
            </div>
        </section>
    );
}
