"use client";
import React from "react";
import searchStyles from "~src/components/css/Search.module.scss";
import styles from "~src/components/css/Games.module.scss";
import { AllGamesContext } from "./all-games.context";

export const AllGamesFilter = () => {
    const { search, setSearch, sort, setSort } =
        React.useContext(AllGamesContext);
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const sortSelectRef = React.useRef<HTMLSelectElement>(null);

    return (
        <>
            <div>
                <div
                    className={`${searchStyles.searchContainer} ${styles.filter}`}
                >
                    <span
                        className={"material-symbols-outlined"}
                        onClick={() => {
                            if (
                                document.activeElement !==
                                searchInputRef.current
                            ) {
                                searchInputRef.current?.focus();
                            }
                        }}
                    >
                        {" "}
                        search{" "}
                    </span>
                    <input
                        type="search"
                        className={`form-control ${searchStyles.search}`}
                        placeholder="Filter by game/category/user"
                        style={{ marginBottom: "0" }}
                        onChange={(e) => {
                            setSearch(e.target.value);
                        }}
                        ref={searchInputRef}
                        value={search}
                        id="gameSearch"
                    />
                </div>
            </div>
            <div>
                <div
                    className={`${searchStyles.searchContainer} ${styles.filter}`}
                >
                    <span
                        className={"material-symbols-outlined"}
                        onClick={() => {
                            if (
                                document.activeElement !== sortSelectRef.current
                            ) {
                                sortSelectRef.current?.focus();
                            }
                        }}
                    >
                        {" "}
                        sort{" "}
                    </span>
                    <select
                        className={`form-control ${searchStyles.select}`}
                        onChange={(e) => {
                            setSort(e.target.value);
                        }}
                        value={sort}
                        id="sort"
                        ref={sortSelectRef}
                    >
                        <option id={"hours-asc"} value={"hours-asc"}>
                            Total playtime
                        </option>
                        <option id={"name-asc"} value={"name-asc"}>
                            Name (Ascending)
                        </option>
                        <option id={"name-desc"} value={"name-desc"}>
                            Name (Descending)
                        </option>
                    </select>
                </div>
            </div>
        </>
    );
};
