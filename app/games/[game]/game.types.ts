interface GameData {
    alias: string;
    active: boolean;
    image: string;
    display: string;
    game: string;
    "category#username": string;
}

interface UserData {
    [User: string]: string;
}

export interface StatsData {
    global?: GameData & { forceRealTime?: boolean };
    data: {
        game: GameData;
        category?: GameData;
    };
    stats: Stats;
    statsGameTime?: Stats;
}

export interface Stats {
    gameLeaderboard: GameLeaderboard;
    categoryLeaderboards: CategoryLeaderboard[];
    userData: UserData;
}

export interface GameLeaderboard {
    uploadLeaderboard: Count[];
    attemptCountLeaderboard: Count[];
    finishedAttemptCountLeaderboard: Count[];
    totalRunTimeLeaderboard: Count[];
    recentRuns: TimeAndAchievedAt[];
    completePercentageLeaderboard: Count[];
    stats: CumulativeGameStat;
}

export interface CategoryLeaderboard extends GameLeaderboard {
    pbLeaderboard: Count[];
    sumOfBestsLeaderboard: Count[];
    consistencyScoreLeaderboard: Count[];
    categoryName: string;
    categoryNameDisplay: string;
    gameTime?: CategoryLeaderboard;
}

export interface CumulativeGameStat {
    uploadCount: number;
    attemptCount: number;
    finishedAttemptCount: number;
    totalRunTime: number;
    completePercentage: number;
    username?: string;
}

export interface Count {
    username: string;
    stat: number | string;
    meta?: any;
    game?: string;
    category?: string;
    url?: string;
}

interface TimeAndAchievedAt {
    time: string;
    achievedAt: string;
    username: string;
    category: string;
}
