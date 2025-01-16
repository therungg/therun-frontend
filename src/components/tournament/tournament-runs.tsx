import React, { useEffect, useState } from "react";
import { Form, Pagination, Table } from "react-bootstrap";
import {
    DurationToFormatted,
    getFormattedString,
    IsoToFormatted,
    timeToMillis,
} from "../util/datetime";
import moment from "moment";
import { buildItems } from "../run/run-sessions/game-sessions";
import { Search as SearchIcon } from "react-bootstrap-icons";
import { UserLink } from "~src/components/links/links";
import { User } from "../../../types/session.types";
import { Tournament } from "~src/components/tournament/tournament-info";
import { SubmitButton } from "~src/actions/components/submit-button";
import { excludeRun } from "~src/actions/tournaments/exclude-run.action";
import { addTime } from "~src/actions/tournaments/add-time.action";

interface TournamentRunsProps {
    data: {
        runList: unknown[];
    };
    user: User;
    tournament: Tournament;
    showGame?: boolean;
}

export const TournamentRuns: React.FunctionComponent<TournamentRunsProps> = ({
    data,
    user,
    tournament,
    showGame = false,
}) => {
    const finalTime = 0;
    const [confirmedFinalTime, setConfirmedFinalTime] = useState(finalTime);
    const [finalTimeInput, setFinalTimeInput] = useState(
        getFormattedString(finalTime.toString(), true),
    );

    useEffect(() => {
        setConfirmedFinalTime(timeToMillis(finalTimeInput));
    }, [finalTimeInput]);
    const [sortColumn, setSortColumn] = useState("date");
    const [sortAsc, setSortAsc] = useState(true);

    const [search, setSearch] = useState("");

    const [active, setActive] = useState(1);
    const [items, setItems] = useState<React.ReactNode[]>();

    // TODO: FIX THIS
    // eslint-disable-next-line prefer-const
    let [useRuns, setUseRuns] = useState([]);

    const isAdmin =
        user.username && tournament.moderators?.includes(user.username);

    useEffect(() => {
        if (data && data.runList && data.runList.length > 0) {
            if (!items) {
                setUseRuns(data.runList);
            }
            const last = Math.ceil(data.runList.length / 10);
            setItems(buildItems(active, last));
        }
    }, [data, active]);

    if (search) {
        const accurateSearch = search
            .toLowerCase()
            .replaceAll(" ", "")
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "");
        useRuns = useRuns.filter((run) => {
            const accurateUser = run.user
                .toLowerCase()
                .replaceAll(" ", "")
                .normalize("NFD")
                .replace(/\p{Diacritic}/gu, "");

            const accurateGame = showGame
                ? run.game
                      .toLowerCase()
                      .replaceAll(" ", "")
                      .normalize("NFD")
                      .replace(/\p{Diacritic}/gu, "")
                : "";

            return (
                accurateUser.includes(accurateSearch) ||
                accurateGame.includes(accurateSearch)
            );
        });
    }

    const last = Math.ceil(useRuns.length / 10);

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

    const totalCount = useRuns.length;

    useRuns.sort((a, b) => {
        let res = 1;

        if (sortColumn === "date") {
            if (!a.endedAt) return 1;
            if (!b.endedAt) return -1;

            if (a.endedAt === b.endedAt) {
                return a.splitKey < b.splitKey ? 1 : -1;
            }
            const aDuration = moment(a.endedAt)
                .diff(moment(b.endedAt))
                .toString();

            res = parseInt(aDuration) < 0 ? 1 : -1;
        }

        if (sortColumn === "user") {
            if (a.user == b.user) res = 0;
            else res = a.user > b.user ? 1 : -1;
        }

        if (sortColumn === "time") {
            res = parseInt(a.time) > parseInt(b.time) ? 1 : -1;
        }

        if (sortColumn === "game") {
            if (a.game === b.game)
                res = parseInt(a.time) > parseInt(b.time) ? 1 : -1;
            else res = a.game > b.game ? 1 : -1;
        }

        if (!sortAsc) res *= -1;
        return res;
    });

    const onPaginationClick = (event): void => {
        let target = "";

        if (event.target.text) {
            target = event.target.text;
        } else if (event.target.innerHTML) {
            target = event.target.innerHTML;
        }

        if (!target) return;

        if (target.includes("«")) {
            setActive(1);
        } else if (target.includes("‹")) {
            setActive(active == 1 ? 1 : active - 1);
        } else if (target.includes("›")) {
            setActive(active == last ? last : active + 1);
        } else if (target.includes("»")) {
            setActive(last);
        } else {
            if (parseInt(target)) setActive(parseInt(target));
        }
    };

    return (
        <div>
            <h2>Tournament runs</h2>
            <div className="d-flex justify-content-start mb-1">
                <div className="mb-3 input-group game-filter-mw">
                    <label
                        className="input-group-text"
                        htmlFor="tournamentRunSearch"
                    >
                        <SearchIcon size={18} />
                    </label>
                    <input
                        type="search"
                        className="form-control"
                        placeholder={`Filter by user${
                            showGame ? " or Game" : ""
                        }`}
                        onChange={(e) => {
                            setSearch(e.target.value);
                        }}
                        value={search}
                        id="tournamentRunSearch"
                    />
                </div>
            </div>
            {isAdmin && (
                <div className="mb-3">
                    <Form action={addTime}>
                        <fieldset className="d-flex border border-tertiary pt-0 pb-3 px-3">
                            <legend className="w-auto mb-0">
                                Add Custom Run
                            </legend>
                            <input
                                hidden
                                name="tournament"
                                value={tournament.name}
                                readOnly
                            />
                            <input
                                hidden
                                name="date"
                                value={tournament.eligiblePeriods[0].startDate}
                                readOnly
                            />
                            <span className="d-flex align-items-center me-1">
                                User:
                            </span>
                            <input
                                name="user"
                                type="text"
                                className="form-control w-25 h-25 me-3"
                            />
                            <span className="d-flex align-items-center me-1">
                                Time:
                            </span>
                            <input
                                type="text"
                                name="finalTimeInput"
                                className="form-control w-25 h-25 me-3"
                                value={finalTimeInput}
                                onChange={(event) => {
                                    setFinalTimeInput(event.target.value);
                                }}
                            />
                            <input
                                hidden
                                name="time"
                                value={confirmedFinalTime}
                                readOnly
                            />
                            <SubmitButton
                                innerText="Add Run"
                                pendingText="Adding Run"
                            />
                        </fieldset>
                    </Form>
                </div>
            )}
            <Table responsive striped bordered hover>
                <thead>
                    <tr>
                        <th
                            className={getSortableClassName("user")}
                            onClick={() => changeSort("user")}
                        >
                            User
                        </th>
                        {showGame && (
                            <th
                                className={getSortableClassName("game")}
                                onClick={() => changeSort("game")}
                            >
                                Game
                            </th>
                        )}
                        <th
                            className={getSortableClassName("time")}
                            onClick={() => changeSort("time")}
                        >
                            Time
                        </th>
                        <th
                            className={getSortableClassName("date")}
                            onClick={() => changeSort("date")}
                        >
                            Date
                        </th>
                        {isAdmin && <th>Remove Run</th>}
                    </tr>
                </thead>
                <tbody>
                    {useRuns
                        .slice((active - 1) * 10, active * 10)
                        .map((run) => {
                            return (
                                <tr key={run.endedAt + run.user}>
                                    <td>
                                        <UserLink username={run.user} />
                                    </td>
                                    {showGame && <td>{run.game}</td>}
                                    <td>
                                        <DurationToFormatted
                                            duration={run.time}
                                        />
                                    </td>
                                    <td>
                                        <IsoToFormatted iso={run.endedAt} />
                                    </td>
                                    {isAdmin && (
                                        <td>
                                            <Form action={excludeRun}>
                                                <input
                                                    hidden
                                                    name="tournament"
                                                    value={tournament.name}
                                                    readOnly
                                                />

                                                <input
                                                    hidden
                                                    name="date"
                                                    value={run.endedAt}
                                                    readOnly
                                                />

                                                <input
                                                    hidden
                                                    name="user"
                                                    value={run.user}
                                                    readOnly
                                                />
                                                <SubmitButton
                                                    innerText="Exclude Run"
                                                    pendingText="Excluding Run..."
                                                />
                                            </Form>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                </tbody>
            </Table>

            <Pagination
                className="justify-content-center"
                onClick={onPaginationClick}
                size="lg"
            >
                {items}
            </Pagination>

            <div style={{ display: "flex", justifyContent: "center" }}>
                Showing {(active - 1) * 10 + 1} -{" "}
                {active * 10 < useRuns.length ? active * 10 : useRuns.length}{" "}
                out of {useRuns.length} runs{" "}
                {totalCount !== useRuns.length &&
                    ` (${totalCount} without filter)`}
            </div>
        </div>
    );
};
