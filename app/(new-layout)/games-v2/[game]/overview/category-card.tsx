import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import { buildBoardHref, buildSubmitHref } from '~src/lib/board-url';
import { formatRunDate } from '~src/lib/format-run-date';
import { CountryFlag } from '../leaderboard/country-flag';
import { relativeDate } from '../leaderboard/relative-date';
import type { OverviewCardData } from './data';
import styles from './overview.module.scss';

interface Props {
    gameSlug: string;
    card: OverviewCardData;
}

export function CategoryCard({ gameSlug, card }: Props) {
    const { category, wrEntry } = card;
    const boardHref = buildBoardHref(gameSlug, {
        categorySlug: category.name,
    });
    const verified = wrEntry?.verificationStatus === 'verified';

    return (
        <article className={styles.card}>
            <div className={styles.cardHead}>
                <h3 className={styles.cardTitle}>
                    <Link href={boardHref} className="stretched-link">
                        {category.display}
                    </Link>
                </h3>
                <span className={styles.cardStats}>
                    {(category.uniqueRunners ?? 0).toLocaleString()} runners ·{' '}
                    {(category.totalAttemptCount ?? 0).toLocaleString()}{' '}
                    attempts
                </span>
            </div>
            {wrEntry ? (
                <div className={styles.cardWr}>
                    <span className={styles.cardEyebrow}>
                        {verified ? 'World record' : 'Fastest time'}
                    </span>
                    <span className={styles.cardTime}>
                        <DurationToFormatted
                            duration={wrEntry.time as number}
                            withMillis={category.showMilliseconds ?? true}
                        />
                    </span>
                    <span className={styles.cardHolder}>
                        <UserLink username={wrEntry.runnerName} />{' '}
                        <CountryFlag country={wrEntry.country} />
                        {wrEntry.runDate && (
                            <span
                                className={styles.cardWhen}
                                title={formatRunDate(wrEntry.runDate)}
                            >
                                {' '}
                                · {relativeDate(wrEntry.runDate)}
                            </span>
                        )}
                    </span>
                </div>
            ) : (
                <div className={styles.cardEmpty}>
                    No runs yet —{' '}
                    <Link
                        href={buildSubmitHref(gameSlug, {
                            categorySlug: category.name,
                        })}
                        className={styles.cardEmptyLink}
                    >
                        set the first record
                    </Link>
                </div>
            )}
        </article>
    );
}
