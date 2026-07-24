import type { CSSProperties } from 'react';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import { buildBoardHref, buildSubmitHref } from '~src/lib/board-url';
import { formatRunDate } from '~src/lib/format-run-date';
import { CountryFlag } from '../leaderboard/country-flag';
import { relativeDate } from '../leaderboard/relative-date';
import { RunnerAvatar } from '../leaderboard/runner-avatar';
import { splitCardEntries } from './card-entries';
import { CategoryEmblem } from './category-emblem';
import type { OverviewCardData } from './data';
import styles from './overview.module.scss';

interface Props {
    gameSlug: string;
    card: OverviewCardData;
    /** Grid position — drives the entrance stagger without a CSS nth-child ceiling. */
    index: number;
}

// Ranks 2 and 3 carry the board's rank-accent signature (silver/bronze);
// rank 1's gold lives on the record numeral itself, not a numeral gutter.
const PODIUM_RANK_CLASS: Record<number, string> = {
    2: styles.rankSilver,
    3: styles.rankBronze,
};

export function CategoryCard({ gameSlug, card, index }: Props) {
    const { category, entries } = card;
    const { wr, podium } = splitCardEntries(entries);
    const boardHref = buildBoardHref(gameSlug, {
        categorySlug: category.name,
    });
    const verified = wr?.verificationStatus === 'verified';

    return (
        <article
            className={
                verified
                    ? `${styles.plaque} ${styles.plaqueGold}`
                    : styles.plaque
            }
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
                        {(category.uniqueRunners ?? 0).toLocaleString()} runners
                        · {(category.totalAttemptCount ?? 0).toLocaleString()}{' '}
                        attempts
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
                            <DurationToFormatted
                                duration={wr.time as number}
                                withMillis={category.showMilliseconds ?? true}
                            />
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
                                <DurationToFormatted
                                    duration={p.time as number}
                                    withMillis={false}
                                />
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </article>
    );
}
