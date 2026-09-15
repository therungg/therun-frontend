import {
    BarChartLineFill,
    CheckCircleFill,
    HourglassSplit,
    PlayFill,
} from 'react-bootstrap-icons';
import Link from '~src/components/link';
import type { LeaderboardsProfileEntry } from '../../../../types/leaderboards-profile.types';
import {
    entrySubcategoryLabel,
    formatEntryTime,
    formatProfileDate,
    sourceLabel,
    timingLabel,
} from './format';
import styles from './leaderboards-profile.module.scss';
import { PinToggle } from './pin-toggle';

const MEDALS: Record<number, string> = {
    1: 'gold',
    2: 'silver',
    3: 'bronze',
};

/** Verified reads as a quiet tick, pending as a muted hourglass: most runs are one or the other. */
export function EntryStatus({
    entry,
    compact = false,
}: {
    entry: Pick<LeaderboardsProfileEntry, 'status' | 'verifiedAt'>;
    /** Icon only, with the word in the tooltip. */
    compact?: boolean;
}) {
    if (entry.status === 'verified') {
        return (
            <span
                className={styles.statusVerified}
                aria-label="Verified"
                title={
                    entry.verifiedAt
                        ? `Verified ${formatProfileDate(entry.verifiedAt)}`
                        : 'Verified'
                }
            >
                <CheckCircleFill size={12} aria-hidden />
                {compact ? null : 'Verified'}
            </span>
        );
    }
    if (entry.status === 'pending') {
        return (
            <span
                className={styles.statusPending}
                aria-label="Pending"
                title="Waiting for a moderator"
            >
                <HourglassSplit size={12} aria-hidden />
                {compact ? null : 'Pending'}
            </span>
        );
    }
    return <span className={styles.statusRejected}>Rejected</span>;
}

function ordinal(n: number): string {
    const tens = n % 100;
    if (tens >= 11 && tens <= 13) return `${n}th`;
    switch (n % 10) {
        case 1:
            return `${n}st`;
        case 2:
            return `${n}nd`;
        case 3:
            return `${n}rd`;
        default:
            return `${n}th`;
    }
}

/** A short date: "Aug 30" this year, "Aug 30, 2021" before it. */
function shortDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const sameYear = d.getUTCFullYear() === new Date().getUTCFullYear();
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: sameYear ? undefined : 'numeric',
        timeZone: 'UTC',
    });
}

/** The placing as a ball: the number on a medal for the podium, the ordinal after it. */
export function RankBall({
    rank,
    title,
}: {
    rank: number | null;
    title?: string;
}) {
    const medal = rank !== null ? MEDALS[rank] : undefined;
    return (
        <span
            className={styles.runMedal}
            data-medal={medal}
            data-none={rank === null || undefined}
            title={title}
        >
            {rank === null ? '—' : medal ? rank : ordinal(rank)}
        </span>
    );
}

export function EntryRow({
    entry,
    country,
}: {
    entry: LeaderboardsProfileEntry;
    country: string | null;
}) {
    const vars = entrySubcategoryLabel(entry, ', ');
    const timing = timingLabel(entry);
    const source = sourceLabel(entry.provenance);
    const total = entry.totalRunners ?? 0;
    const placing = [
        entry.rank !== null && total > 1
            ? `${ordinal(entry.rank)} of ${total.toLocaleString('en-US')} runners`
            : null,
        entry.countryRank !== null && country
            ? `#${entry.countryRank} in ${country.toUpperCase()}`
            : null,
    ].filter(Boolean);

    return (
        <div className={styles.runRow}>
            <RankBall
                rank={entry.rank}
                title={placing.length > 0 ? placing.join(', ') : undefined}
            />
            <span className={styles.runName}>
                <span className={styles.runCategory}>{entry.category}</span>
                {vars ? <span className={styles.runVars}>{vars}</span> : null}
                {total > 1 ? (
                    <span className={styles.runOf}>
                        of {total.toLocaleString('en-US')}
                    </span>
                ) : null}
            </span>
            <span className={styles.runTime}>
                {timing ? (
                    <span className={styles.entryTiming}>{timing}</span>
                ) : null}
                <span>{formatEntryTime(entry)}</span>
            </span>
            <span className={styles.runSource}>{source}</span>
            <span
                className={styles.runDate}
                title={
                    entry.runDate ? formatProfileDate(entry.runDate) : undefined
                }
            >
                {entry.runDate ? shortDate(entry.runDate) : '—'}
            </span>
            <span className={styles.runActions}>
                <EntryStatus entry={entry} compact />
                {entry.vodUrl ? (
                    <a
                        href={entry.vodUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Watch the run"
                        title="Watch the run"
                        className={styles.runIcon}
                    >
                        <PlayFill size={15} aria-hidden />
                    </a>
                ) : (
                    <span className={styles.runIconSpacer} />
                )}
                {entry.splitsHref ? (
                    <Link
                        href={entry.splitsHref}
                        className={styles.runIcon}
                        aria-label="Splits stats"
                        title="Splits stats"
                    >
                        <BarChartLineFill size={13} aria-hidden />
                    </Link>
                ) : (
                    <span className={styles.runIconSpacer} />
                )}
                <PinToggle entry={entry} />
            </span>
        </div>
    );
}
