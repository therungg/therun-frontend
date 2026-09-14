import { safeEncodeURI } from '~src/utils/uri';
import type { LeaderboardsProfile } from '../../../../../types/leaderboards-profile.types';
import { plural } from '../../../leaderboards/[name]/format';
import { StatStrip } from '../stat-strip';

const MEDALS: Record<number, string> = { 1: 'gold', 2: 'silver', 3: 'bronze' };

const count = (n: number) => n.toLocaleString('en-US');

/** The share of a board a rank beats, as "Top 3%"; small boards say nothing. */
function bestShare(profile: LeaderboardsProfile) {
    let best: { pct: number; game: string; category: string } | null = null;
    for (const game of profile.games) {
        for (const e of game.entries) {
            if (e.rank === null || !e.totalRunners || e.totalRunners < 20) {
                continue;
            }
            const pct = Math.max(1, Math.ceil((e.rank / e.totalRunners) * 100));
            if (!best || pct < best.pct) {
                best = { pct, game: game.game, category: e.category };
            }
        }
    }
    return best && best.pct <= 25 ? best : null;
}

/**
 * The runner's standing at a glance. The lead is their best result; the rest
 * are only the counts that say something (no "0 podiums").
 */
export function StandingStrip({ profile }: { profile: LeaderboardsProfile }) {
    const { standing } = profile;
    const best = standing.best;
    const share = bestShare(profile);
    const games = profile.games.length;

    const tiles: { value: string; label: string; medal?: string }[] = [];
    if (standing.first > 0) {
        tiles.push({
            value: count(standing.first),
            label: plural(standing.first, 'first place', 'first places'),
            medal: 'gold',
        });
    }
    if (standing.podiums > standing.first) {
        tiles.push({
            value: count(standing.podiums),
            label: plural(standing.podiums, 'podium', 'podiums'),
            medal: 'silver',
        });
    }
    if (standing.topTen > standing.podiums) {
        tiles.push({ value: count(standing.topTen), label: 'in the top 10' });
    }
    if (share && standing.first === 0) {
        tiles.push({ value: `Top ${share.pct}%`, label: share.game });
    }
    tiles.push({
        value: count(standing.boards),
        label: `${plural(standing.boards, 'board', 'boards')} across ${count(games)} ${plural(games, 'game', 'games')}`,
    });

    return (
        <StatStrip
            label="Standing"
            lead={
                best
                    ? {
                          value: `#${best.rank}`,
                          label: 'Best result',
                          what: `${best.game} · ${best.category}`,
                          href: `/games/${safeEncodeURI(best.game)}`,
                          medal: MEDALS[best.rank],
                      }
                    : null
            }
            tiles={tiles}
        />
    );
}
