import { Run } from "~src/common/types";
import { MarathonEvent } from "~src/components/marathon/send-marathon-data-button";

export interface LiveRun {
    user: string;
    currentSplitIndex: number;
    currentSplitName: string;
    currentTime: number;
    currentComparison?: string;
    game: string;
    category: string;
    startedAt?: string;
    endedAt?: string;
    insertedAt: number;
    emulator: boolean;
    gameTime: boolean;
    hasReset: boolean;
    region: string;
    platform: string;
    variables: Variables;
    splits: Split[];
    importance: number;
    pb: number;
    bestPossible: number;
    sob: number;
    delta: number;
    picture?: string;
    gameImage?: string;
    currentlyStreaming?: boolean;
    url: string;
    gameData?: Run;
    currentPrediction?: string;
    events: MarathonEvent[];
    isMinified?: boolean;
}

interface Variables {
    [key: string]: string;
}

interface Comparisons {
    [key: string]: number;
}

interface SplitDefault {
    attemptsFinished: number;
    attemptsStarted: number;
    average: number;
    consistency: number;
    deltaToPredicted?: number | null;
    predictedSingleTime: number | null;
    predictedTotalTime: number | null;
    recentCompletionsSingle: number[];
    recentCompletionsTotal: number[];
    single: any;
    total: any;
    name: string;
    pbSplitTime?: number;
    bestPossible?: number;
    splitTime?: number;
    comparisons: Comparisons;
}

type Split = Comparisons & SplitDefault;
export type LiveDataMap = {
    [user: string]: LiveRun;
};

export interface LiveProps {
    liveDataMap: LiveDataMap;
    username?: string;
    showTitle?: boolean;
    forceGame?: any;
    forceCategory?: any;
}

export interface WebsocketLiveRunMessage {
    type: "UPDATE" | "DELETE";
    user: string;
    run: LiveRun;
    time?: string;
}
