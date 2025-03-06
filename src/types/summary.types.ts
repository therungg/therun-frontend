export interface UserSummary {
    user: string;
    type: UserSummaryType;
    "type#value": string;
    lastUpdate: number;
    totalRuns: number;
    totalFinishedRuns: number;
    totalPlaytime: number;
    finishedRuns: SummaryFinishedRun[];
    races: SummaryRace[];
}

export type UserSummaryType = "week" | "month";

export interface SummaryFinishedRun {
    game: string;
    category: string;
    time?: number;
    date: number;
    duration: number;
}

export interface SummaryRace {
    game: string;
    category: string;
    time: number;
    date: number;
    position: number;
    ratingPrevious: number;
    ratingNew: number;
}
