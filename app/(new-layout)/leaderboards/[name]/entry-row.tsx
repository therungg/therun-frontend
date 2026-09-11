import { PlayBtn } from 'react-bootstrap-icons';
import { formatSubcategoryKey } from '~app/(new-layout)/games-v2/[game]/labels';
import { VerificationBadge } from '~app/(new-layout)/games-v2/[game]/run-view/run-badges';
import Link from '~src/components/link';
import { formatBoardDate } from '~src/lib/format-run-date';
import type { LeaderboardsProfileEntry } from '../../../../types/leaderboards-profile.types';
import { formatEntryTime, provenanceLabel, timingLabel } from './format';
import styles from './leaderboards-profile.module.scss';

export function EntryRow({
    entry,
    gameSlug,
    country,
}: {
    entry: LeaderboardsProfileEntry;
    gameSlug: string;
    country: string | null;
}) {
    const href =
        gameSlug && entry.kind === 'run' && entry.runId !== null
            ? `/games-v2/${encodeURIComponent(gameSlug)}/run/${entry.runId}`
            : null;
    const details = [
        entry.platform,
        entry.emulator ? 'Emulator' : null,
        entry.region,
        provenanceLabel(entry.provenance),
        entry.verifiedAt
            ? `Verified ${formatBoardDate(entry.verifiedAt)}`
            : null,
    ].filter(Boolean);

    return (
        <div
            className={
                href ? styles.entry : `${styles.entry} ${styles.entryStatic}`
            }
        >
            <span>
                {href ? (
                    <Link href={href} className={styles.entryCategory}>
                        {entry.category}
                    </Link>
                ) : (
                    <span className={styles.entryCategory}>
                        {entry.category}
                    </span>
                )}
                {entry.subcategoryKey ? (
                    <span className={styles.entryVars}>
                        {' '}
                        {formatSubcategoryKey(entry.subcategoryKey)}
                    </span>
                ) : null}
            </span>
            <span className={styles.entryTime}>
                {formatEntryTime(entry)}{' '}
                <span className={styles.entryVars}>{timingLabel(entry)}</span>
            </span>
            <span className={styles.entryRank}>
                {entry.rank !== null ? `#${entry.rank}` : '—'}
                {entry.countryRank !== null && country ? (
                    <span className={styles.entryCountry}>
                        {' '}
                        · #{entry.countryRank} {country.toUpperCase()}
                    </span>
                ) : null}
            </span>
            <span className={styles.entryDate}>
                {entry.runDate ? formatBoardDate(entry.runDate) : '—'}
            </span>
            <span className={styles.entryDetails}>{details.join(' · ')}</span>
            <span className={styles.entryBadges}>
                <VerificationBadge status={entry.status} />
                {entry.vodUrl ? (
                    <a
                        href={entry.vodUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Video"
                    >
                        <PlayBtn size={14} />
                    </a>
                ) : null}
                {entry.splitsHref ? (
                    <Link href={entry.splitsHref} title="Splits">
                        splits
                    </Link>
                ) : null}
            </span>
        </div>
    );
}
