import { PlayBtn } from 'react-bootstrap-icons';
import { VerificationBadge } from '~app/(new-layout)/games-v2/[game]/run-view/run-badges';
import { DurationToFormatted } from '~src/components/util/datetime';
import { formatRunDate } from '~src/lib/format-run-date';
import type {
    GameTimeLabel,
    LeaderboardEntry,
} from '../../../../types/leaderboards.types';
import styles from './run-hover-card.module.scss';

export interface RunHoverCardProps {
    entry: LeaderboardEntry;
    gameTimeLabel?: GameTimeLabel;
    showMilliseconds: boolean;
}

function gameTimeText(gameTimeLabel: GameTimeLabel | undefined): string {
    return gameTimeLabel === 'lrt' ? 'Load-removed time' : 'Game time';
}

/**
 * Presentational only — built entirely from the `LeaderboardEntry` already on
 * the row. Unlike `UserHoverCard`, nothing here is fetched: a board entry
 * already carries every field this card shows.
 */
export function RunHoverCard({
    entry,
    gameTimeLabel,
    showMilliseconds,
}: RunHoverCardProps) {
    // The entry's resolved time is the ranking clock; when the board also has
    // a value on the other clock, show it dimmed underneath — same
    // primary/secondary relationship the board itself renders.
    const primaryValue = entry.time;
    const hasBothClocks = entry.realTime != null && entry.gameTime != null;
    const secondaryIsRealTime =
        hasBothClocks && primaryValue === entry.gameTime;
    const secondaryIsGameTime =
        hasBothClocks && primaryValue === entry.realTime;
    const secondaryLabel = secondaryIsRealTime
        ? 'Real time'
        : secondaryIsGameTime
          ? gameTimeText(gameTimeLabel)
          : null;
    const secondaryValue = secondaryIsRealTime
        ? entry.realTime
        : secondaryIsGameTime
          ? entry.gameTime
          : null;

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <span className={styles.rank}>#{entry.rank}</span>
                <span className={styles.time}>
                    {primaryValue != null ? (
                        <DurationToFormatted
                            duration={primaryValue}
                            withMillis={showMilliseconds}
                        />
                    ) : (
                        '—'
                    )}
                </span>
            </div>

            {secondaryLabel && secondaryValue != null ? (
                <div className={styles.secondary}>
                    <span className={styles.secondaryLabel}>
                        {secondaryLabel}
                    </span>
                    <span className={styles.secondaryTime}>
                        <DurationToFormatted
                            duration={secondaryValue}
                            withMillis={showMilliseconds}
                        />
                    </span>
                </div>
            ) : null}

            <div className={styles.meta}>
                {entry.runDate ? (
                    <span className={styles.runDate}>
                        {formatRunDate(entry.runDate)}
                    </span>
                ) : null}
                {entry.vodUrl ? (
                    <span className={styles.videoIndicator}>
                        <PlayBtn size={11} aria-hidden />
                        Has video
                    </span>
                ) : null}
            </div>

            <div className={styles.status}>
                <VerificationBadge status={entry.verificationStatus} />
            </div>
        </div>
    );
}
