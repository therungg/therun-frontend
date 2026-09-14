'use client';

import Link from '~src/components/link';
import { safeEncodeURI } from '~src/utils/uri';
import type { LeaderboardsProfileStanding } from '../../../../types/leaderboards-profile.types';
import { plural } from './format';
import styles from './leaderboards-profile.module.scss';
import { useShowcaseOptional } from './showcase-provider';

const n = (v: number) => v.toLocaleString('en-US');

/** The header's three headline numbers: boards, first places, best. */
export function HeroStats({
    standing,
    games,
}: {
    standing: LeaderboardsProfileStanding;
    games: number;
}) {
    if (useShowcaseOptional()?.editing) return null;
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
            {games > 1 ? (
                <span className={styles.heroStat}>
                    <b>{n(games)}</b>
                    games
                </span>
            ) : null}
            {standing.best ? (
                <span className={styles.heroStat}>
                    <b>#{n(standing.best.rank)}</b>
                    <Link href={`/games/${safeEncodeURI(standing.best.game)}`}>
                        {standing.best.game} · {standing.best.category}
                    </Link>
                </span>
            ) : null}
        </div>
    );
}
