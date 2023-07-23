import React, { useContext } from "react";
import { PaginationContext } from "~src/components/pagination/pagination.context";
import { Search as SearchIcon } from "react-bootstrap-icons";

export const PaginationSearch = ({ text }: { text: string }) => {
    const { search, setSearch } = useContext(PaginationContext);

    const searchInputRef = React.useRef<HTMLInputElement>(null);

    return (
        <div className="input-group mb-3">
            <span
                className="input-group-text"
                onClick={() => {
                    if (document.activeElement !== searchInputRef.current) {
                        searchInputRef.current?.focus();
                    }
                }}
            >
                <SearchIcon size={18} />
            </span>
            <input
                type="search"
                className="form-control"
                placeholder={text}
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
