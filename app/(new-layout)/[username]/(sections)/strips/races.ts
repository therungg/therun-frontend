import { formatCount } from '../format';
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
