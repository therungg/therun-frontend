'use client';

import moment from 'moment';
import { Fragment, useState } from 'react';
import { formatDuration } from '~src/lib/duration';
import type { VariableRow } from '../../../../../../types/leaderboards.types';
import type { TimelineEvent } from '../../../../../../types/run-review.types';
import { RunnerAvatar } from '../../leaderboard/runner-avatar';
import styles from './mod-layer.module.scss';
import {
    type ChangeValue,
    type DetailPart,
    describeTimelineEvent,
    type TimelineCopyContext,
    type TimelineTone,
} from './timeline-copy';

/** Past this many rows the middle folds away behind "Show all". */
const TAIL = 8;

const TONE_CLASS: Record<TimelineTone, string | undefined> = {
    red: styles.tlDotRed,
    amber: styles.tlDotAmber,
    green: styles.tlDotGreen,
    neutral: undefined,
};

function When({
    at,
    approximate,
}: {
    at: string | null;
    approximate: boolean;
}) {
    if (!at) return <span className={styles.tlWhen}>—</span>;
    const m = moment(at);
    const label = m.format(
        m.year() === moment().year() ? 'D MMM HH:mm' : 'D MMM YYYY HH:mm',
    );
    return (
        <span
            className={styles.tlWhen}
            title={`${moment.utc(at).format('YYYY-MM-DD HH:mm:ss')} UTC${approximate ? ' (approximate)' : ''}`}
            suppressHydrationWarning
        >
            {approximate ? '~' : ''}
            {label}
        </span>
    );
}

function Value({ v }: { v: ChangeValue }) {
    switch (v.t) {
        case 'time':
            return <span className={styles.mono}>{formatDuration(v.ms)}</span>;
        case 'link':
            return (
                <a href={v.href} target="_blank" rel="noopener noreferrer">
                    {v.text}
                </a>
            );
        case 'text':
            return <>{v.text}</>;
        default:
            return <>none</>;
    }
}

function Detail({ part }: { part: DetailPart }) {
    switch (part.t) {
        case 'quote':
            return <>“{part.text}”</>;
        case 'link':
            return (
                <a href={part.href} target="_blank" rel="noopener noreferrer">
                    {part.text}
                </a>
            );
        case 'change':
            return (
                <>
                    {part.label} <Value v={part.before} /> →{' '}
                    <Value v={part.after} />
                </>
            );
        default:
            return <>{part.text}</>;
    }
}

function Row({
    event,
    ctx,
}: {
    event: TimelineEvent;
    ctx: TimelineCopyContext;
}) {
    const copy = describeTimelineEvent(event, ctx);
    const { actor } = event;
    return (
        <li className={styles.tlRow}>
            <When at={event.at} approximate={copy.approximate} />
            <span className={styles.tlRail} aria-hidden>
                <span
                    className={`${styles.tlDot} ${TONE_CLASS[copy.tone] ?? ''}`}
                />
            </span>
            <div className={styles.tlBody}>
                <div className={styles.tlLine}>
                    {actor.kind === 'user' ? (
                        <span className={styles.tlActor}>
                            <RunnerAvatar
                                name={actor.name}
                                picture={actor.picture}
                                size="xs"
                            />
                            <span className={styles.tlActorName}>
                                {actor.name}
                            </span>
                        </span>
                    ) : (
                        <span className={styles.muted}>{actor.name}</span>
                    )}
                    {copy.standalone ? ' · ' : ' '}
                    {copy.sentence.map((s, i) =>
                        typeof s === 'string' ? (
                            <Fragment key={i}>{s}</Fragment>
                        ) : (
                            <a
                                key={i}
                                href={s.href}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {s.text}
                            </a>
                        ),
                    )}
                </div>
                {copy.details.length > 0 && (
                    <div className={styles.tlDetails}>
                        {copy.details.map((p, i) => (
                            <Fragment key={i}>
                                {i > 0 && ' · '}
                                <Detail part={p} />
                            </Fragment>
                        ))}
                    </div>
                )}
            </div>
        </li>
    );
}

/** Everything that happened to the run, oldest first. */
export function RunTimeline({
    timeline,
    runnerName,
    variables,
}: {
    timeline: TimelineEvent[];
    runnerName: string;
    variables: VariableRow[];
}) {
    const [expanded, setExpanded] = useState(false);
    const ctx: TimelineCopyContext = { runnerName, variables };
    const n = timeline.length;
    const folded = !expanded && n > TAIL + 1;
    const keyOf = (e: TimelineEvent, i: number) =>
        e.logId != null ? `log-${e.logId}` : `${e.kind}-${e.at}-${i}`;

    return (
        <section className={styles.panel}>
            <div className={styles.head}>
                <span className={styles.eyebrow}>Timeline</span>
                <span className={styles.count}>{n}</span>
            </div>
            <ol className={styles.timeline}>
                {folded ? (
                    <>
                        <Row event={timeline[0]} ctx={ctx} />
                        <li className={styles.tlRow}>
                            <span className={styles.tlWhen} />
                            <span className={styles.tlRail} aria-hidden />
                            <div className={styles.tlBody}>
                                <button
                                    type="button"
                                    className={styles.tlMore}
                                    onClick={() => setExpanded(true)}
                                >
                                    Show all {n}
                                </button>
                            </div>
                        </li>
                        {timeline.slice(n - TAIL).map((e, i) => (
                            <Row
                                key={keyOf(e, n - TAIL + i)}
                                event={e}
                                ctx={ctx}
                            />
                        ))}
                    </>
                ) : (
                    timeline.map((e, i) => (
                        <Row key={keyOf(e, i)} event={e} ctx={ctx} />
                    ))
                )}
            </ol>
        </section>
    );
}
