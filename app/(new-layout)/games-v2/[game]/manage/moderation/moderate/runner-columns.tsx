'use client';

import type { Ref } from 'react';
import type {
    LeaderboardEntry,
    ResolvedCategory,
    VariableRow,
} from '../../../../../../../types/leaderboards.types';
import type { PublicModLogEntry } from '../../../../../../../types/moderation.types';
import { LogRow } from '../../../leaderboard/moderation/moderation-log-view';
import logStyles from '../../../leaderboard/moderation/moderation-log-view.module.scss';
import { RunnerAvatar } from '../../../leaderboard/runner-avatar';
import {
    publicBoardHref,
    type RunnerCombo,
} from '../runner/[userId]/runner-model';
import { subcategoryLabel } from '../worklist/worklist-model';
import styles from './moderate-panel.module.scss';
import { Time, type TrackRecord } from './run-columns';
import type { SheetBoard } from './subject';

type RowStatus = LeaderboardEntry['verificationStatus'];

const STATUS_LABEL: Record<RowStatus, string> = {
    pending: 'Pending',
    verified: 'Approved',
    rejected: 'Declined',
};

const STATUS_TONE: Record<RowStatus, string> = {
    pending: 'pending',
    verified: 'approved',
    rejected: 'declined',
};

const asStatus = (s: string): RowStatus =>
    s === 'verified' || s === 'rejected' ? s : 'pending';

/** Approved, declined and pending across every run the runner has on this game. */
export function trackRecord(combos: RunnerCombo[]): TrackRecord {
    const counts: TrackRecord = {
        approved: 0,
        declined: 0,
        pending: 0,
        since: null,
    };
    for (const combo of combos) {
        for (const r of combo.runs) {
            if (r.verificationStatus === 'verified') counts.approved++;
            else if (r.verificationStatus === 'rejected') counts.declined++;
            else if (r.verificationStatus === 'pending') counts.pending++;
            if (counts.since === null || r.endedAt < counts.since)
                counts.since = r.endedAt;
        }
    }
    return counts;
}

/** `${categoryId}::${subcategoryKey}`, the same key a combo carries. */
export const boardKey = (categoryId: number, subcategoryKey: string) =>
    `${categoryId}::${subcategoryKey}`;

/** The run a combo has on its board, as the Run tab reads a subject. */
export function comboRunSubject(
    combo: RunnerCombo,
    userId: number,
    runnerName: string,
): { entry: LeaderboardEntry; board: SheetBoard } | null {
    const run = combo.board;
    if (!run) return null;
    const gt = combo.primaryTiming === 'gametime';
    return {
        entry: {
            runId: run.runId,
            rank: run.rank ?? 0,
            runnerName,
            userId,
            isGuest: false,
            time: gt ? run.gameTime : run.time,
            realTime: run.time,
            gameTime: run.gameTime,
            runDate: run.endedAt,
            vodUrl: run.vodUrl,
            verificationStatus: asStatus(run.verificationStatus),
            source: 'run',
        },
        board: {
            categoryId: combo.categoryId,
            categorySlug: combo.categorySlug ?? '',
            categoryDisplay: combo.categoryDisplay,
            subcategoryKey: combo.subcategoryKey,
            primaryTiming: gt ? 'gt' : 'rt',
        },
    };
}

const monthYear = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
    });

export function RunnerIdentity({
    runnerName,
    gameDisplay,
    record,
    banLabel,
    hidden,
    rootRef,
}: {
    runnerName: string;
    gameDisplay: string;
    /** Null until the read lands. */
    record: TrackRecord | null;
    /** "Banned from 16 Star", or null when not banned. Undefined while loading. */
    banLabel: string | null | undefined;
    hidden: boolean;
    rootRef: Ref<HTMLDivElement>;
}) {
    return (
        <>
            <div ref={rootRef} className={styles.idLeft}>
                <div className={styles.who}>
                    <RunnerAvatar name={runnerName} picture={null} />
                    <span className={styles.whoNameStatic}>{runnerName}</span>
                    {banLabel === undefined ? null : (
                        <span
                            className={styles.status}
                            data-tone={banLabel ? 'declined' : 'neutral'}
                        >
                            {banLabel ?? 'Not banned'}
                        </span>
                    )}
                </div>
                <div className={styles.where}>
                    {gameDisplay}
                    {record?.since
                        ? ` · first run ${monthYear(record.since)}`
                        : ''}
                    {hidden ? ' · name hidden' : ''}
                </div>
            </div>
            <div className={styles.idRight}>
                {record ? (
                    <div className={styles.record}>
                        <span>
                            <b>{record.approved}</b> approved
                        </span>
                        <span data-bad={record.declined > 0 || undefined}>
                            <b>{record.declined}</b> declined
                        </span>
                        <span>
                            <b>{record.pending}</b> pending
                        </span>
                    </div>
                ) : null}
            </div>
        </>
    );
}

export function RunnerLeft({
    combos,
    record,
    gameSlug,
    variables,
    comesOff,
    formOpen,
    runnerPage,
    onOpenRun,
}: {
    /** Null until the read lands. */
    combos: RunnerCombo[] | null;
    record: TrackRecord | null;
    gameSlug: string;
    variables: VariableRow[];
    /** Boards a ban preview takes the runner off, by `boardKey`. Null outside the Ban form. */
    comesOff: ReadonlySet<string> | null;
    formOpen: boolean;
    runnerPage: string;
    onOpenRun: (combo: RunnerCombo) => void;
}) {
    if (!combos || !record) return null;
    const onBoards = combos.filter((c) => c.board !== null);
    const hitCount = comesOff
        ? onBoards.filter((c) => comesOff.has(c.key)).length
        : 0;
    return (
        <section className={styles.section}>
            <div className={styles.sectionHead}>
                <span>On the boards</span>
                <span>
                    {comesOff ? `${hitCount} come off` : onBoards.length}
                </span>
            </div>
            {onBoards.length > 0 ? (
                <ul className={styles.boardRows}>
                    {onBoards.map((combo) => {
                        const run = combo.board;
                        if (!run) return null;
                        const status = asStatus(run.verificationStatus);
                        const hit = comesOff?.has(combo.key) ?? false;
                        const sub = subcategoryLabel(combo, variables);
                        const href = publicBoardHref(gameSlug, combo);
                        const name = (
                            <>
                                <b>{combo.categoryDisplay}</b>
                                {sub ? <span> · {sub}</span> : null}
                            </>
                        );
                        const ms =
                            combo.primaryTiming === 'gametime'
                                ? run.gameTime
                                : run.time;
                        return (
                            <li
                                key={combo.key}
                                className={styles.boardRow}
                                data-hit={hit || undefined}
                            >
                                {href ? (
                                    <a className={styles.boardName} href={href}>
                                        {name}
                                    </a>
                                ) : (
                                    <span className={styles.boardName}>
                                        {name}
                                    </span>
                                )}
                                <span className={styles.boardRank}>
                                    {combo.rank != null ? `#${combo.rank}` : ''}
                                </span>
                                <button
                                    type="button"
                                    className={styles.boardTime}
                                    onClick={() => onOpenRun(combo)}
                                    disabled={formOpen}
                                    title="Open this run"
                                >
                                    <Time ms={ms} />
                                </button>
                                <span className={styles.boardStatus}>
                                    <span
                                        className={styles.status}
                                        data-tone={
                                            hit
                                                ? 'declined'
                                                : STATUS_TONE[status]
                                        }
                                    >
                                        {hit
                                            ? 'Comes off'
                                            : STATUS_LABEL[status]}
                                    </span>
                                </span>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className={styles.quiet}>Not on any board</p>
            )}
            {record.pending > 0 || record.declined > 0 ? (
                <div className={styles.others}>
                    <span>
                        <b>{record.pending}</b> pending
                    </span>
                    <span>
                        <b>{record.declined}</b> declined
                    </span>
                    {formOpen ? null : (
                        <a className={styles.link} href={runnerPage}>
                            Show on runner page
                        </a>
                    )}
                </div>
            ) : null}
        </section>
    );
}

export function RunnerRight({
    modLog,
    modLogTotal,
    gameSlug,
    categories,
    runnerPage,
}: {
    /** Null until the read lands. */
    modLog: PublicModLogEntry[] | null;
    modLogTotal: number;
    gameSlug: string;
    categories: ResolvedCategory[];
    runnerPage: string;
}) {
    if (!modLog) return null;
    return (
        <section className={styles.section}>
            <div className={styles.sectionHead}>
                <span>Log</span>
                <span>{modLogTotal}</span>
            </div>
            {modLog.length > 0 ? (
                <ul className={logStyles.log}>
                    {modLog.map((entry) => (
                        <LogRow
                            key={entry.id}
                            entry={entry}
                            gameSlug={gameSlug}
                            categories={categories}
                        />
                    ))}
                </ul>
            ) : (
                <p className={styles.quiet}>No events yet</p>
            )}
            {modLogTotal > modLog.length ? (
                <a className={styles.showAll} href={runnerPage}>
                    Show all {modLogTotal}
                </a>
            ) : null}
        </section>
    );
}
