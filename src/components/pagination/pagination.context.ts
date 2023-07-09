import React from "react";

interface PaginationContextProps {
    search: string;
    // eslint-disable-next-line no-unused-vars
    setSearch: (search: string) => void;
    currentPage: number;
    // eslint-disable-next-line no-unused-vars
    setCurrentPage: (currentPage: number) => void;
}

export const PaginationContext = React.createContext<PaginationContextProps>({
    search: "",
    setSearch: () => {},
    currentPage: 1,
    setCurrentPage: () => {},
});
