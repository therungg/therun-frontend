import { PlayBtn } from 'react-bootstrap-icons';
import { VerificationBadge } from '~app/(new-layout)/games-v2/[game]/run-view/run-badges';
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
import { PbSparkline } from './pb-sparkline';

const MEDALS: Record<number, string> = { 1: 'gold', 2: 'silver', 3: 'bronze' };

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
    // Not deployed everywhere yet — read defensively.
    const attempts = entry.attempts ?? null;
    const pbHistory = entry.pbHistory ?? [];
    const vars = entrySubcategoryLabel(entry);
    const timing = timingLabel(entry);
    const provenance = provenanceLabel(entry.provenance);
    const facts = [
        entry.platform,
        entry.emulator ? 'Emulator' : null,
        entry.region,
    ].filter(Boolean);
    const medal = entry.rank !== null ? MEDALS[entry.rank] : undefined;

    return (
        <div className={styles.entry}>
            <span className={styles.entryRankCell}>
                <span
                    className={
                        entry.rank !== null
                            ? styles.entryRank
                            : `${styles.entryRank} ${styles.entryRankNone}`
                    }
                    data-medal={medal}
                >
                    {entry.rank !== null ? `#${entry.rank}` : '—'}
                </span>
                {entry.countryRank !== null && country ? (
                    <span className={styles.entryCountry}>
                        #{entry.countryRank} {country.toUpperCase()}
                    </span>
                ) : null}
            </span>
            <span className={styles.entryName}>
                {href ? (
                    <Link href={href} className={styles.entryCategory}>
                        {entry.category}
                    </Link>
                ) : (
                    <span className={styles.entryCategory}>
                        {entry.category}
                    </span>
                )}
                {vars ? (
                    <span className={styles.entryVars}> {vars}</span>
                ) : null}
            </span>
            <span className={styles.entryMeta}>
                <span className={styles.entryTime}>
                    {formatEntryTime(entry)}
                    {timing ? (
                        <span className={styles.entryTiming}>{timing}</span>
                    ) : null}
                    <PbSparkline history={pbHistory} />
                </span>
                <span className={styles.entryDate}>
                    {entry.runDate ? formatProfileDate(entry.runDate) : '—'}
                </span>
                <span className={styles.entryDetails}>
                    {facts.map((f) => `${f} · `).join('')}
                    {entry.splitsHref ? (
                        <Link href={entry.splitsHref}>{provenance}</Link>
                    ) : (
                        provenance
                    )}
                    {attempts !== null && attempts > 0
                        ? ` · ${attempts.toLocaleString('en-US')} ${attempts === 1 ? 'attempt' : 'attempts'}`
                        : null}
                </span>
                <span className={styles.entryBadges}>
                    <span
                        title={
                            entry.verifiedAt
                                ? `Verified ${formatProfileDate(entry.verifiedAt)}`
                                : undefined
                        }
                    >
                        <VerificationBadge status={entry.status} />
                    </span>
                    {entry.vodUrl ? (
                        <a
                            href={entry.vodUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Video"
                            className={styles.entryVod}
                        >
                            <PlayBtn size={14} />
                        </a>
                    ) : null}
                </span>
            </span>
        </div>
    );
}
