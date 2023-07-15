import React, { useContext } from "react";
import { PaginationContext } from "~src/components/pagination/pagination.context";
import searchStyles from "~src/components/css/Search.module.scss";

export const PaginationSearch = ({ text }: { text: string }) => {
    const { search, setSearch } = useContext(PaginationContext);

    const searchInputRef = React.useRef<HTMLInputElement>(null);

    return (
        <div className="input-group mb-3">
            <span
                className="material-symbols-outlined input-group-text"
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
                placeholder={text}
                style={{ marginBottom: "0" }}
                onChange={(e) => {
                    setSearch(e.target.value);
                }}
                ref={searchInputRef}
                value={search}
                id="gameSearch"
            />
        </div>
    );
};
