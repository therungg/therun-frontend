'use client';

import { useEffect, useState } from 'react';
import { PlayBtn } from 'react-bootstrap-icons';
import type { DisplayRank } from '~app/(new-layout)/games-v2/[game]/leaderboard/display-rank';
import { relativeDate } from '~app/(new-layout)/games-v2/[game]/leaderboard/relative-date';
import type { RunStanding } from '~app/(new-layout)/games-v2/[game]/leaderboard/run-standing';
import { RunnerAvatar } from '~app/(new-layout)/games-v2/[game]/leaderboard/runner-avatar';
import type { TimingKey } from '~app/(new-layout)/games-v2/[game]/leaderboard/timing-columns';
import { VerificationBadge } from '~app/(new-layout)/games-v2/[game]/run-view/run-badges';
import { CountryFlag } from '~src/components/user/hover-card/country-flag';
import { formatRunDate } from '~src/lib/format-run-date';
import type {
    GameTimeLabel,
    LeaderboardEntry,
} from '../../../../types/leaderboards.types';
import { loadRunCard, peekRunCard, type RunCardDetail } from './run-card-store';
import styles from './run-hover-card.module.scss';

export interface RunHoverCardProps {
    entry: LeaderboardEntry;
    gameTimeLabel?: GameTimeLabel;
    showMilliseconds: boolean;
    /** The board's ranking clock. */
    primaryTiming?: TimingKey;
    /** The board's own column visibility — the card never shows a clock
     * the board hides. */
    hideRealTime?: boolean;
    hideGameTime?: boolean;
    /** The entry is ranked by real time on a game-time board. */
    rtaFallback?: boolean;
    /** Tie-resolved rank, same as the row's rank cell. */
    displayRank?: DisplayRank;
    standing?: RunStanding;
    /** Board value columns the runner actually set, already labelled. */
    values?: { label: string; value: string }[];
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Board-style clock split into its whole part and its millisecond tail. */
function clockParts(ms: number, withMillis: boolean) {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const main = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
    const millis = withMillis ? `.${String(ms % 1000).padStart(3, '0')}` : '';
    return { main, millis };
}

function clockText(ms: number, withMillis: boolean) {
    const { main, millis } = clockParts(ms, withMillis);
    return main + millis;
}

/**
 * A gap between two runs. Short gaps always keep milliseconds — "+0" would
 * say two different times are the same.
 */
function gapText(ms: number, withMillis: boolean) {
    const abs = Math.abs(ms);
    if (abs < 60_000) {
        return `${Math.floor(abs / 1000)}.${String(abs % 1000).padStart(3, '0')}`;
    }
    return clockText(abs, withMillis);
}

function gameTimeText(gameTimeLabel: GameTimeLabel | undefined): string {
    return gameTimeLabel === 'lrt' ? 'Load-removed time' : 'Game time';
}

/**
 * Built from the `LeaderboardEntry` on the row plus what the table already
 * knows about its neighbours, so it paints at once. The exceptions are the
 * timer stats and the verifier line, fetched on open (run-card-store) and
 * added when they land.
 */
export function RunHoverCard({
    entry,
    gameTimeLabel,
    showMilliseconds,
    primaryTiming = 'rt',
    hideRealTime = false,
    hideGameTime = false,
    rtaFallback = false,
    displayRank,
    standing,
    values = [],
}: RunHoverCardProps) {
    const isManual = entry.source === 'manual';
    const isRejected = entry.verificationStatus === 'rejected';
    const time = entry.time;

    // Who verified it and the runner's timer stats aren't on the board row —
    // fetched on open (set times have neither). Everything else paints from
    // the row immediately; these join when they land.
    const detailRunId = entry.runId != null && !isManual ? entry.runId : null;
    const [detail, setDetail] = useState<RunCardDetail | null | undefined>(
        () => (detailRunId != null ? peekRunCard(detailRunId) : null),
    );
    useEffect(() => {
        if (detailRunId == null || detail !== undefined) return;
        let live = true;
        loadRunCard(detailRunId).then((result) => {
            if (live) setDetail(result);
        });
        return () => {
            live = false;
        };
    }, [detailRunId, detail]);

    const isFallback =
        rtaFallback &&
        primaryTiming === 'gt' &&
        entry.gameTime == null &&
        entry.realTime != null;
    const rankedKey: TimingKey = isFallback ? 'rt' : primaryTiming;
    const rankedLabel =
        rankedKey === 'rt' ? 'Real time' : gameTimeText(gameTimeLabel);

    // Both clocks side by side only where the board itself shows both.
    const clocks =
        !hideRealTime && !hideGameTime && !isManual
            ? [
                  {
                      key: 'rt' as const,
                      label: 'Real time',
                      value: entry.realTime,
                  },
                  {
                      key: 'gt' as const,
                      label: gameTimeText(gameTimeLabel),
                      value: entry.gameTime,
                  },
              ]
            : null;

    const rankLabel = displayRank
        ? displayRank.label.replace(/^=/, '')
        : String(entry.rank);
    const podium = displayRank?.rank ?? entry.rank;
    const medalClass = isRejected
        ? styles.medalPlain
        : podium === 1
          ? styles.medalGold
          : podium === 2
            ? styles.medalSilver
            : podium === 3
              ? styles.medalBronze
              : styles.medalPlain;

    // A run that doesn't count has no standing to report.
    const showStanding = standing != null && time != null && !isRejected;
    const leaderGap =
        showStanding && standing.leaderTime != null
            ? time - standing.leaderTime
            : null;

    const videoCount = entry.vodUrls?.length
        ? entry.vodUrls.length
        : entry.vodUrl
          ? 1
          : 0;

    const relative = entry.runDate ? relativeDate(entry.runDate) : '';
    // relativeDate drops to "Aug 2025" past a year; the absolute date above
    // already says that.
    const relativeShown =
        relative.endsWith('ago') ||
        relative === 'today' ||
        relative === 'yesterday'
            ? relative
            : null;

    const parts = time != null ? clockParts(time, showMilliseconds) : null;

    // Sum of best on the clock the board ranks by; the backend only sends it
    // while this run is still the runner's PB on that clock.
    const timer = detail?.timerStats ?? null;
    const sob = timer
        ? rankedKey === 'gt'
            ? timer.gameTimeSob
            : timer.sumOfBests
        : null;
    const sobClockTime = rankedKey === 'gt' ? entry.gameTime : entry.realTime;
    const timesave =
        sob != null && sobClockTime != null ? sobClockTime - sob : null;

    return (
        <div className={styles.card}>
            {/* Anonymized rows arrive redacted (placeholder name, no picture
                or country) — key the treatment off the flag, never the name. */}
            <div className={styles.identity}>
                <RunnerAvatar
                    name={entry.runnerName}
                    picture={entry.picture}
                    size="md"
                    anonymous={entry.anonymized === true}
                />
                <span
                    className={`${styles.name} ${entry.anonymized ? styles.nameAnon : ''}`}
                >
                    {entry.runnerName}
                </span>
                {entry.anonymized ? null : (
                    <CountryFlag country={entry.country} />
                )}
            </div>

            <div className={styles.head}>
                <span className={`${styles.medal} ${medalClass}`}>
                    {isRejected ? '—' : rankLabel}
                </span>
                <div className={styles.timeBlock}>
                    <span className={styles.time}>
                        {parts ? (
                            <>
                                {parts.main}
                                {parts.millis && <small>{parts.millis}</small>}
                            </>
                        ) : (
                            '—'
                        )}
                    </span>
                    <span className={styles.clockLabel}>
                        {rankedLabel}
                        {isFallback && !isRejected ? ' · no game time' : ''}
                    </span>
                </div>
                {isManual ? (
                    <span className={styles.setTime}>Set time</span>
                ) : (
                    <VerificationBadge status={entry.verificationStatus} />
                )}
            </div>

            {showStanding &&
            (standing.isLeader ||
                leaderGap != null ||
                standing.ahead != null ||
                standing.yours != null) ? (
                <div className={styles.gap}>
                    {standing.isLeader ? (
                        <div className={styles.gapLine}>
                            <span className={styles.lead}>
                                Fastest on this board
                            </span>
                            {standing.behind ? (
                                <b>
                                    −
                                    {gapText(
                                        standing.behind.time - time,
                                        showMilliseconds,
                                    )}{' '}
                                    <span className={styles.gapAside}>
                                        to #{standing.behind.rankLabel}
                                    </span>
                                </b>
                            ) : null}
                        </div>
                    ) : null}
                    {leaderGap != null && standing.leaderTime != null ? (
                        <>
                            <div className={styles.gapLine}>
                                <span>Behind #1</span>
                                <b>
                                    +{gapText(leaderGap, showMilliseconds)}{' '}
                                    <span className={styles.gapAside}>
                                        (
                                        {(
                                            (leaderGap / standing.leaderTime) *
                                            100
                                        ).toFixed(1)}
                                        %)
                                    </span>
                                </b>
                            </div>
                            <div className={styles.track} aria-hidden>
                                <i
                                    style={{
                                        width: `${(standing.leaderTime / time) * 100}%`,
                                    }}
                                />
                            </div>
                        </>
                    ) : null}
                    {standing.ahead && !standing.isLeader ? (
                        <div className={styles.gapLine}>
                            <span>To pass #{standing.ahead.rankLabel}</span>
                            <b>
                                −
                                {gapText(
                                    time - standing.ahead.time,
                                    showMilliseconds,
                                )}
                            </b>
                        </div>
                    ) : null}
                    {/* Read from the viewer's side: how this run compares
                        to the time they'd have to beat or defend. */}
                    {standing.yours != null ? (
                        <div className={styles.gapLine}>
                            <span className={styles.you}>Your PB</span>
                            <b>
                                {standing.yours === time
                                    ? 'Same time'
                                    : `${gapText(
                                          time - standing.yours,
                                          showMilliseconds,
                                      )} ${time < standing.yours ? 'faster' : 'slower'}`}
                            </b>
                        </div>
                    ) : null}
                </div>
            ) : null}

            {clocks ? (
                <div className={styles.clocks}>
                    {clocks.map((c) => (
                        <div
                            key={c.key}
                            className={`${styles.clock} ${c.key === rankedKey && !isRejected ? styles.clockRanked : ''}`}
                        >
                            <span>{c.label}</span>
                            <b className={c.value == null ? styles.none : ''}>
                                {c.value != null
                                    ? clockText(c.value, showMilliseconds)
                                    : 'not recorded'}
                            </b>
                        </div>
                    ))}
                </div>
            ) : null}

            {timer && (sob != null || timer.attemptCount != null) ? (
                <div className={styles.timerStats}>
                    {sob != null ? (
                        <div className={styles.timerStat}>
                            <span>Sum of best</span>
                            <b>{clockText(sob, showMilliseconds)}</b>
                            {timesave != null && timesave > 0 ? (
                                <small>
                                    {gapText(timesave, showMilliseconds)}{' '}
                                    possible timesave
                                </small>
                            ) : null}
                        </div>
                    ) : null}
                    {timer.attemptCount != null ? (
                        <div className={styles.timerStat}>
                            <span>Attempts</span>
                            <b>{timer.attemptCount.toLocaleString('en-US')}</b>
                            {timer.finishedAttemptCount != null ? (
                                <small>
                                    {timer.finishedAttemptCount.toLocaleString(
                                        'en-US',
                                    )}{' '}
                                    finished
                                </small>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            ) : null}

            {values.length > 0 ? (
                <div className={styles.values}>
                    {values.map((v) => (
                        <span key={v.label} className={styles.value}>
                            {v.label} <b>{v.value}</b>
                        </span>
                    ))}
                </div>
            ) : null}

            {detail?.verifiedBy ? (
                <div className={styles.verifiedBy}>
                    Verified by <b>{detail.verifiedBy.name}</b>
                    {detail.verifiedAt
                        ? ` · ${formatRunDate(detail.verifiedAt)}`
                        : null}
                </div>
            ) : null}

            <div className={styles.foot}>
                <span className={styles.date}>
                    {entry.runDate ? (
                        <>
                            <span>{formatRunDate(entry.runDate)}</span>
                            {relativeShown ? (
                                <small>{relativeShown}</small>
                            ) : null}
                        </>
                    ) : (
                        <span>No date</span>
                    )}
                </span>
                <span className={styles.footRight}>
                    {entry.srcRunId ? (
                        <span className={styles.quiet}>Imported</span>
                    ) : null}
                    {videoCount > 0 ? (
                        <span className={styles.video}>
                            <PlayBtn size={12} aria-hidden />
                            {videoCount > 1 ? `${videoCount} videos` : 'Video'}
                        </span>
                    ) : (
                        <span className={styles.quiet}>No video</span>
                    )}
                </span>
            </div>
        </div>
    );
}
