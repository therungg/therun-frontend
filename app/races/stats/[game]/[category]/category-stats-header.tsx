import { StatsPerGame } from "~app/races/stats/race-stats-per-game";
import React from "react";
import { GameStats } from "~app/races/races.types";

export const CategoryStatsHeader = ({ stats }: { stats: GameStats }) => {
    return <StatsPerGame stats={stats} />;
};
