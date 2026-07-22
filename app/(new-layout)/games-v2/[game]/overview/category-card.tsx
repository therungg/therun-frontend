import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import { buildBoardHref, buildSubmitHref } from '~src/lib/board-url';
import { formatRunDate } from '~src/lib/format-run-date';
import { CountryFlag } from '../leaderboard/country-flag';
import { relativeDate } from '../leaderboard/relative-date';
import { RunnerAvatar } from '../leaderboard/runner-avatar';
import { splitCardEntries } from './card-entries';
import type { OverviewCardData } from './data';
import styles from './overview.module.scss';

interface Props {
    gameSlug: string;
    card: OverviewCardData;
}

export function CategoryCard({ gameSlug, card }: Props) {
    const { category, entries } = card;
    const { wr, podium } = splitCardEntries(entries);
    const boardHref = buildBoardHref(gameSlug, {
        categorySlug: category.name,
    });
    const verified = wr?.verificationStatus === 'verified';

    return (
        <article className={styles.plaque}>
            <div className={styles.plaqueHead}>
                {category.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={category.imageUrl}
                        alt=""
                        aria-hidden
                        width={36}
                        height={36}
                        className={styles.emblem}
                        loading="lazy"
                    />
                ) : (
                    <span aria-hidden className={styles.emblemFallback}>
                        {category.display.slice(0, 1)}
                    </span>
                )}
                <div className={styles.plaqueTitleBlock}>
                    <h3 className={styles.plaqueTitle}>
                        <Link href={boardHref} className="stretched-link">
                            {category.display}
                        </Link>
                    </h3>
                    <span className={styles.plaqueStats}>
                        {(category.uniqueRunners ?? 0).toLocaleString()} runners
                        · {(category.totalAttemptCount ?? 0).toLocaleString()}{' '}
                        attempts
                    </span>
                </div>
                {wr && (
                    <span
                        className={
                            verified ? styles.eyebrowGold : styles.eyebrowDim
                        }
                    >
                        {verified ? '◆ WR' : 'Fastest'}
                    </span>
                )}
            </div>
            {wr ? (
                <>
                    <div className={styles.recordRow}>
                        <span
                            className={
                                verified
                                    ? styles.avatarRingGold
                                    : styles.avatarRing
                            }
                        >
                            <RunnerAvatar
                                name={wr.runnerName}
                                picture={wr.picture}
                                size="md"
                            />
                        </span>
                        <div className={styles.recordText}>
                            <span
                                className={
                                    verified
                                        ? styles.recordTimeGold
                                        : styles.recordTime
                                }
                            >
                                <DurationToFormatted
                                    duration={wr.time as number}
                                    withMillis={
                                        category.showMilliseconds ?? true
                                    }
                                />
                            </span>
                            <span className={styles.recordHolder}>
                                <UserLink username={wr.runnerName} />{' '}
                                <CountryFlag country={wr.country} />
                                {wr.runDate && (
                                    <span
                                        className={styles.recordWhen}
                                        title={formatRunDate(wr.runDate)}
                                    >
                                        {' '}
                                        · {relativeDate(wr.runDate)}
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>
                    {podium.length > 0 && (
                        <div className={styles.podium}>
                            {podium.map((p) => (
                                <span
                                    key={p.rank}
                                    className={styles.podiumSpot}
                                >
                                    <span className={styles.podiumRank}>
                                        {p.rank}
                                    </span>{' '}
                                    <UserLink username={p.runnerName} />{' '}
                                    <span className={styles.podiumTime}>
                                        <DurationToFormatted
                                            duration={p.time as number}
                                            withMillis={false}
                                        />
                                    </span>
                                </span>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <div className={styles.plaqueEmpty}>
                    No runs yet —{' '}
                    <Link
                        href={buildSubmitHref(gameSlug, {
                            categorySlug: category.name,
                        })}
                        className={styles.plaqueEmptyLink}
                    >
                        set the first record
                    </Link>
                </div>
            )}
        </article>
    );
}
