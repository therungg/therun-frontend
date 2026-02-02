import { UserStats } from '~app/(old-layout)/races/races.types';

export const groupCategoryStatsByGame = (stats: UserStats[]): UserStats[][] => {
    const map = new Map<string, UserStats[]>();

    stats
        .sort((a, b) => b.totalRaceTime - a.totalRaceTime)
        .forEach((stat) => {
            const game = stat.value.split('#')[0];
            const currentStats = map.get(game) || [];

            currentStats.push(stat);

            map.set(game, currentStats);
        });

    return Array.from(map.values());
};
