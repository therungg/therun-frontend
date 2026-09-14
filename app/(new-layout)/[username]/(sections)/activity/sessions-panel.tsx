'use client';

import { useSyncExternalStore } from 'react';
import { formatDuration } from '../format';
import ui from '../profile-ui.module.scss';
import styles from './activity.module.scss';
import type { SessionRow } from './session-rows';

const noop = () => undefined;
const subscribeNothing = () => noop;

export function SessionsPanel({ sessions }: { sessions: SessionRow[] }) {
    // Days and clock times are the viewer's own; the server renders UTC.
    const mounted = useSyncExternalStore(
        subscribeNothing,
        () => true,
        () => false,
    );
    const zone = mounted ? undefined : 'UTC';
    const dayOf = (iso: string) =>
        new Date(iso).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year:
                new Date(iso).getFullYear() === new Date().getFullYear()
                    ? undefined
                    : 'numeric',
            timeZone: zone,
        });
    const clock = (iso: string) =>
        new Date(iso).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            timeZone: zone,
        });

    const groups: { day: string; rows: SessionRow[] }[] = [];
    for (const s of sessions) {
        const day = dayOf(s.startedAt);
        const last = groups[groups.length - 1];
        if (last?.day === day) last.rows.push(s);
        else groups.push({ day, rows: [s] });
    }

    return (
        <div className={`${ui.panel} ${styles.sessions}`}>
            <div className={`${ui.colHead} ${ui.rowFlush}`} aria-hidden>
                <span>Run</span>
                <span className={ui.optional}>Time</span>
                <span className={ui.end}>Length</span>
                <span className={ui.end}>Attempts</span>
                <span className={`${ui.end} ${ui.optional}`}>Finished</span>
            </div>
            {groups.map((g) => (
                <section key={g.day} className={ui.group}>
                    <div className={ui.groupLabel}>
                        {g.day}
                        {mounted ? null : ' (UTC)'}
                    </div>
                    {g.rows.map((s) => {
                        const length =
                            new Date(s.endedAt).getTime() -
                            new Date(s.startedAt).getTime();
                        const best =
                            s.finished.length > 0
                                ? Math.min(...s.finished)
                                : null;
                        return (
                            <a
                                key={s.key}
                                href={s.href}
                                className={`${ui.row} ${ui.rowFlush}`}
                            >
                                <span className={ui.name}>
                                    <span className={ui.nameMain}>
                                        {s.game}
                                    </span>
                                    <span className={ui.nameSub}>
                                        {s.category}
                                    </span>
                                </span>
                                <span
                                    className={`${ui.num} ${ui.muted} ${ui.optional}`}
                                >
                                    {clock(s.startedAt)} – {clock(s.endedAt)}
                                </span>
                                <span className={`${ui.num} ${ui.end}`}>
                                    {formatDuration(length)}
                                </span>
                                <span className={`${ui.num} ${ui.end}`}>
                                    {s.attempts.toLocaleString('en-US')}
                                </span>
                                <span
                                    className={`${ui.end} ${ui.optional} ${ui.stacked}`}
                                >
                                    {best !== null ? (
                                        <>
                                            <span
                                                className={`${ui.num} ${ui.strong}`}
                                            >
                                                {formatDuration(best)}
                                            </span>
                                            {s.finished.length > 1 ? (
                                                <span
                                                    className={`${ui.small} ${ui.muted}`}
                                                >
                                                    best of {s.finished.length}
                                                </span>
                                            ) : null}
                                        </>
                                    ) : (
                                        <span className={ui.faint}>—</span>
                                    )}
                                </span>
                            </a>
                        );
                    })}
                </section>
            ))}
        </div>
    );
}
