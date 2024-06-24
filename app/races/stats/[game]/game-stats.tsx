import {
    PaginatedRaces,
    RaceGameStatsByGameWithCategoryStats,
} from "~app/races/races.types";
import { StatsPerGame } from "~app/races/stats/race-stats-per-game";
import { Col, Row } from "react-bootstrap";
import {
    Breadcrumb,
    BreadcrumbItem,
} from "~src/components/breadcrumbs/breadcrumb";
import { FinishedRacesByGameTable } from "~app/races/stats/[game]/finished-races-by-game-table";
import { CategoryStatsList } from "~app/races/stats/[game]/category-stats-list";
import RaceGameContextProvider from "~app/races/context/race-game-context-provider";

export const GameStats = ({
    stats,
    paginatedRaces,
}: {
    stats: RaceGameStatsByGameWithCategoryStats;
    paginatedRaces: PaginatedRaces;
}) => {
    const breadcrumbs: BreadcrumbItem[] = [
        { content: "Races", href: "/races" },
        { content: "Race Stats", href: "/races/stats" },
        {
            content: stats.stats.displayValue,
            href: `/${stats.stats.displayValue}`,
        },
    ];
    return (
        <div>
            <Breadcrumb breadcrumbs={breadcrumbs} />
            <RaceGameContextProvider game={stats.stats.displayValue}>
                <Row>
                    <Col xs={12} lg={8}>
                        <h2>{stats.stats.displayValue} Races</h2>
                        <StatsPerGame stats={stats.stats} isLink={false} />
                        <h2 className="mt-4">Categories</h2>
                        <CategoryStatsList stats={stats.categories} />
                    </Col>
                    <Col xs={12} lg={4}>
                        <h2>Recent Races</h2>
                        <FinishedRacesByGameTable
                            game={stats.stats.displayValue}
                            paginatedRaces={paginatedRaces}
                        />
                    </Col>
                </Row>
            </RaceGameContextProvider>
        </div>
    );
};
