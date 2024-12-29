import { PlaytimeStats } from "~src/components/user/stats";

export interface Wrapped {
    user: string;
    "start#end": string;
    version: string;
    // -1 is error, 0 is processing, 1 is done
    status: -1 | 0 | 1;
    startedProcessingAt?: number;
    processedAt?: number;
    // Error is there when status === -1
    error?: string;
}

export type WrappedWithData = Wrapped & WrappedDataPoints;

interface WrappedDataPoints {
    // Check if the user has enough runs
    hasEnoughRuns: boolean;
    // Total playtime in milliseconds this year
    totalPlaytime: number;
    // Total started runs
    totalRuns: number;
    totalFinishedRuns: number;
    totalResets: number;
    // Total times the player has completed a split
    totalSplits: number;
    // How much time the player spent resetting on the first split
    timeResetFirstSplit: number;
    // How often the player reset on the first split
    countResetFirstSplit: number;
    // Longest streak this year of consecutive days of runs

    streak: {
        length: number;
        start: string;
        end: string;
    };

    // How often user played, see interface PlaytimeStats. Can be used like in the Activity tab
    playtimeData: PlaytimeStats;

    // For game images
    gamesData: {
        image: string;
        game: string;
        display: string;
    }[];

    // Use this to show info about a specific game/category.
    runData: {
        attemptCount: number;
        finishedAttemptCount: number;
        pb: number;
        // When they got the pb
        pbTime: string;
        sob: number;
        game: string;
        category: string;
        // Total time playing this game this year in ms. Can also get from playtimeData.
        totalRunTime: number;

        // Finished runs this year. Can use to show a graph of finished runs or something.
        // Or heatmap when runs are finished throughout the year.
        runs: {
            startedAt: string;
            finishedAt: string;
            time: number;
        }[];
    }[];

    // We can use this to show the PB's and Golds the user got. They're all grouped by game-category.
    pbsAndGolds: {
        game: string;
        category: string;
        // The pb before the year started. Use to show how much PB improved
        timeBefore: number;
        golds: {
            // Split name
            name: string;
            // What was the gold before the year started. Use to show how much gold improved
            goldBefore: number;
            golds: number[];
        }[];
        pbs: {
            // When they got the pb
            startedAt: string;
            endedAt: string;
            time: number;
        }[];
    }[];
}
