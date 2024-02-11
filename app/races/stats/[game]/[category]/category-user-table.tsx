"use client";

import { PaginationContextProvider } from "~src/components/pagination/pagination.context-provider";
import React from "react";
import { UserStats } from "~app/races/races.types";
import usePagination from "~src/components/pagination/use-pagination";
import { genericFetcher } from "~src/components/pagination/fetchers/generic-fetcher";
import { Table } from "react-bootstrap";
import { UserLink } from "~src/components/links/links";
import { DurationToFormatted } from "~src/components/util/datetime";
import { PaginationSearch } from "~src/components/pagination/pagination-search";
import PaginationControl from "~src/components/pagination/pagination-control";

type UserStatsWithRanking = UserStats & { ranking: number };

export const CategoryUserTable = ({ users }: { users: UserStats[] }) => {
    return (
        <PaginationContextProvider>
            <CategoryUserTableDisplay
                users={users.map((user, i) => {
                    return {
                        ...user,
                        ranking: i + 1,
                    };
                })}
            />
        </PaginationContextProvider>
    );
};

const CategoryUserTableDisplay = ({
    users,
}: {
    users: UserStatsWithRanking[];
}) => {
    const pagination = usePagination<UserStatsWithRanking>(
        users,
        genericFetcher,
        10,
        1,
    );

    return (
        <div>
            <div className={"mb-3"}>
                <PaginationSearch text={"Search player"} />
            </div>
            <Table responsive hover bordered striped className={"rounded-3"}>
                <thead>
                    <tr>
                        <th style={{ width: "2rem" }}>#</th>
                        <th>Name</th>
                        <th style={{ width: "3rem" }}>Rating</th>
                        <th>Races</th>
                        <th>Finish %</th>
                        <th>Total Time</th>
                        <th>Race PB</th>
                    </tr>
                </thead>
                <tbody>
                    {pagination.data.map((user) => {
                        const username = user.displayValue.split("#")[2];
                        return (
                            <tr key={user.displayValue}>
                                <td>#{user.ranking}</td>
                                <td>
                                    <UserLink username={username} />
                                </td>
                                <td>{user.rating}</td>
                                <td>{user.totalRaces}</td>
                                <td>
                                    {(
                                        (user.totalFinishedRaces /
                                            user.totalRaces) *
                                        100
                                    ).toFixed(0)}
                                    %
                                </td>
                                <td>
                                    <DurationToFormatted
                                        duration={user.totalRaceTime}
                                    />
                                </td>
                                <td>
                                    <DurationToFormatted
                                        duration={user.racePb}
                                    />
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
