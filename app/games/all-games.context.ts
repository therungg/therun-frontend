import React from "react";

interface AllGamesContextProps {
    search: string;

    setSearch: (search: string) => void;
    sort: string;

    setSort: (sort: string) => void;
    count: number;

    setCount: (count: number) => void;
}

export const AllGamesContext = React.createContext<AllGamesContextProps>({
    search: "",
    setSearch: () => {},
    sort: "",
    setSort: () => {},
    count: 0,
    setCount: () => {},
});
