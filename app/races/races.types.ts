import { PaginatedData } from "~src/components/pagination/pagination.types";

export type RaceStatus =
    | "pending"
    | "starting"
    | "progress"
    | "finished"
    | "aborted";
export type RaceParticipantStatus =
    | "joined"
    | "ready"
    | "started"
    | "finished"
    | "confirmed"
    | "abandoned"
    | "unjoined";

export interface Race {
    raceId: string;
    creator: string;
    createdAt: string;
    game: string;
    displayGame: string;
    category: string;
    displayCategory: string;
    gameImage: string;
    description: string;
    canStartEarly: boolean;
    status: RaceStatus;
    customRules: RaceRule[];
    customName: string;
    visible: boolean;
    // Not available in paginated races due to too much data
    participants?: RaceParticipantWithLiveData[];
    // Only available in paginated races because pending races have no results yet
    results: RaceResult[] | null;
    participantCount: number;
    readyParticipantCount: number;
    finishedParticipantCount: number;
    startTime: string | null;
    endTime: string | null;
    firstFinishedParticipantTime: number | null;
    isTestRace: boolean;
    increment?: number;
    gameIncrement?: number;
    isFeatured: boolean;
    nextRaceId?: string;
    previousRaceId?: string;
    forceStream?: string;
    requiresPassword?: boolean;
    ranked: boolean;
    autoConfirm: boolean;
}

export interface RaceResult {
    position: number;
    name: string;
    status: RaceParticipantStatus;
    finalTime: number | null;
}

export type RaceParticipant = {
    raceId: string;
    user: string;
    status: RaceParticipantStatus;
    pb: string;
    finalTime: number | null;
    joinedAtDate: string | null;
    readyAtDate: string | null;
    finishedAtDate: string | null;
    confirmedAtDate: string | null;
    abandondedAtDate: string | null;
    ratingBefore: number;
    ratingAfter: number | null;
    comment?: string | null;
};

export interface RaceParticipantWithLiveData extends RaceParticipant {
    liveData?: RaceLiveData;
}

export interface RaceLiveData {
    // How far along is a runner if you look at the split amount (useful when theres no pb yet, to at least have an indication)
    runPercentageSplits: number;
    // How far along is a runner compared to pb (best way to see how far someone is). Can be null if runner has no pb yet
    runPercentageTime: number | null;
    currentSplitIndex: number;
    totalSplits: number;
    currentTime: number;
    gameTime: boolean;
    // Important: with this info we can know how far into a split the runner is. Useful to infer percentage in between splits.
    startedAt: number;
    currentSplitName: string;
    // Not very stable, but can use it
    currentPrediction: number | null;
    streaming: boolean;
    // +- to pb currently
    delta: number;
    runFinished: boolean;
    bestPossibleTime: number | null;
    timeToNextSplit?: number;
}

// TODO:: determine which rules are possible
export interface RaceRule {}

export interface CreateRaceInput {
    game: string;
    category: string;
    description?: string;
    selfJoin?: boolean;
    canStartEarly?: boolean;
    customName?: string;
    previousRaceId?: string;
    password?: string;
    forceStream?: string;
    ranked?: boolean;
    autoConfirm?: boolean;
}

export type WebsocketRaceMessageType = "raceUpdate" | "participantUpdate";

export interface WebsocketRaceMessage<T extends Race | RaceParticipant> {
    type: WebsocketRaceMessageType;
    data: T;
}

export type PaginatedRaces = PaginatedData<Race>;

export type RaceStatType =
    | "global"
    | "game"
    | "game#category"
    | "user"
    | "game#user"
    | "game#category#user";

export interface Stats {
    type: RaceStatType;
    value: string;
    totalRaces: number;
    finishPercentage: number;
    totalRaceTime: number;
    averageRaceTime: number;
}

export interface GlobalStats extends Stats {
    type: "global";
    value: "global";
    totalParticipations: number;
    totalFinishedParticipations: number;
}

export interface SpecificStats extends Stats {
    displayValue: string;
}

export interface GameStats extends SpecificStats {
    type: "game" | "game#category";
    image: string;
    totalParticipations: number;
    totalFinishedParticipations: number;
}

export interface UserStats extends SpecificStats {
    totalFinishedRaces: number;
}
