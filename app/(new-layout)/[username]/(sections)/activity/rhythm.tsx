import styles from './activity.module.scss';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Playtime per weekday over the last year, Monday first. */
export function DayOfWeek({
    days,
}: {
    days: { date: string; attempts: number; playtimeMs: number }[];
}) {
    const totals = new Array(7).fill(0) as number[];
    for (const d of days) {
        const dow = new Date(`${d.date.slice(0, 10)}T00:00:00Z`).getUTCDay();
        totals[dow] += d.playtimeMs > 0 ? d.playtimeMs : d.attempts * 60_000;
    }
    const max = Math.max(1, ...totals);
    const busiest = totals.indexOf(max);
    const order = [1, 2, 3, 4, 5, 6, 0];
    return (
        <div className={styles.rhythmCard}>
            <div className={styles.weekdays}>
                {order.map((dow) => (
                    <div key={dow} className={styles.weekday}>
                        <span
                            className={styles.weekdayBar}
                            data-top={dow === busiest || undefined}
                            style={{
                                height: `${Math.max(4, (totals[dow] / max) * 100)}%`,
                            }}
                            title={`${WEEKDAYS[dow]}: ${Math.round(totals[dow] / 3_600_000)} h`}
                        />
                        <span className={styles.weekdayLabel}>
                            {WEEKDAYS[dow]}
                        </span>
                    </div>
                ))}
            </div>
            {max > 1 ? null : (
                <p className={styles.rhythmNote}>Need more data</p>
            )}
        </div>
    );
}
