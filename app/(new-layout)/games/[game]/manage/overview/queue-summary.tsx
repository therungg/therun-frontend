'use client';

import { use } from 'react';
import { ArrowRight, CheckCircleFill } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { VariableRow } from '../../../../../../types/leaderboards.types';
import type {
    WorklistDigest,
    WorklistPage,
} from '../../../../../../types/worklist.types';
import { RunnerAvatar } from '../../leaderboard/runner-avatar';
import {
    ageLabel,
    entryRow,
    type WhyTone,
} from '../moderation/worklist/worklist-model';
import styles from './queue-summary.module.scss';

const NEXT_UP_LIMIT = 4;

type NextUp = {
    key: string;
    /** The item's review, over the queue. */
    href: string;
    name: string;
    picture: string | null;
    sub: string;
    reason: string;
    tone: WhyTone;
    timeMs: number;
    since: string;
};

const QUEUE = '?pane=mod-queue';

/** The first few things to decide, in the order the queue lists them. */
function nextUp(page: WorklistPage, variables: VariableRow[]): NextUp[] {
    return page.items.slice(0, NEXT_UP_LIMIT).map((e) => {
        const row = entryRow(e, variables);
        return {
            key: row.key,
            href: `${QUEUE}&${row.target.kind}=${row.target.id}`,
            name: row.runnerName,
            picture: row.picture,
            sub: row.board,
            reason: row.why.text,
            tone: row.why.tone,
            timeMs: row.timeMs,
            since: row.waitingSince,
        };
    });
}

function digestSentence(d: WorklistDigest): string | null {
    const flagged = d.flagged.reduce((n, f) => n + f.count, 0);
    const parts: string[] = [];
    if (d.autoVerified > 0)
        parts.push(`${d.autoVerified} verified automatically`);
    if (d.modVerified > 0)
        parts.push(`${d.modVerified} verified by a moderator`);
    if (d.declined > 0) parts.push(`${d.declined} declined`);
    if (flagged > 0) parts.push(`${flagged} flagged by checks`);
    if (parts.length === 0) return null;
    const list =
        parts.length === 1
            ? parts[0]
            : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
    return `Last ${d.days} days: ${list}.`;
}

/**
 * The summary's placeholder while the queue is still being computed. The mod
 * queue is the slowest call the console makes, so the overview renders this
 * and fills it in when the numbers arrive.
 */
export function QueueSummarySkeleton() {
    return (
        <div
            className={styles.skeleton}
            aria-busy
            aria-label="Loading the mod queue"
        />
    );
}

/**
 * The summary, fed by the promises the server handed over unresolved. Held
 * inside a Suspense boundary by the overview, so the rest of the console
 * paints while the queue is still being worked out.
 */
export function StreamedQueueSummary({
    worklist,
    digest,
    ...rest
}: {
    worklist?: Promise<WorklistPage | null>;
    digest?: Promise<WorklistDigest | null>;
    variables: VariableRow[];
    onOpenQueue: () => void;
}) {
    // `use` may be called conditionally — a console rendered without these
    // promises (no moderator permission) simply has nothing to wait for.
    const page = worklist ? use(worklist) : null;
    const history = digest ? use(digest) : null;
    return <QueueSummary worklist={page} digest={history} {...rest} />;
}

/**
 * The queue, read at a glance: one number, what it is made of, and the
 * first few runs to decide. Every row opens straight into its review.
 */
export function QueueSummary({
    worklist,
    digest,
    variables,
    onOpenQueue,
}: {
    worklist: WorklistPage | null;
    digest: WorklistDigest | null;
    variables: VariableRow[];
    onOpenQueue: () => void;
}) {
    const now = new Date();
    const history = digest ? digestSentence(digest) : null;

    if (!worklist) {
        return (
            <section className={styles.summary} aria-label="Mod queue">
                <p className={styles.unavailable}>
                    The mod queue didn't load. Open it to try again.
                </p>
                <button
                    type="button"
                    className={styles.open}
                    onClick={onOpenQueue}
                >
                    Open the queue
                </button>
            </section>
        );
    }

    const { counts } = worklist;
    const waiting = counts.total;
    const onRunners = worklist.waitingOnRunners.count;
    const rows = nextUp(worklist, variables);

    if (waiting === 0) {
        return (
            <section
                className={styles.summary}
                data-state="clear"
                aria-label="Mod queue"
            >
                <div className={styles.clear}>
                    <CheckCircleFill className={styles.clearIcon} aria-hidden />
                    <div>
                        <h3 className={styles.clearTitle}>All caught up</h3>
                        <p className={styles.clearSub}>
                            {history ??
                                'No runs were decided in the last 7 days.'}
                            {onRunners > 0 &&
                                ` ${onRunners} ${onRunners === 1 ? 'run is' : 'runs are'} waiting on ${onRunners === 1 ? 'its runner' : 'their runners'}.`}
                        </p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className={styles.summary} aria-label="Mod queue">
            <div className={styles.head}>
                <div className={styles.headText}>
                    <h3 className={styles.headline}>
                        <span className={styles.count}>
                            {waiting.toLocaleString()}
                        </span>
                        <span className={styles.headWords}>to review</span>
                    </h3>
                </div>
                <button
                    type="button"
                    className={styles.open}
                    onClick={onOpenQueue}
                >
                    Open the queue
                    <ArrowRight size={14} aria-hidden />
                </button>
            </div>

            {rows.length > 0 && (
                <div>
                    <h4 className={styles.upNext}>Up next</h4>
                    <ol className={styles.rows}>
                        {rows.map((r) => (
                            <li key={r.key}>
                                <Link
                                    href={r.href}
                                    scroll={false}
                                    className={styles.row}
                                >
                                    <RunnerAvatar
                                        name={r.name}
                                        picture={r.picture}
                                        size="md"
                                    />
                                    <span className={styles.who}>
                                        <span className={styles.name}>
                                            {r.name}
                                        </span>
                                        <span className={styles.sub}>
                                            {r.sub}
                                        </span>
                                    </span>
                                    <span
                                        className={styles.reason}
                                        data-tone={r.tone}
                                    >
                                        {r.reason}
                                    </span>
                                    <span className={styles.time}>
                                        <DurationToFormatted
                                            duration={r.timeMs}
                                        />
                                    </span>
                                    <span
                                        className={styles.age}
                                        title="How long it has waited"
                                        suppressHydrationWarning
                                    >
                                        {ageLabel(r.since, now)}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ol>
                </div>
            )}

            {(history || onRunners > 0) && (
                <p className={styles.history}>
                    {history}
                    {onRunners > 0 &&
                        ` ${onRunners} ${onRunners === 1 ? 'run is' : 'runs are'} waiting on ${onRunners === 1 ? 'its runner' : 'their runners'}.`}
                </p>
            )}
        </section>
    );
}
