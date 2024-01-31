"use client";

import { PaginatedRaces, Race } from "~app/races/races.types";
import { PaginationContextProvider } from "~src/components/pagination/pagination.context-provider";
import usePagination from "~src/components/pagination/use-pagination";
import { getPaginatedFinishedRaces } from "~src/lib/races";
import React from "react";
import PaginationControl from "~src/components/pagination/pagination-control";
import { Table } from "react-bootstrap";
import { PersonIcon } from "~src/icons/person-icon";
import { UserLink } from "~src/components/links/links";
import { RaceFirstPlace } from "~app/races/components/race-first-place";
import { FromNow } from "~src/components/util/datetime";
import { GameImage } from "~src/components/image/gameimage";
import { useRouter } from "next/navigation";

export const FinishedRaceTable = ({
    paginatedRaces,
}: {
    paginatedRaces: PaginatedRaces;
}) => {
    return (
        <PaginationContextProvider>
            <FinishedRaceTableView paginatedRaces={paginatedRaces} />
        </PaginationContextProvider>
    );
};

const FinishedRaceTableView = ({
    paginatedRaces,
}: {
    paginatedRaces: PaginatedRaces;
}) => {
    const pagination = usePagination<Race>(
        paginatedRaces,
        getPaginatedFinishedRaces,
    );

    const { isLoading, data } = pagination;
    // Make this a skeleton
    if (isLoading) return <div>Loading...</div>;

    return (
        <div>
            <FinishedRaces races={data} />
            <PaginationControl {...pagination} />
        </div>
    );
};

const FinishedRaces = ({ races }: { races: Race[] }) => {
    const { push } = useRouter();

    const imageWidth = 60;

    return (
        <Table bordered striped hover responsive>
            <thead>
                <tr>
                    <th colSpan={2}>Game/Category</th>
                    <th className={"d-none d-xl-table-cell"}>Participants</th>
                    <th className={"d-none d-md-table-cell"}>Winner</th>
                    <th className={"d-none d-xl-table-cell"}>Started</th>
                    <th className={"d-none d-xl-table-cell"}>Created By</th>
                </tr>
            </thead>
            <tbody>
                {races.map((race) => {
                    return (
                        <tr
                            key={race.raceId}
                            className={"cursor-pointer"}
                            onClick={() => {
                                push(`/races/${race.raceId}`);
                            }}
                        >
                            <td
                                className={"p-0"}
                                style={{ width: `${imageWidth}px` }}
                            >
                                <GameImage
                                    quality={"hd"}
                                    src={race.gameImage}
                                    width={imageWidth}
                                    height={100}
                                />
                            </td>
                            <td className={"py-2 px-3"}>
                                <div
                                    className={"h5 m-0 p-0"}
                                    style={{
                                        color: "var(--bs-link-color)",
                                    }}
                                >
                                    {race.displayGame}
                                </div>
                                {race.displayCategory}
                            </td>
                            <td className={"d-none d-xl-table-cell"}>
                                <span className={"text-nowrap"}>
                                    <span className={"me-1"}>
                                        {race.participantCount}
                                    </span>
                                    <PersonIcon />
                                </span>
                            </td>
                            <td className={"d-none d-md-table-cell"}>
                                <RaceFirstPlace race={race} />
                            </td>
                            <td className={"d-none d-xl-table-cell"}>
                                <FromNow time={race.startTime as string} />
                            </td>
                            <td className={"d-none d-xl-table-cell"}>
                                <UserLink username={race.creator} />
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </Table>
    );
};
