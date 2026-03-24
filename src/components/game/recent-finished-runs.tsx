'use client';

import React, { useEffect, useState } from 'react';
import { Table } from 'react-bootstrap';
import { searchFinishedRuns } from '~src/lib/finished-runs';
import { getCategoriesForGame } from '~src/lib/game-search';
import type { CategoryStats, FinishedRunPB } from '~src/lib/highlights';
import { UserGameCategoryLink, UserLink } from '../links/links';
import { DurationToFormatted, FromNow } from '../util/datetime';

interface Props {
    game: string;
    category?: string;
    categoryDisplay?: string;
    showCategory?: boolean;
}

export const RecentFinishedRuns: React.FC<Props> = ({
    game,
    category,
    categoryDisplay,
    showCategory = true,
}) => {
    const [runs, setRuns] = useState<FinishedRunPB[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [categories, setCategories] = useState<CategoryStats[]>([]);

    useEffect(() => {
        let stale = false;
        getCategoriesForGame(game).then((cats) => {
            if (!stale) setCategories(cats);
        });
        return () => {
            stale = true;
        };
    }, [game]);

    useEffect(() => {
        if (categories.length === 0) return;

        let stale = false;
        setIsLoading(true);

        const gameId = categories[0].gameId;
        const isFiltered = category && category !== '*';
        const cat = isFiltered
            ? categories.find((c) => c.categoryDisplay === categoryDisplay)
            : undefined;

        searchFinishedRuns({
            gameId,
            categoryId: cat?.categoryId,
            limit: 10,
            sort: '-ended_at',
        })
            .then((result) => {
                if (stale) return;
                setRuns(result.items ?? []);
                setIsLoading(false);
            })
            .catch((err) => {
                console.error('RecentFinishedRuns fetch error:', err);
                if (stale) return;
                setRuns([]);
                setIsLoading(false);
            });

        return () => {
            stale = true;
        };
    }, [categories, category, categoryDisplay]);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (runs.length === 0) {
        return <div>No recent finished runs found.</div>;
    }

    return (
        <Table striped bordered hover responsive>
            <thead>
                <tr>
                    <th>Time Ago</th>
                    {showCategory && <th>Category</th>}
                    <th>Runner</th>
                    <th>Time</th>
                </tr>
            </thead>
            <tbody>
                {runs.map((run) => (
                    <tr key={run.id}>
                        <td>
                            <UserGameCategoryLink
                                username={run.username}
                                category={run.category}
                                game={game}
                            >
                                <FromNow time={run.endedAt} />
                            </UserGameCategoryLink>
                        </td>
                        {showCategory && <td>{run.category}</td>}
                        <td>
                            <UserLink username={run.username} />
                        </td>
                        <td className="font-monospace">
                            <DurationToFormatted duration={String(run.time)} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );
};

export default RecentFinishedRuns;
