"use client";

import { FinishedRaceTable } from "~app/(old-layout)/races/finished/finished-races-table";
import { getPaginatedFinishedRacesByGame } from "~src/lib/races";
import { PaginatedRaces } from "~app/(old-layout)/races/races.types";

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
