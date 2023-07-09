import React, { useState } from "react";
import { PaginationContext } from "~src/components/pagination/pagination.context";

export const PaginationContextProvider = ({ children }) => {
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    return (
        <PaginationContext.Provider
            value={{ search, setSearch, currentPage, setCurrentPage }}
        >
            {children}
        </PaginationContext.Provider>
    );
};
