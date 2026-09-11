import Link from '~src/components/link';
import type { LeaderboardsProfileStanding } from '../../../../types/leaderboards-profile.types';
import styles from './leaderboards-profile.module.scss';

const n = (v: number) => v.toLocaleString('en-US');

export function StandingRow({
    standing,
}: {
    standing: LeaderboardsProfileStanding;
}) {
    return (
        <div className={styles.standing}>
            <span>
                <b>{n(standing.boards)}</b>
                boards
            </span>
            <span>
                <b>{n(standing.first)}</b>
                first places
            </span>
            <span>
                <b>{n(standing.podiums)}</b>
                podiums
            </span>
            <span>
                <b>{n(standing.topTen)}</b>
                top 10
            </span>
            {standing.best ? (
                <span>
                    <b>#{standing.best.rank}</b>
                    <Link
                        href={`/games-v2/${encodeURIComponent(standing.best.gameSlug)}`}
                    >
                        {standing.best.game} · {standing.best.category}
                    </Link>
                </span>
            ) : null}
            <span>
                <b>{n(standing.verified)}</b>
                verified
            </span>
            {standing.pending > 0 ? (
                <span>
                    <b>{n(standing.pending)}</b>
                    pending
                </span>
            ) : null}
            {standing.races ? (
                <span>
                    <b>{n(standing.races.count)}</b>
                    races · {standing.races.finishPercentage}% finished
                </span>
            ) : null}
        </div>
    );
}
