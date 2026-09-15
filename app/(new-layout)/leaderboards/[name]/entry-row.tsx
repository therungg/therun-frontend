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
    provenanceLabel,
    timingLabel,
} from './format';
import styles from './leaderboards-profile.module.scss';
import { PinToggle } from './pin-toggle';

const MEDALS: Record<number, string> = { 1: 'gold', 2: 'silver', 3: 'bronze' };

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

export function EntryRow({
    entry,
    country,
}: {
    entry: LeaderboardsProfileEntry;
    country: string | null;
}) {
    // Not deployed everywhere yet — read defensively.
    const attempts = entry.attempts ?? null;
    const vars = entrySubcategoryLabel(entry);
    const timing = timingLabel(entry);
    const provenance = provenanceLabel(entry.provenance);
    const medal = entry.rank !== null ? MEDALS[entry.rank] : undefined;
    const details = [
        vars || null,
        entry.countryRank !== null && country
            ? `#${entry.countryRank} in ${country.toUpperCase()}`
            : null,
        entry.platform,
        entry.emulator ? 'Emulator' : null,
        entry.region,
        attempts !== null && attempts > 0
            ? `${attempts.toLocaleString('en-US')} ${attempts === 1 ? 'attempt' : 'attempts'}`
            : null,
    ].filter((d): d is string => !!d);
    const total = entry.totalRunners ?? 0;

    return (
        <div className={styles.entry} data-medal={medal}>
            <span className={styles.entryName}>
                <span className={styles.entryCategory}>{entry.category}</span>
                {details.length > 0 ? (
                    <span className={styles.entryDetails}>
                        {details.join(' · ')}
                    </span>
                ) : null}
            </span>
            <span
                className={styles.entryRankCell}
                title={
                    entry.rank !== null && total > 1
                        ? `${ordinal(entry.rank)} of ${total.toLocaleString('en-US')} runners`
                        : undefined
                }
            >
                <span
                    className={
                        entry.rank === null
                            ? `${styles.entryRank} ${styles.entryRankNone}`
                            : styles.entryRank
                    }
                >
                    {entry.rank !== null ? ordinal(entry.rank) : '—'}
                </span>
            </span>
            <span className={styles.entryTime}>
                <span>{formatEntryTime(entry)}</span>
                {timing ? (
                    <span className={styles.entryTiming}>{timing}</span>
                ) : null}
            </span>
            <span
                className={styles.entryDate}
                title={
                    entry.runDate ? formatProfileDate(entry.runDate) : undefined
                }
            >
                {entry.runDate ? shortDate(entry.runDate) : '—'}
            </span>
            <span className={styles.entryBadges}>
                <EntryStatus entry={entry} compact />
                {entry.splitsHref ? (
                    <Link
                        href={entry.splitsHref}
                        className={styles.entryIcon}
                        aria-label={provenance}
                        title={provenance}
                    >
                        <BarChartLineFill size={13} aria-hidden />
                    </Link>
                ) : (
                    <span className={styles.entryIconSpacer} />
                )}
                {entry.vodUrl ? (
                    <a
                        href={entry.vodUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Watch the run"
                        title="Watch the run"
                        className={styles.entryIcon}
                    >
                        <PlayFill size={15} aria-hidden />
                    </a>
                ) : (
                    <span className={styles.entryIconSpacer} />
                )}
                <PinToggle entry={entry} />
            </span>
        </div>
    );
}
