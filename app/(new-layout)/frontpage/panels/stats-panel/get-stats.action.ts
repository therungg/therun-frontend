'use server';

import { getUserSummary } from '~src/lib/summary';

export async function fetchStatsAction(
    user: string,
    range: 'week' | 'month',
    offset: number = 0,
) {
    let tries = offset;
    let stats = await getUserSummary(user, range, tries++);

    if (offset > 0) {
        return stats;
    }

    while (stats === undefined && tries < 3) {
        stats = await getUserSummary(user, range, tries++);
    }

    return stats;
}
