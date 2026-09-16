import type { UserStats } from '~app/(new-layout)/races/races.types';
import { formatCount } from '../format';
import { medalOf, ordinal } from '../ranks';
import type { StripLead } from '../stat-strip';
import type { StripCatalog } from './resolve';

export interface RacesStripData {
    totalRaces: number;
    totalFinishedRaces: number;
    totalRaceTime: number | null;
}

/** Race time the way the races pages show it: "120 hours", "20h 37m", "4:21:33", "12:05". */
function formatRaceTime(ms: number): string {
    const hours = Math.floor(ms / 3_600_000);
    const minutes = String(Math.floor((ms / 60_000) % 60)).padStart(2, '0');
    const seconds = String(Math.floor((ms / 1000) % 60)).padStart(2, '0');
    if (hours >= 100) return `${hours} hours`;
    if (hours >= 10) return `${hours}h ${minutes}m`;
    return hours > 0
        ? `${hours}:${minutes}:${seconds}`
        : `${minutes}:${seconds}`;
}

export const racesStrip: StripCatalog<RacesStripData> = {
    tab: 'races',
    tiles: [
        {
            id: 'races',
            name: 'Races',
            build: (d) =>
                d.totalRaces > 0
                    ? {
                          value: formatCount(d.totalRaces),
                          label: d.totalRaces === 1 ? 'race' : 'races',
                      }
                    : null,
        },
        {
            id: 'finishRate',
            name: 'Finish rate',
            build: (d) =>
                d.totalRaces > 0
                    ? {
                          value: `${Math.round((d.totalFinishedRaces / d.totalRaces) * 100)}%`,
                          label: `finished (${formatCount(d.totalFinishedRaces)})`,
                      }
                    : null,
        },
        {
            id: 'raceTime',
            name: 'Time spent racing',
            build: (d) => ({
                value: d.totalRaceTime ? formatRaceTime(d.totalRaceTime) : '—',
                label: 'spent racing',
            }),
        },
    ],
    defaults: () => ['races', 'finishRate', 'raceTime'],
};

/** The strip's numbers, from the runner's race stats. */
export function racesStripData(stats: UserStats): RacesStripData {
    return {
        totalRaces: stats.totalRaces,
        totalFinishedRaces: stats.totalFinishedRaces,
        totalRaceTime: stats.totalRaceTime ?? null,
    };
}

/** "Game#Category" race stat keys split apart. */
export const raceStatName = (s: UserStats) => {
    const [game, category] = s.displayValue.split('#');
    return { game, category: category ?? '' };
};

/** The runner's best rating across categories; null when they have none. */
export function racesLead(categoryStats: UserStats[]): StripLead | null {
    const best = categoryStats.reduce<UserStats | null>(
        (top, s) =>
            s.rankings[0]?.score &&
            (!top || s.rankings[0].score > top.rankings[0].score)
                ? s
                : top,
        null,
    );
    if (!best) return null;
    const { game, category } = raceStatName(best);
    return {
        value: formatCount(best.rankings[0].score),
        label: `Best rating · ${ordinal(best.rankings[0].rank + 1)} on the ladder`,
        what: `${game} · ${category}`,
        medal: medalOf(best.rankings[0].rank + 1),
        href: `/races/stats/${encodeURI(game)}/${encodeURI(category)}`,
    };
}
