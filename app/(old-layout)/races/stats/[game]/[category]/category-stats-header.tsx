import { StatsPerGame } from "~app/(old-layout)/races/stats/race-stats-per-game";
import React from "react";
import { GameStats } from "~app/(old-layout)/races/races.types";

export const CategoryStatsHeader = ({ stats }: { stats: GameStats }) => {
    return <StatsPerGame stats={stats} />;
};
