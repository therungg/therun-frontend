export type DeckKind = 'pre' | 'post';

export interface DossierRunner {
    username: string;
    picture?: string;
    country?: string;
    pronouns?: string;
}

export interface DossierGame {
    game: string; // raw key, e.g. "Hollow Knight"
    display: string; // display name from global game data
    category: string;
    image?: string; // IGDB image, 3:4 portrait
}

export interface DossierCore {
    pbMs: number | null;
    sobMs: number | null;
    attemptCount: number;
    finishedAttemptCount: number;
    finishRate: number; // 0..1
    categoryPlaytimeMs: number | null;
}

export interface DossierSplit {
    index: number;
    name: string;
    avgSingleMs: number | null;
    avgTotalMs: number | null; // cumulative avg clock at END of this split
    goldMs: number | null; // best-ever single (bestAchievedTime)
    pbSingleMs: number | null;
    pbTotalMs: number | null;
    stdDevMs: number | null;
    attemptsReached: number; // completions of this split (values.length)
    deaths: number; // attempts that died ON this split
    resetShare: number; // deaths / total deaths, 0..1
    completions: number[]; // single times, ms
}

export interface DossierFinishedRun {
    timeMs: number;
    endedAt: string; // ISO
}

export interface DossierCommunitySegment {
    index: number;
    name: string;
    userAvgMs: number | null;
    percentile: number | null; // user is in the top N% (lower = better)
}

export interface DossierCommunity {
    userCount: number;
    segments: DossierCommunitySegment[];
}

export interface DossierLeaderboards {
    pbPlacing: number | null;
    entrants: number | null;
}

export interface DossierForm {
    last14dPlaytimeMs: number | null;
    last14dActiveDays: number | null;
    currentStreakDays: number | null;
}

export interface PostRunSplit {
    index: number;
    name: string;
    singleMs: number | null;
    totalMs: number | null;
    isGold: boolean;
    goldSaveMs: number | null; // vs previous gold, positive = saved
    deltaVsAvgMs: number | null; // negative = faster than average
}

export interface PostRunEvent {
    type: string;
    name: string;
    description: string;
}

export interface PostRun {
    source: 'capture' | 'live' | 'history';
    finalTimeMs: number;
    endedAt: string | null;
    splits: PostRunSplit[];
    goldCount: number;
    events: PostRunEvent[];
}

export interface SourceStatus {
    name: string;
    ok: boolean;
    error?: string;
}

export interface RunnerDossier {
    deck: DeckKind;
    generatedAt: string;
    runner: DossierRunner;
    game: DossierGame;
    core: DossierCore;
    splits: DossierSplit[];
    finishedRuns: DossierFinishedRun[];
    community: DossierCommunity | null;
    leaderboards: DossierLeaderboards | null;
    form: DossierForm | null;
    postRun: PostRun | null;
    sources: SourceStatus[];
}
