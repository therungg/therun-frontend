export type DashboardPeriod = '7d' | '30d' | 'year';

export interface DashboardStats {
    playtime: number;
    totalRuns: number;
    finishedRuns: number;
    totalPbs: number;
    pbsWithPrevious: number;
}

export interface DashboardStreak {
    current: number;
    periodLongest: number;
    periodLongestStart: string;
    periodLongestEnd: string;
    longest: number;
    longestStart: string;
    longestEnd: string;
}

export interface DashboardTopGame {
    gameId: number;
    gameDisplay: string;
    gameImage: string | null;
    totalPlaytime: number;
    totalAttempts: number;
    totalFinishedAttempts: number;
    totalPbs: number;
}

export interface DashboardAllTimeGame {
    gameDisplay: string;
    gameImage: string | null;
    totalRunTime: number;
}

export interface DashboardPb {
    game: string;
    category: string;
    gameImage: string | null;
    time: number;
    previousPb: number | null;
    endedAt: string;
}

export interface DashboardRace {
    game: string;
    category: string;
    gameImage?: string | null;
    position: number;
    ratingBefore: number;
    ratingAfter: number;
    date: number;
}

export interface DashboardHighlight {
    type: string;
    game?: string;
    category?: string;
    gameImage?: string;
    value?: number;
    secondaryValue?: number;
    label: string;
}

export interface DashboardStreakMilestone {
    type: 'near_record' | 'new_record' | 'at_risk';
    daysToRecord?: number;
    message: string;
}

export interface DashboardGlobalStats {
    totalRunTime: number;
    totalAttemptCount: number;
    totalFinishedAttemptCount: number;
    totalGames: number;
    totalCategories: number;
    totalRuns: number;
}

export interface DashboardResponse {
    period: DashboardPeriod;
    stats: DashboardStats;
    previousStats: DashboardStats;
    streak: DashboardStreak | null;
    streakMilestone: DashboardStreakMilestone | null;
    topGames: DashboardTopGame[];
    allTimeTopGames: DashboardAllTimeGame[];
    recentPbs: DashboardPb[];
    recentRaces: DashboardRace[];
    highlight: DashboardHighlight | null;
    highlights: DashboardHighlight[];
    globalStats: DashboardGlobalStats | null;
}
