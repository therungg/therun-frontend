"use client";
import React, { useContext } from "react";
import { PaginationContext } from "~src/components/pagination/pagination.context";
import { Search as SearchIcon } from "react-bootstrap-icons";

export const useSearch = () => {
    const { search, setSearch } = useContext(PaginationContext);

    // const [search, setSearch] = useState("");

    const SearchComponent = () => {
        return <RenderSearch search={search} setSearch={setSearch} />;
    };

    return {
        search,
        SearchComponent,
    };
};

export const RenderSearch = () => {
    const { search, setSearch } = useContext(PaginationContext);

    return (
        <div>
            <div className="d-flex justify-content-start">
                <div className="mb-3 input-group">
                    <label className="input-group-text" htmlFor="race-search">
                        <SearchIcon size={18} />
                    </label>
                    <input
                        type="search"
                        className="form-control"
                        placeholder="Filter by game/category/user"
                        onChange={(e) => {
                            setSearch(e.target.value);
                        }}
                        value={search}
                        id="race-search"
                    />
                </div>
            </div>
        </div>
    );
};
