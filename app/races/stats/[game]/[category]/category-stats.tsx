import {
    PaginatedRaces,
    RaceGameStatsByCategory,
} from "~app/races/races.types";
import React from "react";
import { CategoryStatsHeader } from "~app/races/stats/[game]/[category]/category-stats-header";
import { Col, Row } from "react-bootstrap";
import {
    Breadcrumb,
    BreadcrumbItem,
} from "~src/components/breadcrumbs/breadcrumb";
import { FinishedRacesByGameTable } from "~app/races/stats/[game]/finished-races-by-game-table";
import RaceGameContextProvider from "~app/races/context/race-game-context-provider";
import { CategoryUserTable } from "~app/races/stats/[game]/[category]/category-user-table";

export const CategoryStats = ({
    categoryStats,
    paginatedRaces,
}: {
    categoryStats: RaceGameStatsByCategory;
    paginatedRaces: PaginatedRaces;
}) => {
    const { stats, users } = categoryStats;
    const [game, category] = stats.displayValue.split("#");
    const breadcrumbs: BreadcrumbItem[] = [
        { content: "Races", href: "/races" },
        { content: "Race Stats", href: "/races/stats" },
        {
            content: game,
            href: `/races/stats/${game}`,
        },
        {
            content: category,
            href: `/races/stats/${game}/${category}`,
        },
    ];

    return (
        <div>
            <Breadcrumb breadcrumbs={breadcrumbs} />

            <RaceGameContextProvider game={stats.displayValue}>
                <Row>
                    <Col xs={12} lg={8}>
                        <h2>Category Stats</h2>
                        <CategoryStatsHeader stats={stats} />
                        <div className={"mt-3"}>
                            <CategoryUserTable users={users} />
                        </div>
                    </Col>
                    <Col xs={12} lg={4}>
                        <h2>Finished Races for Game</h2>
                        <FinishedRacesByGameTable
                            game={stats.displayValue}
                            paginatedRaces={paginatedRaces}
                        />
                    </Col>
                </Row>
            </RaceGameContextProvider>
        </div>
    );
};
