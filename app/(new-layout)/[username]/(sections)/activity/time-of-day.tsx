'use client';

import { useSyncExternalStore } from 'react';
import styles from './activity.module.scss';

interface Usual {
    startHour: number;
    endHour: number;
    share: number;
}

const noop = () => undefined;
const subscribeNothing = () => noop;

/** Minutes a timezone is ahead of UTC right now; null if Intl doesn't know it. */
export function offsetMinutes(timeZone: string, at: Date): number | null {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone,
            hourCycle: 'h23',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        }).formatToParts(at);
        const get = (type: string) =>
            Number(parts.find((p) => p.type === type)?.value ?? 0);
        const asUtc = Date.UTC(
            get('year'),
            get('month') - 1,
            get('day'),
            get('hour'),
            get('minute'),
        );
        return Math.round((asUtc - at.getTime()) / 60_000);
    } catch {
        return null;
    }
}

/** "7 PM", "11:30 AM" for minutes past midnight, wrapping at a day. */
export function clock(minutes: number): string {
    const m = ((minutes % 1440) + 1440) % 1440;
    const h = Math.floor(m / 60);
    const min = m % 60;
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}${min ? `:${String(min).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
}

export const place = (timeZone: string) =>
    (timeZone.split('/').pop() ?? timeZone).replace(/_/g, ' ');

/**
 * The runner's usual hours on a 24-hour strip, in the viewer's own time. The
 * backend measures them in the runner's timezone; the server can't know the
 * viewer's, so it renders the runner's clock and the browser shifts it.
 */
export function TimeOfDay({
    usual,
    timezone,
}: {
    usual: Usual | null;
    timezone: string | null;
}) {
    const mounted = useSyncExternalStore(
        subscribeNothing,
        () => true,
        () => false,
    );

    if (!usual || !timezone) {
        return (
            <div className={styles.rhythmCard}>
                <Strip startMinute={null} endMinute={null} />
                <p className={styles.rhythmNote}>
                    Not enough attempts to tell yet.
                </p>
            </div>
        );
    }

    const now = new Date();
    const runnerOffset = offsetMinutes(timezone, now);
    const viewerZone = mounted
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : null;
    const viewerOffset = mounted ? -now.getTimezoneOffset() : null;
    const shift =
        viewerOffset !== null && runnerOffset !== null
            ? viewerOffset - runnerOffset
            : 0;
    const sameClock = shift === 0;

    const start = usual.startHour * 60 + shift;
    const end = usual.endHour * 60 + shift;
    const share = Math.round(usual.share * 100);
    const theirs = `${clock(usual.startHour * 60)}–${clock(usual.endHour * 60)} in ${place(timezone)}`;

    return (
        <div className={styles.rhythmCard}>
            <Strip startMinute={start} endMinute={end} />
            <p className={styles.rhythmNote}>
                {mounted ? (
                    sameClock ? (
                        <>
                            {share}% of their runs finish between{' '}
                            <b>
                                {clock(start)} and {clock(end)}
                            </b>
                            , the same clock as yours.
                        </>
                    ) : (
                        <>
                            {share}% of their runs finish between{' '}
                            <b>
                                {clock(start)} and {clock(end)}
                            </b>{' '}
                            your time
                            {viewerZone ? ` (${place(viewerZone)})` : ''}.
                            <span className={styles.rhythmSub}>
                                That's {theirs} for them.
                            </span>
                        </>
                    )
                ) : (
                    <>
                        {share}% of their runs finish between {theirs}.
                    </>
                )}
            </p>
        </div>
    );
}

/** 24 hour cells, lit where the window covers most of the hour. */
function Strip({
    startMinute,
    endMinute,
}: {
    startMinute: number | null;
    endMinute: number | null;
}) {
    const lit = (h: number) => {
        if (startMinute === null || endMinute === null) return false;
        const mid = h * 60 + 30;
        for (const day of [-1440, 0, 1440]) {
            if (mid >= startMinute + day && mid < endMinute + day) return true;
        }
        return false;
    };
    return (
        <>
            <div className={styles.hours}>
                {Array.from({ length: 24 }, (_, h) => (
                    <span
                        key={h}
                        className={styles.hour}
                        data-lit={lit(h) || undefined}
                        title={clock(h * 60)}
                    />
                ))}
            </div>
            <div className={styles.hourScale} aria-hidden>
                <span>12 AM</span>
                <span>6 AM</span>
                <span>12 PM</span>
                <span>6 PM</span>
                <span>12 AM</span>
            </div>
        </>
    );
}
