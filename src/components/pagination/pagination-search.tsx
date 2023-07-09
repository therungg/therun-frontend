import React, { useContext } from "react";
import { PaginationContext } from "~src/components/pagination/pagination.context";
import searchStyles from "~src/components/css/Search.module.scss";
import styles from "~src/components/css/Games.module.scss";

export const PaginationSearch = () => {
    const { search, setSearch } = useContext(PaginationContext);

    const searchInputRef = React.useRef<HTMLInputElement>(null);

    return (
        <div>
            <div className={`${searchStyles.searchContainer} ${styles.filter}`}>
                <span
                    className={"material-symbols-outlined"}
                    onClick={() => {
                        if (document.activeElement !== searchInputRef.current) {
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
    );
};
