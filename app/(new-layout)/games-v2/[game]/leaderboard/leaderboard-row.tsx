import { CheckCircleFill, PlayBtn } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import styles from './leaderboard.module.scss';
import { RowActionsMenu } from './row-actions-menu';

interface Props {
    entry: LeaderboardEntry;
    isCurrentUser: boolean;
    canManage: boolean;
    gameSlug: string;
    hideRealTime: boolean;
    hideGameTime: boolean;
    sessionUsername: string | null;
}

export function LeaderboardRow({
    entry,
    isCurrentUser,
    canManage,
    gameSlug,
    hideRealTime,
    hideGameTime,
    sessionUsername,
}: Props) {
    const showManageButton = canManage && entry.runId != null && !entry.isGuest;
    const detailHref =
        entry.source === 'manual' && entry.manualTimeId != null
            ? `/games-v2/${gameSlug}/manual/${entry.manualTimeId}`
            : entry.runId != null
              ? `/games-v2/${gameSlug}/run/${entry.runId}`
              : null;

    return (
        <tr className={isCurrentUser ? styles.youRow : undefined}>
            <td
                className={`${styles.rank} ${entry.rank === 1 ? styles.rank1 : entry.rank === 2 ? styles.rank2 : entry.rank === 3 ? styles.rank3 : ''}`}
            >
                {entry.rank}
            </td>
            <td className={styles.runner}>
                <UserLink username={entry.runnerName} url={undefined} />
            </td>
            {!hideRealTime && (
                <td className={styles.time}>
                    {entry.realTime != null ? (
                        detailHref ? (
                            <Link href={detailHref}>
                                <DurationToFormatted
                                    duration={entry.realTime}
                                />
                            </Link>
                        ) : (
                            <DurationToFormatted duration={entry.realTime} />
                        )
                    ) : (
                        '—'
                    )}
                </td>
            )}
            {!hideGameTime && (
                <td className={styles.time}>
                    {entry.gameTime != null ? (
                        detailHref ? (
                            <Link href={detailHref}>
                                <DurationToFormatted
                                    duration={entry.gameTime}
                                />
                            </Link>
                        ) : (
                            <DurationToFormatted duration={entry.gameTime} />
                        )
                    ) : (
                        '—'
                    )}
                </td>
            )}
            <td className={styles.meta}>
                {entry.runDate
                    ? new Date(entry.runDate).toLocaleDateString()
                    : ''}
            </td>
            <td>
                {entry.vodUrl ? (
                    <a
                        href={entry.vodUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.iconLink}
                        aria-label="Watch VOD"
                        title="Watch VOD"
                    >
                        <PlayBtn size={16} />
                    </a>
                ) : null}
            </td>
            <td>
                {entry.source === 'manual' ? (
                    <span
                        className={styles.setPill}
                        title="A moderator-set leaderboard time"
                    >
                        set time
                    </span>
                ) : entry.verificationStatus === 'verified' ? (
                    <CheckCircleFill
                        size={13}
                        className={styles.verified}
                        aria-label="Verified"
                    />
                ) : null}
            </td>
            <td className="text-end">
                <div className="d-flex gap-1 justify-content-end">
                    <RowActionsMenu
                        entry={entry}
                        sessionUsername={sessionUsername}
                        canManage={canManage}
                        gameSlug={gameSlug}
                    />
                    {showManageButton && (
                        <Link
                            href={`/games-v2/${gameSlug}/manage/run/${entry.runId}`}
                            className="btn btn-sm btn-outline-secondary"
                        >
                            Manage
                        </Link>
                    )}
                </div>
            </td>
        </tr>
    );
}
