/** Mirrors therun/src/api/games/top-boards.ts. Hand-kept: the repos share no
 *  types, so a change there needs a matching edit here. */
export interface TopBoard {
    categoryId: number;
    display: string;
    timeMs: number;
    username: string;
}

export interface TopBoardsEntry {
    seriesId: number | null;
    boards: TopBoard[];
}

export type TopBoardsResult = Record<string, TopBoardsEntry>;

/** One rendered row on /leaderboards. */
export interface LeaderboardRow {
    gameId: number;
    /** URL segment for the game (games.name form). */
    game: string;
    display: string;
    image?: string;
    uniqueRunners: number;
    boards: TopBoard[];
}
