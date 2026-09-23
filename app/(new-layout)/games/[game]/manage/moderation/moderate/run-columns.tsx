'use client';

import type { Ref } from 'react';
import { BoxArrowUpRight } from 'react-bootstrap-icons';
import { Vod } from '~src/components/run/dashboard/vod';
import { DurationToFormatted } from '~src/components/util/datetime';
import { rendersAsRoster } from '~src/lib/run-view/roster';
import { isEmbeddableVod } from '~src/lib/vod-url';
import type { LeaderboardEntry } from '../../../../../../../types/leaderboards.types';
import type { HistoryEvent } from '../../../../../../../types/moderation.types';
import { relativeDate } from '../../../leaderboard/relative-date';
import { RunnerAvatar } from '../../../leaderboard/runner-avatar';
import { RunnerIdentity } from '../../../leaderboard/runners';
import type { TrackRecord } from '../runner/[userId]/runner-model';
import { EventRow } from './event-row';
import styles from './moderate-panel.module.scss';
import type { RunStatus } from './run-verbs';
import type { RunSheetSummary } from './sheet-types';

const STATUS_LABEL: Record<RunStatus, string> = {
    pending: 'Pending',
    verified: 'Verified',
    rejected: 'Declined',
};

/** A time in mono, or an ellipsis while there is none. */
export function Time({ ms }: { ms: number | null }) {
    return (
        <span className={styles.mono}>
            {ms == null ? '…' : <DurationToFormatted duration={ms} />}
        </span>
    );
}

export type { TrackRecord } from '../runner/[userId]/runner-model';

export function RunIdentity({
    entry,
    status,
    excluded,
    categoryDisplay,
    subcategory,
    clock,
    formOpen,
    onOpenRunner,
    rootRef,
}: {
    entry: LeaderboardEntry;
    status: RunStatus;
    excluded: boolean;
    categoryDisplay: string;
    subcategory: string;
    clock: string;
    formOpen: boolean;
    onOpenRunner: () => void;
    /** Lets the tab find the panel it is mounted in. */
    rootRef: Ref<HTMLDivElement>;
}) {
    const tone = excluded
        ? 'neutral'
        : status === 'verified'
          ? 'verified'
          : status === 'rejected'
            ? 'declined'
            : 'pending';
    // A moderator verifying a co-op run needs to see the whole team, not
    // just whoever filed it (audit finding: the sheet used to show only
    // `entry.runnerName`). `rendersAsRoster` is the ONE test the board row,
    // the run page's hero and its Runners panel all use for this — not a
    // `length >= 2` reimplementation, which reads the feature's own headline
    // flow (A files, B is credited, A takes themselves off -> a ONE-member
    // roster naming B) wrong: it would fall through to `entry.runnerName`,
    // naming A — the person no longer credited — to the moderator deciding
    // the run.
    const roster = entry.participants;
    const showRoster = rendersAsRoster(roster, entry);
    return (
        <>
            <div ref={rootRef} className={styles.idLeft}>
                <div className={styles.who}>
                    {showRoster ? (
                        <span className={styles.whoRoster}>
                            {roster.map((member, i) => (
                                <span
                                    key={`${member.userId ?? 'g'}-${member.name}-${i}`}
                                >
                                    <RunnerIdentity
                                        name={member.name}
                                        picture={member.picture}
                                        country={member.country}
                                        size="sm"
                                        link={member.userId != null}
                                        hoverCard={member.userId != null}
                                    />
                                    {i < roster.length - 1 ? ', ' : ''}
                                </span>
                            ))}
                        </span>
                    ) : (
                        <>
                            <RunnerAvatar
                                name={entry.runnerName}
                                picture={entry.picture}
                                anonymous={entry.anonymized}
                            />
                            {entry.userId != null ? (
                                <button
                                    type="button"
                                    className={styles.whoName}
                                    onClick={onOpenRunner}
                                    disabled={formOpen}
                                >
                                    {entry.runnerName}
                                </button>
                            ) : (
                                <span className={styles.whoNameStatic}>
                                    {entry.runnerName}
                                </span>
                            )}
                        </>
                    )}
                    <span className={styles.status} data-tone={tone}>
                        {excluded ? 'Removed' : STATUS_LABEL[status]}
                    </span>
                </div>
                <div className={styles.where}>
                    <b>{categoryDisplay}</b>
                    {subcategory ? ` · ${subcategory}` : ''} · {clock}
                    {entry.runDate
                        ? ` · submitted ${relativeDate(entry.runDate)}`
                        : ''}
                    {entry.source === 'manual' ? ' · manual time' : ''}
                </div>
            </div>
            <div className={styles.idRight}>
                <span className={styles.bigTime}>
                    {entry.time != null ? (
                        <DurationToFormatted duration={entry.time} />
                    ) : (
                        '—'
                    )}
                </span>
                {entry.rank > 0 ? (
                    <div className={styles.facts}>
                        <span>
                            {status === 'pending' ? 'would be ' : ''}
                            <span className={styles.mono}>#{entry.rank}</span>
                        </span>
                    </div>
                ) : null}
            </div>
        </>
    );
}

export function RunLeft({
    vodUrl,
    summary,
    runPage,
}: {
    vodUrl: string | null;
    summary: RunSheetSummary | null;
    runPage: string | null;
}) {
    const offCount = summary?.offSegments.length ?? 0;
    return (
        <section className={styles.section}>
            {vodUrl ? (
                isEmbeddableVod(vodUrl) ? (
                    <div className={styles.video}>
                        <Vod vod={vodUrl} />
                    </div>
                ) : (
                    <a
                        href={vodUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.vodLink}
                    >
                        <BoxArrowUpRight size={14} aria-hidden />
                        <span>{vodUrl}</span>
                    </a>
                )
            ) : (
                <div className={styles.noVideo}>No video</div>
            )}
            {summary && runPage ? (
                <div className={styles.splitsLine}>
                    <div className={styles.facts}>
                        {summary.splitCount === 0 ? (
                            <span>No splits</span>
                        ) : (
                            <>
                                <span>
                                    <span className={styles.mono}>
                                        {summary.splitCount}
                                    </span>{' '}
                                    splits
                                </span>
                                {summary.consistency === 'off' ? (
                                    <span className={styles.off}>
                                        {offCount === 1
                                            ? '1 segment looks off: '
                                            : `${offCount} segments look off: `}
                                        {summary.offSegments
                                            .map((s) => s.name)
                                            .join(', ')}
                                    </span>
                                ) : (
                                    <span>Consistent</span>
                                )}
                            </>
                        )}
                    </div>
                    <a className={styles.link} href={runPage}>
                        View splits
                    </a>
                </div>
            ) : null}
        </section>
    );
}

export function RunRight({
    record,
    summary,
    history,
    expanded,
    showingAll,
    onShowAll,
    gameSlug,
    runId,
    onUndone,
}: {
    /** Null for guests, and until the runner read lands. */
    record: TrackRecord | null;
    summary: RunSheetSummary | null;
    /** Newest first: the summary's five, or everything after Show all. */
    history: HistoryEvent[];
    expanded: boolean;
    showingAll: boolean;
    onShowAll: () => void;
    gameSlug: string;
    runId: number | null;
    onUndone: () => void;
}) {
    const historyCount = summary?.historyCount ?? 0;
    return (
        <>
            {record ? (
                <section className={styles.section}>
                    <div className={styles.sectionHead}>
                        <span>Runner on this game</span>
                    </div>
                    <div className={styles.record}>
                        <span>
                            <b>{record.approved}</b> verified
                        </span>
                        <span data-bad={record.declined > 0 || undefined}>
                            <b>{record.declined}</b> declined
                        </span>
                        {record.pending > 0 ? (
                            <span>
                                <b>{record.pending}</b> pending
                            </span>
                        ) : null}
                        {record.since ? (
                            <span>since {record.since.slice(0, 4)}</span>
                        ) : null}
                    </div>
                </section>
            ) : null}
            {runId != null && summary ? (
                <section className={styles.section}>
                    <div className={styles.sectionHead}>
                        <span>History</span>
                        <span>{historyCount}</span>
                    </div>
                    {history.length > 0 ? (
                        <ul className={styles.events}>
                            {history.map((event, i) => (
                                <EventRow
                                    key={event.logId ?? `${event.at}-${i}`}
                                    event={event}
                                    isLatest={i === 0}
                                    gameSlug={gameSlug}
                                    runId={runId}
                                    onUndone={onUndone}
                                    canAct
                                />
                            ))}
                        </ul>
                    ) : (
                        <p className={styles.quiet}>No events yet</p>
                    )}
                    {!expanded && historyCount > history.length ? (
                        <button
                            type="button"
                            className={styles.showAll}
                            onClick={onShowAll}
                            disabled={showingAll}
                        >
                            Show all {historyCount}
                        </button>
                    ) : null}
                </section>
            ) : null}
        </>
    );
}
