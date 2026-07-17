'use client';

import { useRouter } from 'next/navigation';
import { PlayBtn } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import { CountryFlag } from './country-flag';
import styles from './leaderboard.module.scss';
import { relativeDate } from './relative-date';
import { RowActionsMenu } from './row-actions-menu';
import { RunnerAvatar } from './runner-avatar';
import {
    type TimingKey,
    timingColumnHidden,
    timingColumns,
} from './timing-columns';

// Find-me scrolls to and focuses this id. At most one row ever carries it
// (the current session user's own entry), so a fixed id is safe.
export const YOU_ROW_ID = 'leaderboard-you-row';

interface Props {
    entry: LeaderboardEntry;
    isCurrentUser: boolean;
    canManage: boolean;
    gameSlug: string;
    hideRealTime: boolean;
    hideGameTime: boolean;
    primaryTiming: TimingKey;
    sessionUsername: string | null;
}

export function LeaderboardRow({
    entry,
    isCurrentUser,
    canManage,
    gameSlug,
    hideRealTime,
    hideGameTime,
    primaryTiming,
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
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const target = e.target as HTMLElement;
        if (target.closest('a, button, input, [role="menu"], [role="dialog"]'))
            return;
        router.push(detailHref);
    };

    const time = (value: number | null, dimmed: boolean) => (
        <td className={dimmed ? styles.timeSecondary : styles.time}>
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

    // Same primary-first order as the header (leaderboard-table.tsx), so
    // cells always line up under the column that claims them.
    const { primary, secondary } = timingColumns(primaryTiming);
    const timingValue = (key: TimingKey) =>
        key === 'rt' ? entry.realTime : entry.gameTime;
    const timingHidden = (key: TimingKey) =>
        timingColumnHidden(key, { hideRealTime, hideGameTime });

    return (
        <tr
            id={isCurrentUser ? YOU_ROW_ID : undefined}
            // -1: focusable programmatically (Find me scrolls here and
            // focuses it) without joining the natural tab order.
            tabIndex={isCurrentUser ? -1 : undefined}
            className={`${podiumClass} ${isCurrentUser ? styles.youRow : ''} ${detailHref ? styles.rowLink : ''}`}
            onClick={onRowClick}
        >
            <td className={`${styles.rank} ${rankClass}`}>{entry.rank}</td>
            <td className={styles.runner}>
                <span className={styles.runnerCell}>
                    <RunnerAvatar
                        name={entry.runnerName}
                        picture={entry.picture}
                        size={entry.rank <= 3 ? 'md' : 'sm'}
                    />
                    <UserLink username={entry.runnerName} url={undefined} />
                    <CountryFlag country={entry.country} />
                </span>
            </td>
            {!timingHidden(primary.key) &&
                time(timingValue(primary.key), false)}
            {!timingHidden(secondary.key) &&
                time(timingValue(secondary.key), true)}
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
                        <span
                            className={styles.setPill}
                            title="Awaiting moderator verification"
                        >
                            pending
                        </span>
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
                            className={styles.manageLink}
                        >
                            Manage
                        </Link>
                    )}
                </span>
            </td>
        </tr>
    );
}
