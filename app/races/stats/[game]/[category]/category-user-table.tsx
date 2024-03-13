"use client";

import { PaginationContextProvider } from "~src/components/pagination/pagination.context-provider";
import React, { useState } from "react";
import { UserStats } from "~app/races/races.types";
import usePagination from "~src/components/pagination/use-pagination";
import { genericFetcher } from "~src/components/pagination/fetchers/generic-fetcher";
import { Table } from "react-bootstrap";
import { UserLink } from "~src/components/links/links";
import { DurationToFormatted } from "~src/components/util/datetime";
import { PaginationSearch } from "~src/components/pagination/pagination-search";
import { TrophyIcon } from "~src/icons/trophy-icon";

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
        100000,
        1,
    );
    const [sortColumn, setSortColumn] = useState("rating");
    const [sortAsc, setSortAsc] = useState(true);

    const changeSort = (column: string) => {
        if (sortColumn === column) {
            setSortAsc(!sortAsc);
        } else {
            setSortColumn(column);
            setSortAsc(true);
        }
    };

    const getSortableClassName = (column: string): string => {
        let classNames = "sortable";

        if (sortColumn === column) {
            classNames += " active";
            classNames += sortAsc ? " asc" : " desc";
        }

        return classNames;
    };

    const data = pagination.data.sort((a, b) => {
        let res = 1;

        if (sortColumn === "rating") {
            res = b.rating - a.rating;
        }
        if (sortColumn === "raceCount") {
            res = b.totalRaces - a.totalRaces;
        }
        if (sortColumn === "totalTime") {
            res = b.totalRaceTime - a.totalRaceTime;
        }
        if (sortColumn === "racePb") {
            if (b.racePb === 0 || a.racePb === 0) res = -1;
            else res = a.racePb - b.racePb;
        }

        if (!sortAsc) res *= -1;

        return res;
    });

    return (
        <div>
            <div className={"mb-3"}>
                <PaginationSearch text={"Search player"} />
            </div>
            {data.length === 0 && "No results"}
            {data.length > 0 && (
                <Table
                    responsive
                    hover
                    bordered
                    striped
                    className={"rounded-3"}
                >
                    <thead>
                        <tr>
                            <th style={{ width: "2rem" }}>#</th>
                            <th>Name</th>
                            <th
                                className={getSortableClassName("rating")}
                                onClick={() => changeSort("rating")}
                                style={{ width: "3rem" }}
                            >
                                Rating
                            </th>
                            <th
                                className={getSortableClassName("raceCount")}
                                onClick={() => changeSort("raceCount")}
                            >
                                Races
                            </th>
                            <th>Finish %</th>
                            <th
                                className={getSortableClassName("totalTime")}
                                onClick={() => changeSort("totalTime")}
                            >
                                Total Time
                            </th>
                            <th
                                className={getSortableClassName("racePb")}
                                onClick={() => changeSort("racePb")}
                            >
                                Race PB
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {pagination.data.map((user) => {
                            const username = user.displayValue.split("#")[2];
                            return (
                                <tr key={user.displayValue}>
                                    <td>
                                        {user.ranking < 4 ? (
                                            <TrophyIcon
                                                trophyColor={
                                                    user.ranking === 1
                                                        ? "gold"
                                                        : user.ranking === 2
                                                          ? "silver"
                                                          : "bronze"
                                                }
                                            />
                                        ) : (
                                            <span>{user.ranking}.</span>
                                        )}
                                    </td>
                                    <td>
                                        <UserLink
                                            username={username}
                                            url={`/${username}/races`}
                                        />
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
                                        {user.racePb > 0 && (
                                            <DurationToFormatted
                                                duration={user.racePb}
                                            />
                                        )}
                                        {!user.racePb && "-"}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Table>
            )}
        </div>
    );
};
