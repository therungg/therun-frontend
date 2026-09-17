'use client';

import Link from '~src/components/link';
import type { LeaderboardsProfileStanding } from '../../../../types/leaderboards-profile.types';
import { gameRefOf, plural, profileBoardHref, profileGameHref } from './format';
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
    const showcase = useShowcaseOptional();
    if (showcase?.editing) return null;
    const boardsVisible = showcase?.boardsVisible ?? false;
    const best = standing.best;
    const bestHref = best
        ? (profileBoardHref(gameRefOf(best), best, boardsVisible) ??
          profileGameHref(best, boardsVisible))
        : null;
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
            {best && bestHref ? (
                <span className={styles.heroStat}>
                    <b>#{n(best.rank)}</b>
                    <Link href={bestHref}>
                        {best.game} · {best.category}
                    </Link>
                </span>
            ) : null}
        </div>
    );
}
