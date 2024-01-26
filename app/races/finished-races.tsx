import { PaginatedRaces, Race } from "~app/races/races.types";
import usePagination from "~src/components/pagination/use-pagination";
import { getPaginatedFinishedRaces } from "~src/lib/races";
import React from "react";
import { Table } from "react-bootstrap";
import Link from "next/link";
import { UserLink } from "~src/components/links/links";
import { LocalizedTime } from "~src/components/util/datetime";
import PaginationControl from "~src/components/pagination/pagination-control";

export const FinishedRaces = ({ races }: { races: PaginatedRaces }) => {
    const pagination = usePagination<Race>(races, getPaginatedFinishedRaces);

    const { isLoading, data } = pagination;
    // Make this a skeleton
    if (isLoading) return <div>Loading...</div>;

    return (
        <div>
            <h2>Finished Races</h2>
            <FinishedRacesTable races={data} />
            <PaginationControl {...pagination} />
        </div>
    );
};

const FinishedRacesTable = ({ races }: { races: Race[] }) => {
    return (
        <Table responsive striped bordered>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Created By</th>
                    <th># Players</th>
                    <th>Started at</th>
                    <th>Ended at</th>
                </tr>
            </thead>
            <tbody>
                {races.map((race) => {
                    return (
                        <tr key={race.raceId}>
                            <td>
                                <Link href={`/races/${race.raceId}`}>
                                    {race.customName ||
                                        `${race.displayGame} - ${race.displayCategory}`}
                                </Link>
                            </td>
                            <td>
                                <UserLink username={race.creator} />
                            </td>
                            <td>{race.participantCount}</td>
                            <td>
                                <LocalizedTime
                                    date={new Date(race.startTime as string)}
                                />
                            </td>
                            <td>
                                <LocalizedTime
                                    date={new Date(race.endTime as string)}
                                />
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </Table>
    );
};
