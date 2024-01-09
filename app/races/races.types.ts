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
    startsAt?: string | null;
    game: string;
    category: string;
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
}

export type RaceParticipant = {
    raceId: string;
    user: string;
    status: RaceParticipantStatus;
    pb: string;
};

export interface RaceParticipantWithLiveData extends RaceParticipant {
    liveData?: RaceLiveData;
}

export interface RaceLiveData {
    runPercentageSplits: number;
    runPercentageTime: number;
    currentSplitIndex: number;
    totalSplits: number;
    currentTime: number;
    gameTime: boolean;
    startedAt: number;
    currentSplitName: string;
    currentPrediction: number;
    streaming: boolean;
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

export interface PaginatedRaces {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    items: Race[];
}

export interface ActiveRaces {
    inProgress: Race[];
    pending: Race[];
    starting: Race[];
}
