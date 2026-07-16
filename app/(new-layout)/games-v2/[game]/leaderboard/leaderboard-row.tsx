'use client';

import { useRouter } from 'next/navigation';
import { PlayBtn } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import styles from './leaderboard.module.scss';
import { relativeDate } from './relative-date';
import { RowActionsMenu } from './row-actions-menu';
import { RunnerAvatar } from './runner-avatar';

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
    const router = useRouter();
    const showManageButton = canManage && entry.runId != null && !entry.isGuest;
    const detailHref =
        entry.source === 'manual' && entry.manualTimeId != null
            ? `/games-v2/${gameSlug}/manual/${entry.manualTimeId}`
            : entry.runId != null
              ? `/games-v2/${gameSlug}/run/${entry.runId}`
              : null;

    const podiumClass =
        entry.rank === 1
            ? styles.rank1Row
            : entry.rank === 2
              ? styles.rank2Row
              : entry.rank === 3
                ? styles.rank3Row
                : '';
    const rankClass =
        entry.rank === 1
            ? styles.rank1
            : entry.rank === 2
              ? styles.rank2
              : entry.rank === 3
                ? styles.rank3
                : '';

    // The whole row opens the run detail; real links/buttons inside
    // keep working (we ignore clicks that land on them).
    const onRowClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
        if (!detailHref) return;
        const target = e.target as HTMLElement;
        if (target.closest('a, button, input, [role="menu"], [role="dialog"]'))
            return;
        router.push(detailHref);
    };

    const time = (value: number | null) => (
        <td className={styles.time}>
            {value != null ? (
                detailHref ? (
                    <Link href={detailHref}>
                        <DurationToFormatted duration={value} />
                    </Link>
                ) : (
                    <DurationToFormatted duration={value} />
                )
            ) : (
                '—'
            )}
        </td>
    );

    return (
        <tr
            className={`${podiumClass} ${isCurrentUser ? styles.youRow : ''} ${detailHref ? styles.rowLink : ''}`}
            onClick={onRowClick}
        >
            <td className={`${styles.rank} ${rankClass}`}>{entry.rank}</td>
            <td className={styles.runner}>
                <span className={styles.runnerCell}>
                    <RunnerAvatar
                        name={entry.runnerName}
                        size={entry.rank <= 3 ? 'md' : 'sm'}
                    />
                    <UserLink username={entry.runnerName} url={undefined} />
                </span>
            </td>
            {!hideRealTime && time(entry.realTime)}
            {!hideGameTime && time(entry.gameTime)}
            <td
                className={`${styles.meta} ${styles.when}`}
                title={
                    entry.runDate
                        ? new Date(entry.runDate).toLocaleDateString()
                        : undefined
                }
            >
                {entry.runDate ? relativeDate(entry.runDate) : ''}
            </td>
            <td className={styles.trailing}>
                {entry.source === 'manual' && (
                    <span
                        className={styles.setPill}
                        title="A moderator-set leaderboard time"
                    >
                        set time
                    </span>
                )}
                {entry.source !== 'manual' &&
                    entry.verificationStatus === 'pending' && (
                        <span className={styles.setPill}>pending</span>
                    )}
                {entry.vodUrl && (
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
                )}
                <span className={styles.reveal}>
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
                </span>
            </td>
        </tr>
    );
}
