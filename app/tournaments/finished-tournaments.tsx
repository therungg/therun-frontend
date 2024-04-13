"use client";

import { Tournament } from "~src/components/tournament/tournament-info";
import { PaginationContextProvider } from "~src/components/pagination/pagination.context-provider";
import usePagination from "~src/components/pagination/use-pagination";
import PaginationControl from "~src/components/pagination/pagination-control";
import { PaginationSearch } from "~src/components/pagination/pagination-search";
import { Table } from "react-bootstrap";
import { safeEncodeURI } from "~src/utils/uri";
import { FromNow } from "~src/components/util/datetime";
import { useContext } from "react";
import { PaginationContext } from "~src/components/pagination/pagination.context";

export const FinishedTournaments = ({
    tournaments,
}: {
    tournaments: Tournament[];
}) => {
    return (
        <PaginationContextProvider>
            <FinishedTournamentsPaginated tournaments={tournaments} />
        </PaginationContextProvider>
    );
};

export const FinishedTournamentsPaginated = ({
    tournaments,
}: {
    tournaments: Tournament[];
}) => {
    const pagination = usePagination<Tournament>(tournaments);
    const { setSearch } = useContext(PaginationContext);
    return (
        <div>
            <h3>Finished Tournaments</h3>
            <PaginationSearch text={"Search for tournament/organizer/game"} />
            <Table responsive striped bordered hover className={"mt-3"}>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Organizer</th>
                        <th>Game/Category</th>
                        <th>Ended</th>
                    </tr>
                </thead>
                <tbody>
                    {pagination.data.map((tournament) => {
                        return (
                            <tr key={tournament.name}>
                                <td>
                                    <a
                                        href={`/tournaments/${safeEncodeURI(
                                            tournament.name,
                                        )}`}
                                        className={"text-truncate"}
                                    >
                                        {tournament.name}
                                    </a>
                                </td>
                                <td
                                    className={"cursor-pointer text-truncate"}
                                    onClick={() => {
                                        setSearch(tournament.organizer);
                                    }}
                                >
                                    {tournament.organizer}
                                </td>
                                <td
                                    className={"cursor-pointer text-truncate"}
                                    onClick={() => {
                                        setSearch(
                                            tournament.eligibleRuns[0]
                                                ? tournament.eligibleRuns[0]
                                                      .game
                                                : "",
                                        );
                                    }}
                                >
                                    {tournament.eligibleRuns[0]
                                        ? tournament.eligibleRuns[0].game
                                        : ""}{" "}
                                    -{" "}
                                    {tournament.eligibleRuns[0]
                                        ? tournament.eligibleRuns[0].category
                                        : ""}
                                </td>
                                <td className={"text-truncate"}>
                                    <FromNow time={tournament.endDate} />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
            <PaginationControl {...pagination} />
        </div>
    );
};
