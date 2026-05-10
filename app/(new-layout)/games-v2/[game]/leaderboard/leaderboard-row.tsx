import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';

interface Props {
    rank: number;
    rtEntry?: LeaderboardEntry;
    gtEntry?: LeaderboardEntry;
    isCurrentUser: boolean;
    primaryTiming: 'rt' | 'gt';
}

export function LeaderboardRow({
    rank,
    rtEntry,
    gtEntry,
    isCurrentUser,
    primaryTiming,
}: Props) {
    const primary = primaryTiming === 'gt' ? gtEntry : rtEntry;
    if (!primary) return null;

    return (
        <tr className={isCurrentUser ? 'table-active' : undefined}>
            <td>{rank}</td>
            <td>
                <UserLink username={primary.runnerName} url={undefined} />
            </td>
            <td>
                {rtEntry?.time != null ? (
                    <DurationToFormatted duration={rtEntry.time} />
                ) : (
                    '—'
                )}
            </td>
            <td>
                {gtEntry?.time != null ? (
                    <DurationToFormatted duration={gtEntry.time} />
                ) : (
                    '—'
                )}
            </td>
            <td>
                {primary.runDate
                    ? new Date(primary.runDate).toLocaleDateString()
                    : ''}
            </td>
            <td>
                {primary.vodUrl ? (
                    <a href={primary.vodUrl} target="_blank" rel="noreferrer">
                        VOD
                    </a>
                ) : null}
            </td>
            <td>{primary.verificationStatus === 'verified' ? '✓' : ''}</td>
        </tr>
    );
}
