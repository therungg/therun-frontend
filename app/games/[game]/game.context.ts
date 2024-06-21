import React from "react";
import { CategoryLeaderboard } from "./game.types";

interface GameContextProps {
    category: string;
    categories: CategoryLeaderboard[];
    setCategory: (category: string) => void;
}

export const GameContext = React.createContext<GameContextProps>({
    category: "",
    categories: [],
    setCategory: () => {},
});
