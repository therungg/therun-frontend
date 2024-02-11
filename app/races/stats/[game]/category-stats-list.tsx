"use client";

import { GameStats } from "~app/races/races.types";
import styles from "~src/components/css/LiveRun.module.scss";
import { PaginationContextProvider } from "~src/components/pagination/pagination.context-provider";
import usePagination from "~src/components/pagination/use-pagination";
import { PaginationSearch } from "~src/components/pagination/pagination-search";
import PaginationControl from "~src/components/pagination/pagination-control";
import React from "react";
import { genericFetcher } from "~src/components/pagination/fetchers/generic-fetcher";
import { StatsBody } from "~app/races/stats/race-stats-per-game";

export const CategoryStatsList = ({ stats }: { stats: GameStats[] }) => {
    return (
        <PaginationContextProvider>
            <CategoryStatsListDisplay stats={stats} />
        </PaginationContextProvider>
    );
};

export const CategoryStatsListDisplay = ({ stats }: { stats: GameStats[] }) => {
    const pagination = usePagination<GameStats>(stats, genericFetcher, 3, 1);

    return (
        <div className={""}>
            <PaginationSearch text={"Search for category"} />
            <div className={"mt-2 mb-4"}>
                {pagination.data.map((gameStats) => {
                    return (
                        <CategoryStatsPanel
                            key={gameStats.value}
                            stats={gameStats}
                        />
                    );
                })}
            </div>
            <PaginationControl {...pagination} minimalLayout={true} />
        </div>
    );
};

export const CategoryStatsPanel = ({ stats }: { stats: GameStats }) => {
    const [game, category] = stats.displayValue.split("#");
    return (
        <a
            href={`/races/stats/${game}/${category}`}
            className={"text-decoration-none"}
        >
            <div
                className={`bg-body-secondary game-border mh-100 h-100 card border-2 mt-2 px-3 py-2 ${styles.liveRunContainer}`}
            >
                <div className={"justify-content-between d-flex"}>
                    <span className={"fs-5"}>{category}</span>
                    <span>{stats.totalRaces} Races</span>
                </div>
                <hr className={"mt-1 p-0"} />
                <StatsBody stats={stats} />
            </div>
        </a>
    );
};
