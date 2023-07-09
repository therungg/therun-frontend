import { PaginatedData } from "~src/components/pagination/pagination.types";

export type PaginatedGameResult = PaginatedData<Game>;

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
