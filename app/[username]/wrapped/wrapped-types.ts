import { PlaytimeStats } from "~src/components/user/stats";

export interface Wrapped {
    user: string;
    "start#end": string;
    version: string;
    status: 0 | 1;
    startedProcessingAt?: number;
    processedAt?: number;
}

export type WrappedWithData = Wrapped & WrappedDataPoints;

interface WrappedDataPoints {
    hasEnoughRuns: boolean;
    totalPlaytime: number;
    totalRuns: number;
    totalFinishedRuns: number;
    totalResets: number;
    totalSplits: number;
    timeResetFirstSplit: number;
    countResetFirstSplit: number;
    streak: {
        length: number;
        start: string;
        end: string;
    };
    playtimeData: PlaytimeStats;
    gamesData: {
        image: string;
        game: string;
        display: string;
    }[];
}
