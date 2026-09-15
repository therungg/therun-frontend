import { formatCount } from '../format';
import type { StripCatalog } from './resolve';

export interface ActivityStripData {
    hoursThisYear: number;
    attempts: number;
    activeDays: number;
    longestStreak: number;
}

export const activityStrip: StripCatalog<ActivityStripData> = {
    tab: 'activity',
    tiles: [
        {
            id: 'hoursThisYear',
            name: 'Hours this year',
            build: (d) =>
                d.hoursThisYear > 0
                    ? {
                          value: `${formatCount(d.hoursThisYear)} h`,
                          label: 'played this year',
                      }
                    : null,
        },
        {
            id: 'attempts12m',
            name: 'Attempts in 12 months',
            build: (d) =>
                d.attempts > 0
                    ? {
                          value: formatCount(d.attempts),
                          label: 'attempts in 12 months',
                      }
                    : null,
        },
        {
            id: 'activeDays',
            name: 'Active days',
            build: (d) =>
                d.activeDays > 0
                    ? {
                          value: formatCount(d.activeDays),
                          label:
                              d.activeDays === 1 ? 'active day' : 'active days',
                      }
                    : null,
        },
        {
            id: 'longestStreak',
            name: 'Longest streak',
            build: (d) =>
                d.longestStreak > 0
                    ? {
                          value: `${formatCount(d.longestStreak)} d`,
                          label: 'longest streak',
                      }
                    : null,
        },
    ],
    defaults: () => ['hoursThisYear', 'attempts12m', 'activeDays'],
};
