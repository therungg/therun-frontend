import type { LeaderboardsProfile } from '../../../../../types/leaderboards-profile.types';
import { plural } from '../../../leaderboards/[name]/format';
import type { StripCatalog } from './resolve';

const count = (n: number) => n.toLocaleString('en-US');

/** The share of a board a rank beats, as "Top 3%"; small boards say nothing. */
export function bestShare(profile: LeaderboardsProfile) {
    let best: { pct: number; game: string } | null = null;
    for (const game of profile.games) {
        for (const e of game.entries) {
            if (e.rank === null || !e.totalRunners || e.totalRunners < 20)
                continue;
            const pct = Math.max(1, Math.ceil((e.rank / e.totalRunners) * 100));
            if (!best || pct < best.pct) best = { pct, game: game.game };
        }
    }
    return best && best.pct <= 25 ? best : null;
}

export const leaderboardsStrip: StripCatalog<LeaderboardsProfile> = {
    tab: 'leaderboards',
    tiles: [
        {
            id: 'firstPlaces',
            name: 'First places',
            build: ({ standing: s }) =>
                s.first > 0
                    ? {
                          value: count(s.first),
                          label: plural(s.first, 'first place', 'first places'),
                          medal: 'gold',
                      }
                    : null,
        },
        {
            id: 'podiums',
            name: 'Podiums',
            build: ({ standing: s }) =>
                s.podiums > 0
                    ? {
                          value: count(s.podiums),
                          label: plural(s.podiums, 'podium', 'podiums'),
                          medal: 'silver',
                      }
                    : null,
        },
        {
            id: 'topTen',
            name: 'Top 10',
            build: ({ standing: s }) =>
                s.topTen > 0
                    ? { value: count(s.topTen), label: 'in the top 10' }
                    : null,
        },
        {
            id: 'topShare',
            name: 'Best top %',
            build: (p) => {
                const share = bestShare(p);
                return share
                    ? { value: `Top ${share.pct}%`, label: share.game }
                    : null;
            },
        },
        {
            id: 'boards',
            name: 'Boards',
            pairedWith: 'games',
            build: (p, shown) => {
                const boards = p.standing.boards;
                if (boards === 0) return null;
                const games = p.games.length;
                const label = plural(boards, 'board', 'boards');
                return {
                    value: count(boards),
                    label: shown.has('games')
                        ? label
                        : `${label} across ${count(games)} ${plural(games, 'game', 'games')}`,
                };
            },
        },
        {
            id: 'games',
            name: 'Games',
            build: (p) =>
                p.games.length > 0
                    ? {
                          value: count(p.games.length),
                          label: plural(p.games.length, 'game', 'games'),
                      }
                    : null,
        },
    ],
    // Only the counts that say something: no podiums tile equal to first places.
    defaults: (p) => {
        const s = p.standing;
        const ids: string[] = [];
        if (s.first > 0) ids.push('firstPlaces');
        if (s.podiums > s.first) ids.push('podiums');
        if (s.topTen > s.podiums) ids.push('topTen');
        if (s.first === 0 && bestShare(p)) ids.push('topShare');
        ids.push('boards');
        return ids;
    },
};
