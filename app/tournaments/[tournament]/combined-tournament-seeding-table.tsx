import { CombinedLeaderboardStat } from "~app/tournaments/[tournament]/get-combined-tournament-leaderboard.component";
import { Tournament } from "~src/components/tournament/tournament-info";
import { Table } from "react-bootstrap";
import { DurationToFormatted } from "~src/components/util/datetime";
import { useState } from "react";
import { UserLink } from "~src/components/links/links";

export const CombinedTournamentSeedingTable = ({
    tournaments,
    leaderboards,
}: {
    tournaments: Tournament[];
    leaderboards: CombinedLeaderboardStat[];
}) => {
    const [sortColumn, setSortColumn] = useState("seed");
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

    leaderboards.sort((a, b) => {
        let res = 1;

        if (sortColumn === "seed") res = a.seed - b.seed;
        if (sortColumn === "user") res = a.username < b.username ? -1 : 1;

        tournaments.forEach((tournament) => {
            if (sortColumn === tournament.game) {
                const aRun = a.runs.get(tournament.game);
                const bRun = b.runs.get(tournament.game);

                if (!aRun?.stat && !bRun?.stat) {
                    res = a.seed - b.seed;
                    return;
                }

                if (!aRun?.stat) {
                    res = sortAsc ? 1 : -1;
                    return;
                }
                if (!bRun?.stat) {
                    res = sortAsc ? -1 : 1;
                    return;
                }

                res = parseInt(aRun.stat) - parseInt(bRun.stat);
            }
        });

        if (!sortAsc) res *= -1;

        return res;
    });

    const gamesMap = new Map([
        ["Super Mario 64", "SM64 70 Star"],
        ["Super Mario Sunshine", "SMS Any%"],
        ["Super Mario Galaxy", "SMG Any%"],
        ["Super Mario Galaxy 2", "SMG2 Any%"],
        ["Super Mario 3D World", "SM3DW Any%"],
        ["Super Mario Odyssey", "SMO Any%"],
    ]);
    return (
        <div>
            <h2>Seeding Table</h2>
            <Table responsive striped bordered hover>
                <thead>
                    <tr>
                        <th
                            className={getSortableClassName("seed")}
                            onClick={() => {
                                changeSort("seed");
                            }}
                        >
                            #
                        </th>
                        <th
                            className={getSortableClassName("user")}
                            onClick={() => {
                                changeSort("user");
                            }}
                        >
                            Participant
                        </th>
                        {tournaments.map((tournament) => (
                            <th
                                key={tournament.game}
                                className={getSortableClassName(
                                    tournament.game,
                                )}
                                onClick={() => {
                                    changeSort(tournament.game);
                                }}
                            >
                                {gamesMap.get(tournament.game as string) ||
                                    tournament.game}
                            </th>
                        ))}
                        <th>%</th>
                        {/*<th>X</th>*/}
                    </tr>
                </thead>
                <tbody>
                    {leaderboards.map((leaderboard) => (
                        <tr key={leaderboard.username}>
                            <td>{leaderboard.seed}</td>
                            <td>
                                <UserLink username={leaderboard.username} />
                            </td>
                            {tournaments.map((tournament) => {
                                const run = leaderboard.runs.get(
                                    tournament.game as string,
                                );
                                return (
                                    <td
                                        title={`${run?.differenceToFirst.toFixed(
                                            2,
                                        )}%`}
                                        key={
                                            leaderboard.username +
                                            tournament.game
                                        }
                                    >
                                        {run !== undefined && (
                                            <>
                                                <DurationToFormatted
                                                    duration={
                                                        run.stat as string
                                                    }
                                                />{" "}
                                                (#{run.placing})
                                            </>
                                        )}
                                    </td>
                                );
                            })}
                            <td>{leaderboard.seedPercentage.toFixed(2)}</td>
                            {/*<td>{leaderboard.gameCount}</td>*/}
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
};
