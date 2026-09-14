'use client';

import { DurationToFormatted } from '~src/components/util/datetime';
import type { VariableRow } from '../../../../../../types/leaderboards.types';
import type {
    WorklistDigest,
    WorklistPage,
} from '../../../../../../types/worklist.types';
import {
    ageTone,
    boardLabel,
    boardTimeMs,
    reasonLabel,
    TIER_COUNT_LABEL,
    waitingLabel,
} from '../moderation/worklist/worklist-model';
import styles from './queue-summary.module.scss';

const NEXT_UP_LIMIT = 4;

type NextUp = {
    key: string;
    title: string;
    board: string;
    reason: string;
    timeMs: number | null;
    since: string;
    tier: 1 | 2 | 3;
};

/**
 * The worklist, read at a glance: how much is waiting, how it splits by
 * urgency, and what to decide first. Laid out like a splits panel — the
 * thing every runner already reads without thinking: name on the left, the
 * wait where a split's delta goes, the time right-aligned.
 */
function nextUp(page: WorklistPage, variables: VariableRow[]): NextUp[] {
    const out: NextUp[] = [];
    const push = (n: NextUp) => {
        if (out.length < NEXT_UP_LIMIT) out.push(n);
    };

    for (const item of page.items.filter((i) => i.tier === 1)) {
        push({
            key: `run:${item.runId}`,
            title: item.runnerName,
            board: boardLabel(item, variables),
            reason: reasonLabel(item.reasons[0]),
            timeMs: boardTimeMs(item),
            since: item.waitingSince,
            tier: 1,
        });
    }
    for (const claim of page.selfClaims) {
        push({
            key: `claim:${claim.manualTimeId}`,
            title: claim.runnerName,
            board: boardLabel(claim, variables),
            reason: 'Typed in their own time',
            timeMs: claim.timeMs,
            since: claim.createdAt,
            tier: 1,
        });
    }
    for (const item of page.items.filter((i) => i.tier === 2)) {
        push({
            key: `run:${item.runId}`,
            title: item.runnerName,
            board: boardLabel(item, variables),
            reason: reasonLabel(item.reasons[0]),
            timeMs: boardTimeMs(item),
            since: item.waitingSince,
            tier: 2,
        });
    }
    for (const batch of page.batches) {
        const oldest = batch.items.reduce(
            (min, i) => (i.waitingSince < min ? i.waitingSince : min),
            batch.items[0]?.waitingSince ?? new Date().toISOString(),
        );
        push({
            key: `batch:${batch.key}`,
            title: batch.label,
            board: '',
            reason: 'Approve together',
            timeMs: null,
            since: oldest,
            tier: 3,
        });
    }
    for (const item of page.items.filter((i) => i.tier === 3)) {
        push({
            key: `run:${item.runId}`,
            title: item.runnerName,
            board: boardLabel(item, variables),
            reason: reasonLabel(item.reasons[0]),
            timeMs: boardTimeMs(item),
            since: item.waitingSince,
            tier: 3,
        });
    }
    return out;
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
    return `In the last ${d.days} days, ${list}.`;
}

export function QueueSummary({
    worklist,
    digest,
    variables,
    onOpenQueue,
    onOpenDecided,
}: {
    worklist: WorklistPage | null;
    digest: WorklistDigest | null;
    variables: VariableRow[];
    onOpenQueue: () => void;
    onOpenDecided: () => void;
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
                    Open the mod queue
                </button>
            </section>
        );
    }

    const { counts } = worklist;
    const waiting = counts.needsYou;
    const rows = nextUp(worklist, variables);
    const segments = ([1, 2, 3] as const)
        .map((tier) => ({
            tier,
            count: counts[`tier${tier}`],
            label: TIER_COUNT_LABEL[tier],
        }))
        .filter((s) => s.count > 0);

    return (
        <section
            className={styles.summary}
            data-state={waiting === 0 ? 'clear' : 'waiting'}
            aria-label="Mod queue"
        >
            <div className={styles.head}>
                <h3 className={styles.headline}>
                    {waiting === 0 ? (
                        'Nothing needs you.'
                    ) : (
                        <>
                            <span className={styles.count}>
                                {waiting.toLocaleString()}
                                {worklist.truncated ? '+' : ''}
                            </span>{' '}
                            waiting on you
                        </>
                    )}
                </h3>
                {waiting > 0 && (
                    <button
                        type="button"
                        className={styles.open}
                        onClick={onOpenQueue}
                    >
                        Open the mod queue
                    </button>
                )}
            </div>

            {segments.length > 0 && (
                <>
                    <div className={styles.bar} aria-hidden>
                        {segments.map((s) => (
                            <span
                                key={s.tier}
                                className={styles.segment}
                                data-tier={s.tier}
                                style={{ flexGrow: s.count }}
                            />
                        ))}
                    </div>
                    <ul className={styles.legend}>
                        {segments.map((s) => (
                            <li key={s.tier} data-tier={s.tier}>
                                <span className={styles.legendCount}>
                                    {s.count.toLocaleString()}
                                </span>{' '}
                                {s.label}
                            </li>
                        ))}
                    </ul>
                </>
            )}

            {rows.length > 0 && (
                <ol className={styles.splits} aria-label="Decide these first">
                    {rows.map((r) => {
                        const tone = ageTone(r.since, now);
                        return (
                            <li key={r.key}>
                                <button
                                    type="button"
                                    className={styles.split}
                                    data-tier={r.tier}
                                    onClick={onOpenQueue}
                                >
                                    <span className={styles.name}>
                                        <span className={styles.runner}>
                                            {r.title}
                                        </span>
                                        {r.board && (
                                            <span className={styles.board}>
                                                {r.board}
                                            </span>
                                        )}
                                    </span>
                                    <span className={styles.reason}>
                                        {r.reason}
                                    </span>
                                    <span
                                        className={styles.wait}
                                        data-tone={tone}
                                        title="How long it has waited"
                                        suppressHydrationWarning
                                    >
                                        {waitingLabel(r.since, now)}
                                    </span>
                                    <span className={styles.time}>
                                        {r.timeMs !== null ? (
                                            <DurationToFormatted
                                                duration={r.timeMs}
                                                withMillis
                                            />
                                        ) : null}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ol>
            )}

            {(history || waiting === 0) && (
                <p className={styles.history}>
                    {history ?? 'No runs were decided in the last 7 days.'}{' '}
                    <button
                        type="button"
                        className={styles.quiet}
                        onClick={onOpenDecided}
                    >
                        See decided runs
                    </button>
                </p>
            )}
        </section>
    );
}
