import { PaginatedData } from '~src/components/pagination/pagination.types';
import type { RunParticipant } from '../../../types/leaderboards.types';

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
    /** Everyone the RTA record credits. Absent on a solo record, never `[]`
     * (see docs/frontend-guide-co-op-runs.md §9). Two separate fields because
     * the two records are usually two different runs, often two different
     * teams. */
    bestTimeParticipants?: RunParticipant[];
    category: string;
    totalRunTime: number;
    display: string;
    gameTime?: boolean;
    gameTimePb?: string | null;
    bestGameTimeUser?: string | null;
    /** Everyone the game-time record credits. Same rules as
     * `bestTimeParticipants`. */
    bestGameTimeParticipants?: RunParticipant[];
}
