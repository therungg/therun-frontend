import React, { useContext } from "react";
import { PaginationContext } from "~src/components/pagination/pagination.context";
import { Search as SearchIcon } from "react-bootstrap-icons";

export const PaginationSearch = ({ text }: { text: string }) => {
    const { search, setSearch } = useContext(PaginationContext);

    return (
        <div className="input-group game-filter-mw">
            <label className="input-group-text" htmlFor="pagination-search">
                <SearchIcon size={18} />
            </label>
            <input
                type="search"
                className="form-control"
                placeholder={text}
                onChange={(e) => {
                    setSearch(e.target.value);
                }}
                value={search}
                id="pagination-search"
            />
        </div>
    );
};
