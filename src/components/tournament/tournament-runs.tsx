import React, { useEffect, useState } from "react";
import { Pagination, Table } from "react-bootstrap";
import { DurationToFormatted, IsoToFormatted } from "../util/datetime";
import moment from "moment";
import { buildItems } from "../run/run-sessions/game-sessions";
import paginationStyles from "../css/Pagination.module.scss";
import { Search as SearchIcon } from "react-bootstrap-icons";

export const TournamentRuns = ({ data }) => {
    const [sortColumn, setSortColumn] = useState("date");
    const [sortAsc, setSortAsc] = useState(true);

    const [search, setSearch] = useState("");

    const [active, setActive] = useState(1);
    const [items, setItems] = useState(null);

    // eslint-disable-next-line prefer-const
    let [useRuns, setUseRuns] = useState(null);

    useEffect(() => {
        if (data && data.runList) {
            if (!items) {
                setUseRuns(data.runList);
            }
            const last = Math.ceil(data.runList.length / 10);
            setItems(buildItems(active, last));
        }
    }, [data, active]);

    if (!useRuns) return <div>Loading data...</div>;

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

            return accurateUser.includes(accurateSearch);
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
                <div className="mb-3 input-group">
                    <span
                        className="input-group-text"
                        onClick={() => {
                            const searchElement =
                                document.getElementById("gameSearch");
                            if (document.activeElement !== search) {
                                searchElement.focus();
                            }
                        }}
                    >
                        <SearchIcon size={18} />
                    </span>
                    <input
                        type="search"
                        className="form-control"
                        placeholder="Filter by user"
                        onChange={(e) => {
                            setSearch(e.target.value);
                        }}
                        value={search}
                        id="tournamentRunSearch"
                    />
                </div>
            </div>
            <Table responsive striped bordered hover>
                <thead>
                    <tr>
                        <th
                            className={getSortableClassName("user")}
                            onClick={() => changeSort("user")}
                        >
                            User
                        </th>
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
                    </tr>
                </thead>
                <tbody>
                    {useRuns
                        .slice((active - 1) * 10, active * 10)
                        .map((run) => {
                            return (
                                <tr key={run.endedAt + run.user}>
                                    <td>{run.user}</td>
                                    <td>
                                        <DurationToFormatted
                                            duration={run.time}
                                        />
                                    </td>
                                    <td>
                                        <IsoToFormatted iso={run.endedAt} />
                                    </td>
                                </tr>
                            );
                        })}
                </tbody>
            </Table>
            <div className={paginationStyles.paginationWrapper}>
                <Pagination onClick={onPaginationClick} size="lg">
                    {items}
                </Pagination>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
                Showing {(active - 1) * 10 + 1} -{" "}
                {active * 10 < data.runList.length
                    ? active * 10
                    : data.runList.length}{" "}
                out of {data.runList.length} runs{" "}
                {totalCount !== data.runList.length &&
                    ` (${totalCount} without filter)`}
            </div>
        </div>
    );
};
