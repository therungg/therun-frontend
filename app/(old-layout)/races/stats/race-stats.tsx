import { GameStats, GlobalStats } from "~app/(old-layout)/races/races.types";
import {
    Breadcrumb,
    BreadcrumbItem,
} from "~src/components/breadcrumbs/breadcrumb";
import React from "react";
import { RaceStatsCards } from "~app/(old-layout)/races/stats/race-stats-cards";
import { RaceStatsPerGame } from "~app/(old-layout)/races/stats/race-stats-per-game";

interface RaceStatsProps {
    globalRaceStats: GlobalStats;
    globalGameStats: GameStats[];
}

export const RaceStats = ({
    globalRaceStats,
    globalGameStats,
}: RaceStatsProps) => {
    const breadcrumbs: BreadcrumbItem[] = [
        { content: "Races", href: "/races" },
        { content: "Race Stats" },
    ];
    return (
        <div>
            <Breadcrumb breadcrumbs={breadcrumbs} />
            <RaceStatsCards globalRaceStats={globalRaceStats} />
            <RaceStatsPerGame globalGameStats={globalGameStats} />
        </div>
    );
};
