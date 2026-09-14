import styles from './activity.module.scss';

const pad = (n: number) => String(n % 24).padStart(2, '0');

/** The 24 hours of a day, their usual window lit. */
export function TimeOfDay({
    usual,
    place,
}: {
    usual: { startHour: number; endHour: number; share: number } | null;
    place: string | null;
}) {
    const lit = (h: number) => {
        if (!usual) return false;
        const hh = h < usual.startHour ? h + 24 : h;
        return hh >= usual.startHour && hh < usual.endHour;
    };
    return (
        <div className={styles.rhythmCard}>
            <div className={styles.hours}>
                {Array.from({ length: 24 }, (_, h) => (
                    <span
                        key={h}
                        className={styles.hour}
                        data-lit={lit(h) || undefined}
                        title={`${pad(h)}:00`}
                    />
                ))}
            </div>
            <div className={styles.hourScale} aria-hidden>
                <span>00</span>
                <span>06</span>
                <span>12</span>
                <span>18</span>
                <span>24</span>
            </div>
            <p className={styles.rhythmNote}>
                {usual
                    ? `${Math.round(usual.share * 100)}% of their attempts start between ${pad(usual.startHour)}:00 and ${pad(usual.endHour)}:00${place ? `, ${place} time` : ' (UTC)'}.`
                    : 'Not enough attempts to tell yet.'}
            </p>
        </div>
    );
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_NAMES = [
    'Sundays',
    'Mondays',
    'Tuesdays',
    'Wednesdays',
    'Thursdays',
    'Fridays',
    'Saturdays',
];

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
            <p className={styles.rhythmNote}>
                {max > 1
                    ? `${WEEKDAY_NAMES[busiest]} are their busiest day.`
                    : 'Not enough attempts to tell yet.'}
            </p>
        </div>
    );
}
