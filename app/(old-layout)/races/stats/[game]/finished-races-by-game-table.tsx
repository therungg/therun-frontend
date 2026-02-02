'use client';

import { FinishedRaceTable } from '~app/(old-layout)/races/finished/finished-races-table';
import { PaginatedRaces } from '~app/(old-layout)/races/races.types';
import { getPaginatedFinishedRacesByGame } from '~src/lib/races';

export const FinishedRacesByGameTable = ({
    game,
    paginatedRaces,
}: {
    game: string;
    paginatedRaces: PaginatedRaces;
}) => {
    return (
        <div>
            <FinishedRaceTable
                paginatedRaces={paginatedRaces}
                paginationFunction={getPaginatedFinishedRacesByGame}
                params={{ game }}
            />
        </div>
    );
};
