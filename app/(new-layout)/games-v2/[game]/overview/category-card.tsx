import type { CSSProperties } from 'react';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { buildBoardHref, buildSubmitHref } from '~src/lib/board-url';
import { formatRunDate } from '~src/lib/format-run-date';
import { formatCount } from '~src/utils/format-stats';
import { CountryFlag } from '../leaderboard/country-flag';
import { relativeDate } from '../leaderboard/relative-date';
import { RunnerAvatar } from '../leaderboard/runner-avatar';
import { splitCardEntries } from './card-entries';
import { CategoryEmblem } from './category-emblem';
import type { OverviewCardData } from './data';
import styles from './overview.module.scss';

// Local, server-safe record formatter (datetime.tsx's getFormattedString is
// a 'use client' export — calling it from this server component throws).
// Unlike it, the leading unit is never zero-padded: sub-hour records used to
// render "06:56.070" next to "46:11.185"; a record reads "6:56.070", with
// interior components still padded.
function formatRecord(duration: number | string, withMillis: boolean): string {
    const ms = Math.abs(Math.round(Number(duration)));
    if (!Number.isFinite(ms)) return '-';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    let out =
        hours > 0
            ? `${hours}:${pad(minutes)}:${pad(seconds)}`
            : `${minutes}:${pad(seconds)}`;
    if (withMillis) out += `.${String(ms % 1000).padStart(3, '0')}`;
    return out;
}

interface Props {
    gameSlug: string;
    card: OverviewCardData;
    /** Grid position — drives the entrance stagger without a CSS nth-child ceiling. */
    index: number;
    /**
     * The wall's focal card — the first card of the first visible section
     * (the moderator's #1 by sort order). Spans the full grid width with a
     * larger numeral and the podium as a right-hand rail.
     */
    marquee?: boolean;
}

// Ranks 2 and 3 carry the board's rank-accent signature (silver/bronze);
// rank 1's gold lives on the record numeral itself, not a numeral gutter.
const PODIUM_RANK_CLASS: Record<number, string> = {
    2: styles.rankSilver,
    3: styles.rankBronze,
};

export function CategoryCard({ gameSlug, card, index, marquee }: Props) {
    const { category, entries } = card;
    const { wr, podium } = splitCardEntries(entries);
    const boardHref = buildBoardHref(gameSlug, {
        categorySlug: category.name,
    });
    const verified = wr?.verificationStatus === 'verified';
    const plaqueClass = [
        styles.plaque,
        verified ? styles.plaqueGold : '',
        marquee ? styles.plaqueMarquee : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <article
            className={plaqueClass}
            style={{ '--i': index } as CSSProperties}
        >
            <div className={styles.plaqueBody}>
                <div className={styles.plaqueLabel}>
                    <div className={styles.plaqueHead}>
                        <CategoryEmblem imageUrl={category.imageUrl} />
                        <h3 className={styles.plaqueTitle}>
                            <Link href={boardHref} className="stretched-link">
                                {category.display}
                            </Link>
                        </h3>
                    </div>
                    {/* Full plate width, not tucked beside the emblem — the
                        spec line needs the run to stay on one line. */}
                    <span className={styles.plaqueStats}>
                        {formatCount(category.uniqueRunners ?? 0)} runners ·{' '}
                        {formatCount(category.totalAttemptCount ?? 0)} attempts
                    </span>
                </div>
                {wr ? (
                    <div className={styles.record}>
                        <span
                            className={
                                verified
                                    ? styles.recordTimeGold
                                    : styles.recordTime
                            }
                        >
                            {formatRecord(
                                wr.time as number,
                                category.showMilliseconds ?? true,
                            )}
                        </span>
                        <span className={styles.recordHolder}>
                            <RunnerAvatar
                                name={wr.runnerName}
                                picture={wr.picture}
                                size="sm"
                            />
                            <span className={styles.recordHolderName}>
                                <UserLink username={wr.runnerName} />
                            </span>
                            <CountryFlag country={wr.country} />
                            {wr.runDate && (
                                <span
                                    className={styles.recordWhen}
                                    title={formatRunDate(wr.runDate)}
                                >
                                    {relativeDate(wr.runDate)}
                                </span>
                            )}
                        </span>
                    </div>
                ) : (
                    // Same anatomy as a held record — an em dash where the
                    // numeral goes — so an empty slot keeps the wall's rhythm
                    // instead of collapsing into a paragraph.
                    <div className={styles.record}>
                        <span className={styles.recordTimeEmpty}>—</span>
                        <span className={styles.plaqueEmpty}>
                            No runs yet ·{' '}
                            <Link
                                href={buildSubmitHref(gameSlug, {
                                    categorySlug: category.name,
                                })}
                                className={styles.plaqueEmptyLink}
                            >
                                set the first record
                            </Link>
                        </span>
                    </div>
                )}
            </div>
            {podium.length > 0 && (
                <div className={styles.podium}>
                    {podium.map((p) => (
                        <div
                            key={`${p.rank}-${p.runnerName}`}
                            className={styles.podiumRow}
                        >
                            <span
                                className={`${styles.podiumRank} ${
                                    PODIUM_RANK_CLASS[p.rank] ?? ''
                                }`}
                            >
                                {p.rank}
                            </span>
                            <span className={styles.podiumAvatar}>
                                <RunnerAvatar
                                    name={p.runnerName}
                                    picture={p.picture}
                                    size="xs"
                                />
                            </span>
                            <span className={styles.podiumName}>
                                <UserLink username={p.runnerName} />
                            </span>
                            <span className={styles.podiumTime}>
                                {formatRecord(p.time as number, false)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </article>
    );
}
