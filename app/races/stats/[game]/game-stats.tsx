import { PaginatedRaces, RaceGameStatsByGame } from "~app/races/races.types";
import { StatsPerGame } from "~app/races/stats/race-stats-per-game";
import { Col, Row } from "react-bootstrap";
import {
    Breadcrumb,
    BreadcrumbItem,
} from "~src/components/breadcrumbs/breadcrumb";
import { FinishedRacesByGameTable } from "~app/races/stats/[game]/finished-races-by-game-table";

export const GameStats = ({
    stats,
    paginatedRaces,
}: {
    stats: RaceGameStatsByGame;
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
            <Row>
                <Col xs={6}>
                    <StatsPerGame stats={stats.stats} isLink={false} />
                </Col>
                <Col xs={6}>
                    <FinishedRacesByGameTable
                        game={stats.stats.displayValue}
                        paginatedRaces={paginatedRaces}
                    />
                </Col>
            </Row>
        </div>
    );
};
