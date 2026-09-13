import type { LeaderboardsProfileStanding } from '../../../../types/leaderboards-profile.types';
import { GameLink } from './board-link';
import styles from './leaderboards-profile.module.scss';

const n = (v: number) => v.toLocaleString('en-US');

export const plural = (count: number, one: string, many: string) =>
    count === 1 ? one : many;

/** The header's three headline numbers: boards, first places, best. */
export function HeroStats({
    standing,
}: {
    standing: LeaderboardsProfileStanding;
}) {
    return (
        <div className={styles.hero}>
            <span className={styles.heroStat}>
                <b>{n(standing.boards)}</b>
                {plural(standing.boards, 'board', 'boards')}
            </span>
            <span className={styles.heroStat}>
                <b>{n(standing.first)}</b>
                {plural(standing.first, 'first place', 'first places')}
            </span>
            {standing.best ? (
                <span className={styles.heroStat}>
                    <b>#{n(standing.best.rank)}</b>
                    <GameLink
                        gameSlug={standing.best.gameSlug}
                        game={standing.best.game}
                    >
                        {standing.best.game} · {standing.best.category}
                    </GameLink>
                </span>
            ) : null}
        </div>
    );
}
