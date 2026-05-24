import Link from 'next/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
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

    return (
        <tr className={isCurrentUser ? 'table-active' : undefined}>
            <td>{entry.rank}</td>
            <td>
                <UserLink username={entry.runnerName} url={undefined} />
            </td>
            {!hideRealTime && (
                <td>
                    {entry.realTime != null ? (
                        <DurationToFormatted duration={entry.realTime} />
                    ) : (
                        '—'
                    )}
                </td>
            )}
            {!hideGameTime && (
                <td>
                    {entry.gameTime != null ? (
                        <DurationToFormatted duration={entry.gameTime} />
                    ) : (
                        '—'
                    )}
                </td>
            )}
            <td>
                {entry.runDate
                    ? new Date(entry.runDate).toLocaleDateString()
                    : ''}
            </td>
            <td>
                {entry.vodUrl ? (
                    <a href={entry.vodUrl} target="_blank" rel="noreferrer">
                        VOD
                    </a>
                ) : null}
            </td>
            <td>
                {entry.source === 'manual' ? (
                    <span
                        className="badge text-bg-info"
                        title="A moderator-set leaderboard time"
                    >
                        set time
                    </span>
                ) : entry.verificationStatus === 'verified' ? (
                    '✓'
                ) : (
                    ''
                )}
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
