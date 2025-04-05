"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { Search as SearchIcon } from "react-bootstrap-icons";

export const EventSearch = () => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [searchInput, setSearchInput] = useState(
        searchParams.get("search") ?? "",
    );
    const [debouncedSearch] = useDebounceValue(searchInput, 300);

    useEffect(() => {
        if (debouncedSearch) {
            const params = new URLSearchParams(searchParams.toString());
            params.set("page", "1");

            if (debouncedSearch) {
                params.set("search", debouncedSearch);
            } else {
                params.delete("search");
            }
            router.push(`?${params.toString()}`);
        }
    }, [debouncedSearch]);

    return (
        <div className="input-group mw-search">
            <span
                className="input-group-text"
                onClick={() => {
                    const searchElement = document.getElementById("search");
                    if (document.activeElement !== searchElement) {
                        searchElement?.focus();
                    }
                }}
            >
                <SearchIcon size={18} />
            </span>
            <input
                type="search"
                className="form-control"
                placeholder="Search Event"
                onChange={(e) => {
                    setSearchInput(e.target.value);
                }}
                value={searchInput}
                id="search"
            />
        </div>
    );
};
