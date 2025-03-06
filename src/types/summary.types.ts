export interface UserSummary {
    user: string;
    type: UserSummaryType;
    // start date of the week of this summary when type === 'week', always monday (2025-03-03)
    // start date of the month of this summary when type === 'month', always first of month (2025-03-01)
    value: string;
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
