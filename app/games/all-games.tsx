"use client";
import React from "react";
import { Row } from "react-bootstrap";
import { Title } from "~src/components/title";
import { AllGamesContext } from "./all-games.context";
import { AllGamesFilter } from "./all-games-filter.component";
import { AllGamesCard } from "./all-games-card.component";
import { LoadMoreButton } from "./load-more-button.component";

export interface Game {
    game: string;
    sort: number;
    categories: Category[];
    display: string;
    image?: string;
}

interface Category {
    bestTimeUser: string;
    bestTime: string;
    category: string;
    totalRunTime: number;
    display: string;
    gameTime?: boolean;
    gameTimePb?: string | null;
    bestGameTimeUser?: string | null;
}

interface GamesProps {
    games: Game[];
}

// eslint-disable-next-line no-unused-vars
const sortFns: { [key: string]: (_gameA: Game, _gameB: Game) => number } = {
    "hours-asc": (a, b) => (a.sort > b.sort ? -1 : 1),
    "name-asc": (a, b) =>
        a.display.toLowerCase().localeCompare(b.display.toLowerCase()),
    "name-desc": (a, b) =>
        b.display.toLowerCase().localeCompare(a.display.toLowerCase()),
};

export const AllGames: React.FunctionComponent<GamesProps> = ({ games }) => {
    const [search, setSearch] = React.useState("");
    const [count, setCount] = React.useState(10);
    const [sort, setSort] = React.useState("hours-asc");
    const lowerSearch = search.toLowerCase();

    const sortedGames = [...games].sort(sortFns[sort]);
    const filteredGames = sortedGames.filter(
        (game: Game) =>
            game.display.toLowerCase().includes(lowerSearch) ||
            game.game.includes(lowerSearch) ||
            game.categories.some(
                (category) =>
                    category.display.toLowerCase().includes(lowerSearch) ||
                    category.category.includes(lowerSearch) ||
                    category.bestTimeUser.toLowerCase().includes(lowerSearch) ||
                    category.bestGameTimeUser
                        ?.toLowerCase()
                        .includes(lowerSearch)
            )
    );

    const sliced = filteredGames.slice(0, count);

    return (
        <AllGamesContext.Provider
            value={{ search, setSearch, sort, setSort, count, setCount }}
        >
            <div>
                <Title>Games</Title>
                <AllGamesFilter />
                <Row>
                    {sliced.map((game: Game) => (
                        <AllGamesCard key={game.display} game={game} />
                    ))}
                </Row>

                {count < games.length && <LoadMoreButton />}
            </div>
        </AllGamesContext.Provider>
    );
};
