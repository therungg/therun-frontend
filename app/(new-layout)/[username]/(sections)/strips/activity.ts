import type { RunnerActivity } from '../../../../../types/runner-profile.types';
import { formatCount } from '../format';
import { plural } from '../ranks';
import type { StripLead } from '../stat-strip';
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

/** The strip's numbers, from a year of activity. */
export function activityStripData(activity: RunnerActivity): ActivityStripData {
    return {
        hoursThisYear: activity.hoursThisYear,
        attempts: activity.days.reduce((s, d) => s + d.attempts, 0),
        activeDays: activity.days.filter((d) => d.attempts > 0).length,
        longestStreak: activity.streaks.longest,
    };
}

/** The current streak, else the longest; null when they never had one. */
export function activityLead(
    streaks: RunnerActivity['streaks'],
): StripLead | null {
    if (streaks.current > 0) {
        return {
            value: plural(streaks.current, 'day', 'days'),
            label: 'Current streak',
            what:
                streaks.longest > streaks.current
                    ? `Longest ${plural(streaks.longest, 'day', 'days')}`
                    : 'Streak',
        };
    }
    if (streaks.longest > 0) {
        return {
            value: plural(streaks.longest, 'day', 'days'),
            label: 'Longest streak',
            what: null,
        };
    }
    return null;
}
