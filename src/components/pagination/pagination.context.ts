import React from "react";

interface PaginationContextProps {
    search: string;
    setSearch: (search: string) => void;
    currentPage: number;
    setCurrentPage: (currentPage: number) => void;
}

export const PaginationContext = React.createContext<PaginationContextProps>({
    search: "",
    setSearch: () => {},
    currentPage: 1,
    setCurrentPage: () => {},
});
