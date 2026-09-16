import { GameImage } from '~src/components/image/gameimage';
import Link from '~src/components/link';
import { safeEncodeURI } from '~src/utils/uri';
import type { TimerPb } from '../../../../../types/runner-profile.types';
import { formatProfileDate } from '../../../leaderboards/[name]/format';
import styles from '../../../leaderboards/[name]/leaderboards-profile.module.scss';
import { formatDuration } from '../../(sections)/format';
import { plural } from '../../(sections)/ranks';

/** A timer PB pin, laid out like a board pin so both sit in one grid. */
export function TimerPbCard({
    timer,
    username,
}: {
    timer: TimerPb;
    username: string;
}) {
    const igt = timer.hasGameTime && timer.gameTimePbMs !== null;
    const pb = igt ? timer.gameTimePbMs : timer.personalBestMs;
    return (
        <article className={styles.pin}>
            <div className={styles.pinBody}>
                <Link
                    href={`/games/${safeEncodeURI(timer.game)}`}
                    className={styles.pinArt}
                    tabIndex={-1}
                    aria-hidden
                >
                    <GameImage
                        src={timer.imageUrl ?? ''}
                        alt=""
                        quality="medium"
                        width={60}
                        height={80}
                    />
                </Link>
                <div className={styles.pinText}>
                    <span className={styles.pinRankLine}>
                        <span className={styles.pinRank}>PB</span>
                        <span className={styles.pinOf}>
                            {timer.attempts.toLocaleString('en-US')}{' '}
                            {plural(timer.attempts, 'attempt', 'attempts')}
                        </span>
                    </span>
                    <span className={styles.pinGame}>{timer.game}</span>
                    <Link
                        href={`/${safeEncodeURI(username)}/${safeEncodeURI(timer.game)}/${safeEncodeURI(timer.category)}`}
                        className={styles.pinTitle}
                    >
                        {timer.category}
                    </Link>
                </div>
            </div>
            <div className={styles.pinFoot}>
                <span className={styles.pinTime}>
                    {formatDuration(pb)}
                    {igt ? (
                        <span className={styles.entryTiming}>IGT</span>
                    ) : null}
                </span>
                {timer.personalBestAt ? (
                    <span className={styles.pinDate}>
                        {formatProfileDate(timer.personalBestAt)}
                    </span>
                ) : null}
            </div>
        </article>
    );
}
