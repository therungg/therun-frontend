import { ReactNode } from "react";

export interface Split {
    name: string;
    best: string;
    time: string;
}

export interface Run {
    personalBestTime: string;
    attemptCount: number;
    run: string;
    uploadTime: Date;
    totalRunTime: string;
    user: string;
    personalBest: string;
    finishedAttemptCount: string;
    timeToSave: string;
    pbId?: number;
    lastSplitId: number;
    historyFilename: string;
    sumOfBests: string;
    game: string;
    sessions: RunSession[];
    hasGameTime: boolean;
    gameTimeData: GameTimeData | null;
    splitsFile?: string;
    highlighted?: boolean;
    vod?: string;
    description?: string;
    customUrl?: string;
    url: string;
    platform?: string;
    gameregion?: string;
    variables?: { [key: string]: string };
    emulator?: boolean;
    originalRun?: string;
}

export interface Variables {
    Variable: Variable[];
}

export interface Variable {
    "#text": string;
    name: string;
}

export interface GameTimeData {
    personalBest: string;
    personalBestTime: string;
    average: string;
    history: string;
    stdDev: string;
    timeToSave: string;
    sumOfBests: string;
    sessions: RunSession[];
}

export interface History {
    runs: RunHistory[];
    splits: SplitsHistory[];
    sessions: RunSession[];
}

export interface RunSession {
    startedAt: string;
    endedAt: string;
    finishedRuns: string[];
    runIds: SessionRuns;
    game?: string;
    gameTime?: boolean;
}

export interface SessionRuns {
    first: number;
    last: number;
}

export interface RunHistory {
    splits: SplitTime[];
    time: string;
    duration: string;
    startedAt: string;
    endedAt: string;
    [key: string]: unknown;
}

export interface SplitsHistory {
    total: SplitTimes;
    single: SplitTimes;
    name: string;
    icon: string;
    values: number[];
    valuesTotal: number[];
    id?: number;
    key?: number;
    completed?: number;
    timeSave?: number;
    bestDiff?: number;
    tenPercentDiff?: number;
    fiftyPercentDiff?: number;
    mergedSplits?: string[];
}

export interface SplitTimes {
    time: string;
    bestPossibleTime: string;
    bestAchievedTime: string;
    averageTime: string;
    stdDev: string;
    alternative: AlternativeSplit[];
}

interface AlternativeSplit {
    name: string;
    time: string;
}

export interface Attempt {
    time?: string;
    startedAt?: string;
    endedAt?: string;
    duration?: string;
}

export interface SplitTime {
    splitTime: string;
    totalTime: string;
}

export interface DefaultReactInput {
    children: ReactNode;
}
