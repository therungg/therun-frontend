import { PlaytimeStats } from "~src/components/user/stats";
import { DetailedUserStats } from "~app/(old-layout)/races/races.types";

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
    year: number;
}

export type WrappedWithData = Wrapped & WrappedDataPoints;

interface WrappedDataPoints {
    // Check if the user has enough runs
    hasEnoughRuns: boolean;
    // Total playtime in hours (!!!) this year
    totalPlaytime: number;
    // Total started runs
    totalRuns: number;
    totalFinishedRuns: number;
    totalResets: number;
    totalGames: number;
    totalCategories: number;
    // Total times the player has completed a split
    totalSplits: number;
    totalGolds: number;
    totalPbs: number;
    // List of games that the user had not run before
    newGames: string[];
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
        totalRunTime: string;

        // Finished runs this year. Can use to show a graph of finished runs or something.
        // Or heatmap when runs are finished throughout the year.
        runs: {
            startedAt: string;
            endedAt: string;
            time: string;
        }[];
    }[];

    // We can use this to show the PBs and Golds the user got. They're all grouped by game-category.
    pbsAndGolds: {
        game: string;
        category: string;
        // The pb before the year started. Use to show how much PB improved
        timeBefore: number;
        totalGolds: number;
        pbs: {
            // When they got the pb
            startedAt: number;
            endedAt: number;
            time: number;
        }[];
    }[];

    // This has a BUNCH of stats about the user's races.
    // The key `globalStats` has aggregate stats, and `categoryStats` has is per category that the user runs.
    // Check out the users race profile for what it feeds right now for inspiration
    raceData: DetailedUserStats;
}
