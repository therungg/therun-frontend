import React from 'react';
import { Col, Row } from 'react-bootstrap';
import RaceGameContextProvider from '~app/(old-layout)/races/context/race-game-context-provider';
import { RaceGameStatsByCategory } from '~app/(old-layout)/races/races.types';
import {
    CategoryLeaderboards,
    LeaderboardData,
} from '~app/(old-layout)/races/stats/[game]/[category]/category-leaderboards';
import { CategoryStatsHeader } from '~app/(old-layout)/races/stats/[game]/[category]/category-stats-header';
import { CategoryUserTable } from '~app/(old-layout)/races/stats/[game]/[category]/category-user-table';
import {
    Breadcrumb,
    BreadcrumbItem,
} from '~src/components/breadcrumbs/breadcrumb';

export const CategoryStats = ({
    categoryStats,
    leaderboards,
}: {
    categoryStats: RaceGameStatsByCategory;
    leaderboards: LeaderboardData[];
}) => {
    const { stats, users } = categoryStats;
    const [game, category] = stats.displayValue.split('#');
    const breadcrumbs: BreadcrumbItem[] = [
        { content: 'Races', href: '/races' },
        { content: 'Race Stats', href: '/races/stats' },
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
                        <h2>
                            {game} - {category} Leaderboards
                        </h2>
                        <CategoryStatsHeader stats={stats} />
                        <div className="mt-3">
                            <CategoryUserTable users={users} />
                        </div>
                    </Col>
                    <Col xs={12} lg={4}>
                        <h2>Leaderboards</h2>
                        <CategoryLeaderboards leaderboards={leaderboards} />
                    </Col>
                </Row>
            </RaceGameContextProvider>
        </div>
    );
};
