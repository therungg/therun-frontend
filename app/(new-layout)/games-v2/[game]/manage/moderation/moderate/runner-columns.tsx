'use client';

import { type Ref, useTransition } from 'react';
import { toast } from 'react-toastify';
import { runnerProfileHref } from '~src/lib/runner-profile-href';
import type {
    LeaderboardEntry,
    VariableRow,
} from '../../../../../../../types/leaderboards.types';
import type {
    AnonymizeRuleWithNames,
    ManualTimeRow,
    PublicModLogEntry,
    UserEligibleRunRow,
} from '../../../../../../../types/moderation.types';
import { RunnerAvatar } from '../../../leaderboard/runner-avatar';
import {
    countTrackRecord,
    publicBoardHref,
    type RunnerCombo,
    type TrackRecord,
} from '../runner/[userId]/runner-model';
import { subcategoryLabel } from '../worklist/worklist-model';
import { eventVerbLabel, shortAgo } from './event-row';
import styles from './moderate-panel.module.scss';
import { Time } from './run-columns';
import { liftHideRule } from './run-heavy-verbs';
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
export const trackRecord = (combos: RunnerCombo[]): TrackRecord =>
    countTrackRecord(combos.flatMap((c) => c.runs));

/** `${categoryId}::${subcategoryKey}`, the same key a combo carries. */
export const boardKey = (categoryId: number, subcategoryKey: string) =>
    `${categoryId}::${subcategoryKey}`;

export type OpenSubject = { entry: LeaderboardEntry; board: SheetBoard };

const comboBoard = (combo: RunnerCombo): SheetBoard => ({
    categoryId: combo.categoryId,
    categorySlug: combo.categorySlug ?? '',
    categoryDisplay: combo.categoryDisplay,
    subcategoryKey: combo.subcategoryKey,
    primaryTiming: combo.primaryTiming === 'gametime' ? 'gt' : 'rt',
});

/** One of the runner's runs on a combo, as the Run tab reads a subject. */
export function runRowSubject(
    combo: RunnerCombo,
    run: UserEligibleRunRow,
    userId: number,
    runnerName: string,
): OpenSubject {
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
        board: comboBoard(combo),
    };
}

/** One of the runner's manual times, opened as a manual entry. */
export function manualRowSubject(
    combo: RunnerCombo,
    manual: ManualTimeRow,
    userId: number,
    runnerName: string,
): OpenSubject {
    const gt = manual.timing === 'gametime';
    return {
        entry: {
            runId: null,
            manualTimeId: manual.id,
            rank: 0,
            runnerName,
            userId,
            isGuest: false,
            time: manual.timeMs,
            realTime: gt ? null : manual.timeMs,
            gameTime: gt ? manual.timeMs : null,
            runDate: manual.runDate ?? manual.createdAt,
            vodUrl: manual.evidenceUrl,
            verificationStatus: manual.verificationStatus,
            source: 'manual',
        },
        board: comboBoard(combo),
    };
}

/** The run a combo has on its board, as the Run tab reads a subject. */
export function comboRunSubject(
    combo: RunnerCombo,
    userId: number,
    runnerName: string,
): OpenSubject | null {
    return combo.board
        ? runRowSubject(combo, combo.board, userId, runnerName)
        : null;
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
    hiddenLabels,
    rootRef,
}: {
    runnerName: string;
    gameDisplay: string;
    /** Null until the read lands. */
    record: TrackRecord | null;
    /** "Banned from 16 Star", or null when not banned. Undefined while loading. */
    banLabel: string | null | undefined;
    /** "Hidden on 16 Star", "Hidden everywhere": one per live rule. */
    hiddenLabels: string[];
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
                    {hiddenLabels.map((label) => (
                        <span
                            key={label}
                            className={styles.status}
                            data-tone="neutral"
                        >
                            {label}
                        </span>
                    ))}
                    {/* The runner page falls back to "Runner #<id>" when no
                    feed carries the name; there is no profile to link then. */}
                    {/^Runner #\d+$/.test(runnerName) ? null : (
                        <a
                            className={styles.pageLink}
                            href={runnerProfileHref(runnerName)}
                        >
                            Public profile
                        </a>
                    )}
                </div>
                <div className={styles.where}>
                    {gameDisplay}
                    {record?.since
                        ? ` · first run ${monthYear(record.since)}`
                        : ''}
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
    boardsVisible,
    variables,
    comesOff,
    formOpen,
    runnerPage,
    onRunnerPage,
    userId,
    runnerName,
    onOpenRun,
}: {
    /** Null until the read lands. */
    combos: RunnerCombo[] | null;
    record: TrackRecord | null;
    gameSlug: string;
    /** Board names link to their boards only when the viewer can open them. */
    boardsVisible: boolean;
    variables: VariableRow[];
    /** Boards a ban preview takes the runner off, by `boardKey`. Null outside the Ban form. */
    comesOff: ReadonlySet<string> | null;
    formOpen: boolean;
    runnerPage: string;
    /** Mounted on the runner page itself: every run is listed, no self link. */
    onRunnerPage: boolean;
    userId: number;
    runnerName: string;
    onOpenRun: (subject: OpenSubject) => void;
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
                    {comesOff
                        ? `${hitCount} ${hitCount === 1 ? 'comes' : 'come'} off`
                        : onBoards.length}
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
                        const href = boardsVisible
                            ? publicBoardHref(gameSlug, combo)
                            : null;
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
                                    onClick={() => {
                                        const subject = comboRunSubject(
                                            combo,
                                            userId,
                                            runnerName,
                                        );
                                        if (subject) onOpenRun(subject);
                                    }}
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
            {onRunnerPage ? (
                <OffBoardRows
                    combos={combos}
                    gameSlug={gameSlug}
                    boardsVisible={boardsVisible}
                    variables={variables}
                    formOpen={formOpen}
                    userId={userId}
                    runnerName={runnerName}
                    onOpenRun={onOpenRun}
                />
            ) : record.pending > 0 || record.declined > 0 ? (
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

interface OffBoardRow {
    key: string;
    combo: RunnerCombo;
    ms: number | null;
    status: RowStatus;
    manual: boolean;
    subject: OpenSubject;
}

/** Pending, declined and manual-time rows, for the runner page's own mount. */
function OffBoardRows({
    combos,
    gameSlug,
    boardsVisible,
    variables,
    formOpen,
    userId,
    runnerName,
    onOpenRun,
}: {
    combos: RunnerCombo[];
    gameSlug: string;
    boardsVisible: boolean;
    variables: VariableRow[];
    formOpen: boolean;
    userId: number;
    runnerName: string;
    onOpenRun: (subject: OpenSubject) => void;
}) {
    const rows: OffBoardRow[] = [];
    for (const combo of combos) {
        const gt = combo.primaryTiming === 'gametime';
        for (const run of combo.runs) {
            const status = asStatus(run.verificationStatus);
            if (status === 'verified' || run.runId === combo.board?.runId)
                continue;
            rows.push({
                key: `run:${run.runId}`,
                combo,
                ms: gt ? run.gameTime : run.time,
                status,
                manual: false,
                subject: runRowSubject(combo, run, userId, runnerName),
            });
        }
        for (const m of combo.manualTimes) {
            rows.push({
                key: `manual:${m.id}`,
                combo,
                ms: m.timeMs,
                status: m.verificationStatus,
                manual: true,
                subject: manualRowSubject(combo, m, userId, runnerName),
            });
        }
    }
    const order: Record<RowStatus, number> = {
        pending: 0,
        rejected: 1,
        verified: 2,
    };
    rows.sort((a, b) => order[a.status] - order[b.status]);
    if (rows.length === 0) return null;
    return (
        <>
            <div className={styles.sectionHead}>
                <span>Off the boards</span>
                <span>{rows.length}</span>
            </div>
            <ul className={styles.boardRows}>
                {rows.map((row) => {
                    const sub = subcategoryLabel(row.combo, variables);
                    const href = boardsVisible
                        ? publicBoardHref(gameSlug, row.combo)
                        : null;
                    const name = (
                        <>
                            <b>{row.combo.categoryDisplay}</b>
                            {sub ? <span> · {sub}</span> : null}
                        </>
                    );
                    return (
                        <li key={row.key} className={styles.boardRow}>
                            {href ? (
                                <a className={styles.boardName} href={href}>
                                    {name}
                                </a>
                            ) : (
                                <span className={styles.boardName}>{name}</span>
                            )}
                            <span className={styles.boardRank}>
                                {row.manual ? 'Manual' : ''}
                            </span>
                            <button
                                type="button"
                                className={styles.boardTime}
                                onClick={() => onOpenRun(row.subject)}
                                disabled={formOpen}
                                title="Open this run"
                            >
                                <Time ms={row.ms} />
                            </button>
                            <span className={styles.boardStatus}>
                                <span
                                    className={styles.status}
                                    data-tone={STATUS_TONE[row.status]}
                                >
                                    {STATUS_LABEL[row.status]}
                                </span>
                            </span>
                        </li>
                    );
                })}
            </ul>
        </>
    );
}

/** The live hide identity rule a log line created, if it is still live. */
function liveRuleOf(
    entry: PublicModLogEntry,
    rules: AnonymizeRuleWithNames[],
): AnonymizeRuleWithNames | null {
    if (entry.action !== 'anonymize_apply' || entry.entity !== 'anonymize_rule')
        return null;
    if (!entry.target || !/^\d+$/.test(entry.target)) return null;
    const ruleId = Number.parseInt(entry.target, 10);
    return rules.find((r) => r.ruleId === ruleId && !r.liftedAt) ?? null;
}

/** One log line in the Run tab's history style: verb · by · reason · when. */
function LogEvent({
    entry,
    liveRule,
    gameSlug,
    onUndone,
}: {
    entry: PublicModLogEntry;
    /** Set when this line is a Hide identity whose rule the viewer can lift. */
    liveRule: AnonymizeRuleWithNames | null;
    gameSlug: string;
    onUndone: () => void;
}) {
    const [pending, startTransition] = useTransition();
    const undo = () => {
        if (!liveRule) return;
        startTransition(async () => {
            try {
                const res = await liftHideRule(gameSlug, liveRule);
                if ('error' in res) {
                    toast.error(res.error);
                    return;
                }
                toast.success('Undone.');
                onUndone();
            } catch {
                toast.error(
                    "Couldn't undo. Check your connection and try again.",
                );
            }
        });
    };
    return (
        <li className={styles.event}>
            <span className={styles.eventVerb}>
                {eventVerbLabel(entry.action)}
            </span>
            <span className={styles.eventBy}>
                {entry.actor.username}
                {entry.reason ? (
                    <>
                        {' · '}
                        <q>{entry.reason}</q>
                    </>
                ) : null}
            </span>
            <span className={styles.eventWhen}>
                <time dateTime={entry.at}>{shortAgo(entry.at)}</time>
                {liveRule ? (
                    <button
                        type="button"
                        className={styles.undo}
                        onClick={undo}
                        disabled={pending}
                    >
                        {pending ? 'Undoing…' : 'Undo'}
                    </button>
                ) : null}
            </span>
        </li>
    );
}

export function RunnerRight({
    modLog,
    modLogTotal,
    runnerPage,
    onRunnerPage,
    anonymizeRules,
    canLift,
    gameSlug,
    onUndone,
}: {
    /** Null until the read lands. */
    modLog: PublicModLogEntry[] | null;
    modLogTotal: number;
    runnerPage: string;
    onRunnerPage: boolean;
    anonymizeRules: AnonymizeRuleWithNames[];
    /** Site admin: Hide identity lines offer Undo while their rule is live. */
    canLift: boolean;
    gameSlug: string;
    onUndone: () => void;
}) {
    if (!modLog) return null;
    return (
        <section className={styles.section}>
            <div className={styles.sectionHead}>
                <span>Log</span>
                <span>{modLogTotal}</span>
            </div>
            {modLog.length > 0 ? (
                <ul className={styles.events}>
                    {modLog.map((entry) => (
                        <LogEvent
                            key={entry.id}
                            entry={entry}
                            liveRule={
                                canLift
                                    ? liveRuleOf(entry, anonymizeRules)
                                    : null
                            }
                            gameSlug={gameSlug}
                            onUndone={onUndone}
                        />
                    ))}
                </ul>
            ) : (
                <p className={styles.quiet}>No events yet</p>
            )}
            {modLogTotal > modLog.length && !onRunnerPage ? (
                <a className={styles.showAll} href={runnerPage}>
                    Show all {modLogTotal}
                </a>
            ) : null}
        </section>
    );
}
