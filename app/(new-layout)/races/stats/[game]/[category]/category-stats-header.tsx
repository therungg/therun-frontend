import React from 'react';
import { GameStats } from '~app/(new-layout)/races/races.types';
import { StatsPerGame } from '~app/(new-layout)/races/stats/race-stats-per-game';

export const CategoryStatsHeader = ({ stats }: { stats: GameStats }) => {
    return <StatsPerGame stats={stats} />;
};
