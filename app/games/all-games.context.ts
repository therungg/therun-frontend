import React from "react";

interface AllGamesContextProps {
    search: string;
    // eslint-disable-next-line no-unused-vars
    setSearch: (search: string) => void;
    sort: string;
    // eslint-disable-next-line no-unused-vars
    setSort: (sort: string) => void;
    count: number;
    // eslint-disable-next-line no-unused-vars
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
