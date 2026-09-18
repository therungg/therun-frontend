import { PaginatedData } from '~src/components/pagination/pagination.types';

export type PaginatedGameResult = PaginatedData<Game>;

export type GameSort = 'trending' | 'runners' | 'pbs' | 'playtime';

export interface Game {
    id: number;
    gameId: number;
    game: string;
    sort: number;
    categories: Category[];
    display: string;
    image?: string;
    index?: number;
    runs30d?: number;
    runners30d?: number;
    uniqueRunners?: number;
    totalPbs?: number;
    totalAttemptCount?: number;
}

export interface Category {
    bestTimeUser: string;
    bestTime: string;
    category: string;
    totalRunTime: number;
    display: string;
    gameTime?: boolean;
    gameTimePb?: string | null;
    bestGameTimeUser?: string | null;
}
