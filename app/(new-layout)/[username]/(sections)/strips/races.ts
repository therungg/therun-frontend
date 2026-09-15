import { formatCount, formatDuration } from '../format';
import type { StripCatalog } from './resolve';

export interface RacesStripData {
    totalRaces: number;
    totalFinishedRaces: number;
    totalRaceTime: number | null;
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
            build: (d) =>
                d.totalRaceTime
                    ? {
                          value: formatDuration(d.totalRaceTime),
                          label: 'spent racing',
                      }
                    : null,
        },
    ],
    defaults: () => ['races', 'finishRate', 'raceTime'],
};
