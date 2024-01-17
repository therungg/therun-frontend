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
    | "abandoned"
    | "unjoined";

export interface Race {
    raceId: string;
    creator: string;
    createdAt: string;
    startsAt: string | null;
    game: string;
    displayGame: string;
    category: string;
    displayCategory: string;
    description: string;
    canStartEarly: boolean;
    status: RaceStatus;
    customRules: RaceRule[];
    customName: string;
    visible: boolean;
    // Only best 3 participants by pb
    topParticipants: RaceParticipant[];
    // Only available in race detail, gives full list
    participants?: RaceParticipantWithLiveData[];
    participantCount: number;
    readyParticipantCount: number;
    finishedParticipantCount: number;
    startTime: string | null;
    endTime: string | null;
    isTestRace: boolean;
    increment?: number;
    gameIncrement?: number;
    isFeatured: boolean;
    nextRaceId?: string;
    previousRaceId?: string;
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
};

export interface RaceParticipantWithLiveData extends RaceParticipant {
    liveData?: RaceLiveData;
}

export interface RaceLiveData {
    // How far along is a runner if you look at the split amount (useful when theres no pb yet, to at least have an indication)
    runPercentageSplits: number;
    // How far along is a runner compared to pb (best way to see how far someone is)
    runPercentageTime: number;
    currentSplitIndex: number;
    totalSplits: number;
    currentTime: number;
    gameTime: boolean;
    // Important: with this info we can know how far into a split the runner is. Useful to infer percentage in between splits.
    startedAt: number;
    currentSplitName: string;
    // Not very stable, but can use it
    currentPrediction: number;
    streaming: boolean;
    // +- to pb currently
    delta: number;
    runFinished: boolean;
    bestPossibleTime: number;
    timeToNextSplit?: number;
}

// TODO:: determine which rules are possible
export interface RaceRule {}

export interface CreateRaceInput {
    game: string;
    category: string;
    selfJoin?: boolean;
    canStartEarly?: boolean;
    customName?: string;
}

export type WebsocketRaceMessageType = "raceUpdate" | "participantUpdate";

export interface WebsocketRaceMessage<T extends Race | RaceParticipant> {
    type: WebsocketRaceMessageType;
    data: T;
}

export type PaginatedRaces = PaginatedData<Race>;
export interface ActiveRaces {
    inProgress: Race[];
    pending: Race[];
    starting: Race[];
}
